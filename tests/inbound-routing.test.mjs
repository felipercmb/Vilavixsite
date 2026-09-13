import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const brokerA = "10000000-0000-0000-0000-000000000001";
const brokerB = "10000000-0000-0000-0000-000000000002";
const admin = "10000000-0000-0000-0000-000000000003";
const readMigration = (name) => readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");

test("inbound bridge preserves legacy until explicit configuration and routes configured campaigns before notification", async () => {
  const db = new PGlite();
  try {
    await db.exec("CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('test.uid',true),'')::uuid$$;CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('request.jwt.claim.role',true),'')$$;");
    await db.exec((await readFile(new URL("../supabase_schema.sql", import.meta.url), "utf8")).split("-- STORAGE BUCKET")[0]);
    await db.exec(await readMigration("20260912181000_campaign_routing.sql"));
    await db.exec(`
      ALTER TABLE leads ADD COLUMN external_id text, ADD COLUMN campanha text;
      CREATE UNIQUE INDEX leads_external_id_uniq ON leads(external_id) WHERE external_id IS NOT NULL;
      CREATE TABLE legacy_probe(lead_id bigint);
      CREATE TABLE zernio_inbound_log(leadgen_id text,campaign_id text,form_name text,created_at timestamptz DEFAULT now());
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
    assert.equal((await db.query("SELECT routing_configured FROM campaigns")).rows[0].routing_configured, false);
    await db.query("SELECT save_campaign_rules($1,$2,$3,true,2)", [campaign.id, [brokerA, brokerB], JSON.stringify({ [brokerA]: 2, [brokerB]: 1 })]);
    assert.equal((await db.query("SELECT routing_configured FROM campaigns")).rows[0].routing_configured, true);

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
    const unknown = await addLead("Unknown", { campanha: "Missing from Zernio" });
    assert.match(unknown.routing_reason, /não encontrada/);
    assert.equal(unknown.corretor, "Legacy broker", "unidentified campaigns preserve current routing during transition");
    assert.equal(unknown.routing_source, "legacy");
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
    assert.equal((await db.query("SELECT count(*)::int AS total FROM legacy_probe")).rows[0].total, 4, "unknown, invalid, ambiguous and site leads retain legacy routing; configured campaign blocks do not");

    const counts = async () => (await db.query("SELECT (SELECT count(*) FROM lead_assignments)::int AS assignments,(SELECT count(*) FROM notification_probe)::int AS notifications,(SELECT count(*) FROM comments)::int AS comments")).rows[0];
    const beforeDuplicate = await counts();
    await assert.rejects(addLead("Duplicate delivery", { externalId: "l:batch-1" }), /duplicate key/);
    assert.deepEqual(await counts(), beforeDuplicate, "the existing external ID uniqueness rolls back retries before notifications or audit");

    const firstRoute = (await db.query("SELECT * FROM route_lead($1,$2)", [paused.id, campaign.id])).rows[0];
    const beforeRetry = await counts();
    const retry = (await db.query("SELECT * FROM route_lead($1,$2)", [paused.id, campaign.id])).rows[0];
    assert.equal(firstRoute.id, retry.id);
    assert.deepEqual(await counts(), beforeRetry, "admin retries cannot duplicate assignment, comment, or notification");

    const transitional = { ...campaign, id: "meta-act_test-789", external_id: "789", name: "New campaign", status: "PAUSED", effective_status: "PAUSED" };
    await db.query("SELECT sync_zernio_campaigns($1,$2)", [JSON.stringify([campaign, transitional]), "act_test"]);
    const notConfigured = await addLead("Unconfigured paused", { campaignId: transitional.id });
    assert.equal(notConfigured.corretor, "Legacy broker");
    assert.equal(notConfigured.routing_source, "legacy");
    assert.equal(notConfigured.campaign_id, transitional.id);
    assert.match(notConfigured.routing_reason, /não configuradas/);
    await db.exec("UPDATE campaigns SET status='ACTIVE',effective_status='ACTIVE' WHERE external_id='789'");
    const unconfiguredPreview = (await db.query("SELECT preview_campaign_routing($1) AS value", [transitional.id])).rows[0].value;
    assert.equal(unconfiguredPreview.nextBroker, null);
    assert.match(unconfiguredPreview.reason, /distribuição atual/);
    const notConfiguredActive = await addLead("Unconfigured active", { campaignId: transitional.id });
    assert.equal(notConfiguredActive.corretor, "Legacy broker");
    await db.query("SELECT set_config('test.uid',$1,false)", [brokerA]);
    await assert.rejects(db.query("SELECT save_campaign_rules($1,$2,$3,true,NULL)", [transitional.id, [brokerA], JSON.stringify({ [brokerA]: 1 })]), /Somente administradores/);
    assert.equal((await db.query("SELECT routing_configured FROM campaigns WHERE id=$1", [transitional.id])).rows[0].routing_configured, false, "a broker cannot opt a campaign into new routing");
    await db.query("SELECT set_config('test.uid',$1,false)", [admin]);
    await db.query("SELECT save_campaign_rules($1,$2,$3,false,NULL)", [transitional.id, [brokerA], JSON.stringify({ [brokerA]: 1 })]);
    const deliberatelyDisabled = await addLead("Configured disabled", { campaignId: transitional.id });
    assert.equal(deliberatelyDisabled.corretor, null);
    assert.equal(deliberatelyDisabled.routing_status, "pending");
    assert.match(deliberatelyDisabled.routing_reason, /desativada/);
    await db.query("SELECT sync_zernio_campaigns($1,$2)", [JSON.stringify([campaign, { ...transitional, status: "ACTIVE", effective_status: "ACTIVE", routing_configured: false, routing_enabled: true }]), "act_test"]);
    assert.deepEqual((await db.query("SELECT routing_configured,routing_enabled FROM campaigns WHERE id=$1", [transitional.id])).rows[0], { routing_configured: true, routing_enabled: false }, "provider synchronization cannot undo deliberate configuration or re-enable a disabled rule");

    await db.query("INSERT INTO zernio_inbound_log(leadgen_id,campaign_id,form_name) VALUES('prior','123','Aluguel Formulario v1')");
    const formLead = await addLead("Form name identity", { campanha: "Aluguel Formulario v1" });
    assert.equal(formLead.campaign_id, campaign.id, "a unique recent observed form resolves the actual campaign ID");
    assert.equal(formLead.routing_status, "assigned");
    await db.query("INSERT INTO zernio_inbound_log(leadgen_id,campaign_id,form_name) VALUES('other','not-yet-synced','Aluguel Formulario v1')");
    const ambiguousForm = await addLead("Ambiguous form identity", { campanha: "Aluguel Formulario v1" });
    assert.equal(ambiguousForm.campaign_id, null, "ambiguity includes IDs absent from the catalog");
    assert.equal(ambiguousForm.corretor, "Legacy broker");
    assert.match(ambiguousForm.routing_reason, /campanhas diferentes/);
    const knownDelivery = await addLead("Known delivery identity", { campanha: "Aluguel Formulario v1", externalId: "l:prior" });
    assert.equal(knownDelivery.campaign_id, campaign.id, "the exact delivery ID wins over an ambiguous form history");
    await db.exec("UPDATE zernio_inbound_log SET created_at=now()-interval '31 days'");
    const staleForm = await addLead("Stale form history", { campanha: "Aluguel Formulario v1" });
    assert.equal(staleForm.corretor, "Legacy broker");
    assert.equal(staleForm.campaign_id, null, "stale form history does not guess a campaign");

    // Reproduce production ownership RLS: a broker can edit their own lead, so
    // the trigger must independently reject forged quota/accounting fields.
    const owned = await addLead("Owned lead without assignment audit", { corretor: "Broker A" });
    await db.exec(`
      GRANT USAGE ON SCHEMA auth TO authenticated,service_role;
      GRANT SELECT,UPDATE ON leads TO authenticated,service_role;
      GRANT SELECT ON profiles TO authenticated;
      ALTER ROLE service_role BYPASSRLS;
      DROP POLICY "Leads logado" ON leads;
      CREATE POLICY leads_select ON leads FOR SELECT TO authenticated
        USING(is_crm_admin() OR corretor=(SELECT nome FROM profiles WHERE id=auth.uid()));
      CREATE POLICY leads_update ON leads FOR UPDATE TO authenticated
        USING(is_crm_admin() OR corretor=(SELECT nome FROM profiles WHERE id=auth.uid()))
        WITH CHECK(is_crm_admin() OR corretor=(SELECT nome FROM profiles WHERE id=auth.uid()));
    `);
    const beforeForgery = (await db.query("SELECT * FROM campaign_routing_candidates($1)", [campaign.id])).rows;
    await db.query("SELECT set_config('test.uid',$1,false),set_config('request.jwt.claim.role','authenticated',false)", [brokerA]);
    await db.exec("SET ROLE authenticated");
    assert.equal((await db.query("UPDATE leads SET status='contato',notas='Retorno combinado' WHERE id=$1 RETURNING id", [owned.id])).rows.length, 1, "normal owned-lead work remains allowed");
    await assert.rejects(db.query("UPDATE leads SET campaign_id=$1,corretor_id=$2,routing_source='campaign',routing_status='assigned',routing_assigned_at=now() WHERE id=$3", [campaign.id, brokerB, owned.id]), /Somente administradores/, "a broker cannot create synthetic quota for another broker while retaining their own owner name");
    for (const [column, value] of [
      ["campaign_id", campaign.id], ["corretor_id", brokerB], ["corretor", "Broker B"],
      ["routing_source", "campaign"], ["routing_status", "assigned"],
      ["routing_reason", "forged"], ["routing_campaign_reference", "forged"],
      ["routing_assigned_at", new Date().toISOString()],
    ]) {
      await assert.rejects(db.query(`UPDATE leads SET ${column}=$1 WHERE id=$2`, [value, owned.id]), /Somente administradores/, `${column} cannot be forged on an owned lead`);
    }
    await db.exec("RESET ROLE");
    assert.deepEqual((await db.query("SELECT * FROM campaign_routing_candidates($1)", [campaign.id])).rows, beforeForgery, "failed forgeries leave quota and routing order unchanged");
    await db.query("SELECT set_config('test.uid',$1,false)", [admin]);
    await db.exec("SET ROLE authenticated");
    assert.equal((await db.query("UPDATE leads SET routing_reason='Approved correction' WHERE id=$1 RETURNING id", [owned.id])).rows.length, 1, "an authenticated active admin can correct routing fields");
    await db.exec("RESET ROLE");
    await db.query("SELECT set_config('test.uid','',false),set_config('request.jwt.claim.role','service_role',false)");
    await db.exec("SET ROLE service_role");
    assert.equal((await db.query("UPDATE leads SET routing_reason='Server correction' WHERE id=$1 RETURNING id", [owned.id])).rows.length, 1, "the trusted service role remains able to maintain routing fields");
    await db.exec("RESET ROLE");
    await db.query("SELECT set_config('request.jwt.claim.role','',false)");
    assert.equal((await db.query("UPDATE leads SET routing_reason='Operator correction' WHERE id=$1 RETURNING id", [owned.id])).rows.length, 1, "the postgres operator is allowed without JWT claims");
    assert.equal((await db.query("SELECT prosecdef FROM pg_proc WHERE oid='guard_lead_routing_update()'::regprocedure")).rows[0].prosecdef, false, "caller checks cannot run under the trigger owner's identity");
    const privileges = (await db.query("SELECT has_function_privilege('authenticated','campaign_routing_candidates(text)','EXECUTE') AS candidates,has_function_privilege('service_role','campaign_routing_candidates(text)','EXECUTE') AS service_candidates,has_function_privilege('authenticated','route_lead(bigint,text)','EXECUTE') AS route")).rows[0];
    assert.deepEqual(privileges, { candidates: false, service_candidates: false, route: true });
  } finally { await db.close(); }
});
