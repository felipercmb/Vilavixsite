import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const brokerA = "10000000-0000-0000-0000-000000000001";
const brokerB = "10000000-0000-0000-0000-000000000002";
const admin = "10000000-0000-0000-0000-000000000003";
const readMigration = (name) => readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");

test("inbound bridge preserves legacy and notification triggers, routes batches before notification and blocks unsafe campaign fallback", async () => {
  const db = new PGlite();
  try {
    await db.exec("CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('test.uid',true),'')::uuid$$;");
    await db.exec((await readFile(new URL("../supabase_schema.sql", import.meta.url), "utf8")).split("-- STORAGE BUCKET")[0]);
    await db.exec(await readMigration("20260912181000_campaign_routing.sql"));
    await db.exec(`
      ALTER TABLE leads ADD COLUMN external_id text, ADD COLUMN campanha text;
      CREATE UNIQUE INDEX leads_external_id_uniq ON leads(external_id) WHERE external_id IS NOT NULL;
      CREATE TABLE legacy_probe(lead_id bigint);
      CREATE TABLE notification_probe(lead_id bigint,broker_name text,audit_exists boolean,broker_notification boolean);
      CREATE FUNCTION assign_corretor_roleta() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN
        INSERT INTO legacy_probe VALUES(NEW.id); NEW.corretor:='Legacy broker'; RETURN NEW;
      END;$$;
      CREATE TRIGGER leads_roleta BEFORE INSERT ON leads FOR EACH ROW EXECUTE FUNCTION assign_corretor_roleta();
      -- This local probe records ordering only; it never makes a network request.
      CREATE FUNCTION notify_lead_whatsapp() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN
        INSERT INTO notification_probe VALUES(NEW.id,NEW.corretor,EXISTS(SELECT 1 FROM lead_assignments WHERE lead_id=NEW.id),NULLIF(btrim(NEW.corretor),'') IS NOT NULL); RETURN NEW;
      END;$$;
      CREATE TRIGGER leads_notify_whatsapp AFTER INSERT ON leads FOR EACH ROW EXECUTE FUNCTION notify_lead_whatsapp();
    `);
    const originalLegacy = (await db.query("SELECT pg_get_functiondef('assign_corretor_roleta()'::regprocedure) AS definition")).rows[0].definition;
    const originalNotification = (await db.query("SELECT pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgname='leads_notify_whatsapp'")).rows[0].definition;
    const bridge = await readMigration("20260912200000_inbound_campaign_bridge.sql");
    await db.exec(bridge);
    await db.exec(bridge);
    assert.equal((await db.query("SELECT pg_get_functiondef('assign_corretor_roleta()'::regprocedure) AS definition")).rows[0].definition, originalLegacy);
    assert.equal((await db.query("SELECT pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgname='leads_notify_whatsapp'")).rows[0].definition, originalNotification);
    await db.query("INSERT INTO auth.users VALUES($1,'a@local.test','{}'),($2,'b@local.test','{}'),($3,'admin@local.test','{}')", [brokerA, brokerB, admin]);
    await db.query("UPDATE profiles SET ativo=true,nome=CASE id WHEN $1 THEN 'Broker A' WHEN $2 THEN 'Broker B' ELSE 'Admin' END,role=CASE WHEN id=$3 THEN 'admin' ELSE 'corretor' END", [brokerA, brokerB, admin]);
    await db.query("SELECT set_config('test.uid',$1,false)", [admin]);
    const campaign = { id: "meta-act_test-123", external_id: "123", name: "Aluguel", ad_account_id: "act_test", status: "ACTIVE", effective_status: "ACTIVE", synced_at: new Date().toISOString() };
    await db.query("SELECT sync_zernio_campaigns($1,$2)", [JSON.stringify([campaign]), "act_test"]);
    await db.query("SELECT save_campaign_rules($1,$2,$3,true,2)", [campaign.id, [brokerA, brokerB], JSON.stringify({ [brokerA]: 2, [brokerB]: 1 })]);

    const bulk = (await db.query("INSERT INTO leads(nome,origem,campanha,external_id) SELECT 'Batch '||n,'Meta Ads','Aluguel','l:batch-'||n FROM generate_series(1,5) n RETURNING id,corretor,routing_status,campaign_id")).rows;
    assert.deepEqual(bulk.slice(0, 3).map((lead) => lead.corretor), ["Broker A", "Broker B", "Broker A"], "one SQL batch respects 2:1 weights before AFTER auditing");
    assert.deepEqual((await db.query("SELECT broker_name,count(*)::int AS total FROM lead_assignments GROUP BY broker_name ORDER BY broker_name")).rows, [{ broker_name: "Broker A", total: 2 }, { broker_name: "Broker B", total: 2 }]);
    assert.equal(bulk[4].routing_status, "pending", "daily limits cannot be oversubscribed by a bulk insert");
    assert.equal(bulk[4].corretor, null);
    assert.equal((await db.query("SELECT count(*)::int AS total FROM legacy_probe")).rows[0].total, 0);
    assert.equal((await db.query("SELECT count(*)::int AS total FROM notification_probe WHERE broker_notification AND audit_exists")).rows[0].total, 4, "notification sees both the final owner and its committed-to-statement audit");
    assert.equal((await db.query("SELECT count(*)::int AS total FROM notification_probe WHERE NOT broker_notification")).rows[0].total, 1, "unassigned lead still reaches the preserved company notification");

    const addLead = async (name, fields = {}) => (await db.query("INSERT INTO leads(nome,origem,campanha,campaign_id,corretor,external_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *", [name, fields.origem || "Meta Ads", fields.campanha ?? "Aluguel", fields.campaignId ?? null, fields.corretor ?? null, fields.externalId ?? `l:${name}`])).rows[0];
    await db.exec("UPDATE campaigns SET status='PAUSED',effective_status='ACTIVE',daily_limit=NULL");
    const paused = await addLead("Paused");
    assert.equal(paused.corretor, null);
    assert.match(paused.routing_reason, /inativa/);
    await db.exec("UPDATE campaigns SET status='ACTIVE',synced_at=now()-interval '31 minutes'");
    assert.match((await addLead("Stale")).routing_reason, /sincronização recente/);
    await db.exec("UPDATE campaigns SET synced_at=now(),start_time=now()+interval '1 day'");
    assert.match((await addLead("Future")).routing_reason, /período ativo/);
    await db.exec("UPDATE campaigns SET start_time=NULL");
    assert.match((await addLead("Unknown", { campanha: "Missing from Zernio" })).routing_reason, /não encontrada/);
    const missingId = await addLead("Invalid external campaign", { campaignId: "not-in-campaign-table" });
    assert.equal(missingId.campaign_id, null, "unknown external identifiers remain captured for review instead of violating the FK");
    await db.exec("INSERT INTO campaigns(id,external_id,name,status,effective_status,source) VALUES('duplicate-name','456','Aluguel','ACTIVE','ACTIVE','meta')");
    assert.match((await addLead("Ambiguous")).routing_reason, /ambíguo/);
    const canonical = await addLead("Canonical", { campaignId: campaign.id, campanha: "Outdated name" });
    assert.equal(canonical.routing_status, "assigned");
    const byExternalId = await addLead("External campaign ID", { campaignId: "123" });
    assert.equal(byExternalId.campaign_id, campaign.id);
    await db.exec("DELETE FROM campaigns WHERE id='duplicate-name'");

    const legacy = await addLead("Site legacy", { origem: "Site", campanha: "" });
    assert.equal(legacy.corretor, "Legacy broker");
    assert.equal(legacy.routing_source, "legacy");
    const manual = await addLead("Manual owner", { corretor: "Manual broker" });
    assert.equal(manual.corretor, "Manual broker");
    assert.equal(manual.routing_source, "manual");
    assert.equal((await db.query("SELECT count(*)::int AS total FROM legacy_probe")).rows[0].total, 1, "Meta failures never leak into legacy fallback");

    const counts = async () => (await db.query("SELECT (SELECT count(*) FROM lead_assignments)::int AS assignments,(SELECT count(*) FROM notification_probe)::int AS notifications,(SELECT count(*) FROM comments)::int AS comments")).rows[0];
    const beforeDuplicate = await counts();
    await assert.rejects(addLead("Duplicate delivery", { externalId: "l:batch-1" }), /duplicate key/);
    assert.deepEqual(await counts(), beforeDuplicate, "the existing external ID uniqueness rolls back retries before notifications or audit");

    const firstRoute = (await db.query("SELECT * FROM route_lead($1,$2)", [paused.id, campaign.id])).rows[0];
    const beforeRetry = await counts();
    const retry = (await db.query("SELECT * FROM route_lead($1,$2)", [paused.id, campaign.id])).rows[0];
    assert.equal(firstRoute.id, retry.id);
    assert.deepEqual(await counts(), beforeRetry, "admin retries cannot duplicate assignment, comment, or notification");
    const privileges = (await db.query("SELECT has_function_privilege('authenticated','campaign_routing_candidates(text)','EXECUTE') AS candidates,has_function_privilege('service_role','campaign_routing_candidates(text)','EXECUTE') AS service_candidates,has_function_privilege('authenticated','route_lead(bigint,text)','EXECUTE') AS route")).rows[0];
    assert.deepEqual(privileges, { candidates: false, service_candidates: false, route: true });
  } finally { await db.close(); }
});
