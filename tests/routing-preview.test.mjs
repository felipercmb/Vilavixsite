import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const admin = "00000000-0000-0000-0000-000000000001";
const broker = "00000000-0000-0000-0000-000000000002";
async function setup() {
  const db = new PGlite();
  await db.exec(
    `CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('test.uid',true),'')::uuid$$;`,
  );
  await db.exec(
    (
      await readFile(new URL("../supabase_schema.sql", import.meta.url), "utf8")
    ).split("-- STORAGE BUCKET")[0],
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20260912181000_campaign_routing.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.query("INSERT INTO auth.users VALUES($1,$2,$3),($4,$5,$6)", [
    admin,
    "admin@local.test",
    '{"nome":"Admin"}',
    broker,
    "broker@local.test",
    '{"nome":"Broker"}',
  ]);
  await db.query("UPDATE profiles SET role='admin' WHERE id=$1", [admin]);
  await db.query("SELECT set_config('test.uid',$1,false)", [admin]);
  const campaigns = ["selected", "other", "historical"].map((id) => ({
    id,
    external_id: id,
    name: id,
    status: "ACTIVE",
    effective_status: "ACTIVE",
    ad_account_id: "act_1",
    synced_at: new Date().toISOString(),
  }));
  await db.query("SELECT sync_zernio_campaigns($1,$2)", [
    JSON.stringify(campaigns),
    "act_1",
  ]);
  for (const campaign of campaigns)
    await db.query("SELECT save_campaign_rules($1,$2,$3,true,$4)", [
      campaign.id,
      [admin, broker],
      "{}",
      1002,
    ]);
  return db;
}
const preview = async (db, id) =>
  (await db.query("SELECT preview_campaign_routing($1) AS preview", [id]))
    .rows[0].preview;

test("routing preview counts over 1000 assignments and agrees with the atomic route", async () => {
  const db = await setup();
  try {
    await db.exec(
      "INSERT INTO leads(id,nome) SELECT n,'Lead '||n FROM generate_series(1,2020) n;",
    );
    await db.query(
      `INSERT INTO lead_assignments(lead_id,campaign_id,broker_id,broker_name,assigned_at,reason)
      SELECT n,CASE WHEN n<=1005 THEN 'selected' ELSE 'other' END,
       CASE WHEN n<=1001 THEN $1::uuid ELSE $2::uuid END,'Fixture',
       date_trunc('day',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo','Fixture'
      FROM generate_series(1,2015) n`,
      [admin, broker],
    );
    const before = (
      await db.query("SELECT count(*)::int AS n FROM lead_assignments")
    ).rows[0].n;
    const result = await preview(db, "selected");
    assert.equal(result.reason, null);
    assert.equal(result.nextBroker.id, broker);
    const adminPreview = result.eligibleBrokers.find((b) => b.id === admin);
    assert.equal(adminPreview.assignedToday, 1001);
    assert.equal(adminPreview.assignedTotal, 1001);
    assert.equal(adminPreview.capacityRemaining, 1);
    assert.equal(
      result.eligibleBrokers.find((b) => b.id === broker).assignedToday,
      4,
      "other campaigns do not consume this quota",
    );
    assert.equal(
      (await db.query("SELECT count(*)::int AS n FROM lead_assignments"))
        .rows[0].n,
      before,
      "preview never assigns a lead",
    );
    const assigned = (
      await db.query("SELECT * FROM route_lead($1,$2)", [2016, "selected"])
    ).rows[0];
    assert.equal(assigned.broker_id, result.nextBroker.id);
    await db.query("SELECT save_campaign_rules($1,$2,$3,true,$4)", [
      "selected",
      [admin, broker],
      "{}",
      4,
    ]);
    assert.equal((await preview(db, "selected")).nextBroker, null);
    await assert.rejects(
      db.query("SELECT * FROM route_lead($1,$2)", [2017, "selected"]),
      /Nenhum corretor/,
    );
  } finally {
    await db.close();
  }
});

test("routing preview preserves historical tie-breaks, Sao Paulo boundary and admin authorization", async () => {
  const db = await setup();
  try {
    await db.exec(
      "INSERT INTO leads(id,nome) VALUES(1,'Older A'),(2,'Older B'),(3,'Next');",
    );
    await db.query(
      `INSERT INTO lead_assignments(lead_id,campaign_id,broker_id,broker_name,assigned_at,reason)
      VALUES(1,'historical',$1,'Admin',(date_trunc('day',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')-interval '1 second','Fixture'),
      (2,'historical',$2,'Broker',(date_trunc('day',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')-interval '1 day','Fixture')`,
      [admin, broker],
    );
    const result = await preview(db, "historical");
    assert.deepEqual(
      result.eligibleBrokers.map((b) => b.assignedToday),
      [0, 0],
    );
    assert.equal(
      result.nextBroker.id,
      broker,
      "oldest previous assignment wins even with zero assignments today",
    );
    assert.equal(
      result.eligibleBrokers.find((b) => b.id === admin).assignedTotal,
      1,
    );
    assert.ok(
      result.eligibleBrokers.find((b) => b.id === admin).lastAssigned >
        result.nextBroker.lastAssigned,
    );
    assert.equal(
      (await db.query("SELECT * FROM route_lead($1,$2)", [3, "historical"]))
        .rows[0].broker_id,
      result.nextBroker.id,
    );
    await db.query("SELECT set_config('test.uid',$1,false)", [broker]);
    await db.exec(
      "GRANT USAGE ON SCHEMA public TO authenticated;SET ROLE authenticated",
    );
    await assert.rejects(preview(db, "historical"), /administradores/);
    await db.exec("RESET ROLE");
    assert.equal(
      (
        await db.query(
          "SELECT has_function_privilege('anon','public.preview_campaign_routing(text)','EXECUTE') AS allowed",
        )
      ).rows[0].allowed,
      false,
    );
  } finally {
    await db.close();
  }
});
