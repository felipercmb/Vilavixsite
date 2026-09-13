import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migration = await readFile(new URL("../supabase/migrations/20260913020000_crm_read_performance.sql", import.meta.url), "utf8");
const ids = [1, 2, 3, 4].map((value) => `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`);

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('test.uid',true),'')::uuid$$;
    CREATE TABLE profiles(id uuid PRIMARY KEY,nome text,role text,ativo boolean);
    CREATE TABLE leads(id bigint PRIMARY KEY,corretor text,created_at timestamptz DEFAULT now(),origem text,notas text);
    CREATE TABLE tasks(id bigint PRIMARY KEY,corretor text,lead_id bigint REFERENCES leads,data date,hora time,titulo text);
    CREATE TABLE comments(id bigint PRIMARY KEY,lead_id bigint REFERENCES leads,texto text);
    CREATE TABLE rental_members(profile_id uuid PRIMARY KEY REFERENCES profiles,enabled boolean);
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$SELECT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin')$$;
    CREATE FUNCTION public.my_nome() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$SELECT nome FROM profiles WHERE id=auth.uid()$$;
    CREATE FUNCTION public.is_crm_member() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$SELECT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND ativo=true)$$;
    CREATE FUNCTION public.is_crm_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$SELECT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin' AND ativo=true)$$;
    CREATE FUNCTION public.has_rental_access() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$SELECT EXISTS(SELECT 1 FROM rental_members m JOIN profiles p ON p.id=m.profile_id WHERE m.profile_id=auth.uid() AND m.enabled AND p.ativo)$$;
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY; ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY; ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Profiles leitura CRM" ON profiles FOR SELECT TO authenticated USING(id=auth.uid() OR is_crm_member());
    CREATE POLICY "Profiles administracao" ON profiles FOR UPDATE TO authenticated USING(is_crm_admin()) WITH CHECK(is_crm_admin());
    CREATE POLICY crm_active_membership ON leads AS RESTRICTIVE FOR ALL TO authenticated USING(is_crm_member()) WITH CHECK(is_crm_member());
    CREATE POLICY crm_active_membership ON tasks AS RESTRICTIVE FOR ALL TO authenticated USING(is_crm_member()) WITH CHECK(is_crm_member());
    CREATE POLICY crm_active_membership ON comments AS RESTRICTIVE FOR ALL TO authenticated USING(is_crm_member()) WITH CHECK(is_crm_member());
    CREATE POLICY leads_select ON leads FOR SELECT TO authenticated USING(is_admin() OR corretor=my_nome());
    CREATE POLICY leads_update ON leads FOR UPDATE TO authenticated USING(is_admin() OR corretor=my_nome()) WITH CHECK(is_admin() OR corretor=my_nome());
    CREATE POLICY leads_insert ON leads FOR INSERT TO authenticated WITH CHECK(true);
    CREATE POLICY anon_site_lead ON leads FOR INSERT TO anon WITH CHECK(origem='Site');
    CREATE POLICY tasks_select ON tasks FOR SELECT TO authenticated USING(is_admin() OR corretor=my_nome() OR lead_id IN(SELECT id FROM leads WHERE corretor=my_nome()));
    CREATE POLICY tasks_update ON tasks FOR UPDATE TO authenticated USING(is_admin() OR corretor=my_nome() OR lead_id IN(SELECT id FROM leads WHERE corretor=my_nome())) WITH CHECK(is_admin() OR corretor=my_nome() OR lead_id IN(SELECT id FROM leads WHERE corretor=my_nome()));
    CREATE POLICY "Comments logado" ON comments FOR ALL TO authenticated USING(true);
    CREATE POLICY crm_comment_lead_scope ON comments AS RESTRICTIVE FOR ALL TO authenticated USING(is_crm_admin() OR EXISTS(SELECT 1 FROM leads WHERE leads.id=comments.lead_id)) WITH CHECK(is_crm_admin() OR EXISTS(SELECT 1 FROM leads WHERE leads.id=comments.lead_id));
    INSERT INTO profiles VALUES('${ids[0]}','Admin','admin',true),('${ids[1]}','Broker','corretor',true),('${ids[2]}','Other','corretor',true),('${ids[3]}','Inactive','admin',false);
    INSERT INTO rental_members VALUES('${ids[1]}',true),('${ids[3]}',true);
    INSERT INTO leads(id,corretor) VALUES(1,'Broker'),(2,'Other'),(3,'Inactive'),(4,NULL);
    INSERT INTO tasks(id,corretor,lead_id,data,hora,titulo) VALUES(1,'Broker',NULL,'2026-09-13','10:00','Own'),(2,'Other',1,'2026-09-13','10:00','Inherited'),(3,'Other',2,'2026-09-13','10:00','Other'),(4,NULL,NULL,'2026-09-13','10:00','Unassigned');
    INSERT INTO comments VALUES(1,1,'Own'),(2,2,'Other'),(3,NULL,'Unlinked');
    GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;
    GRANT SELECT,INSERT,UPDATE,DELETE ON profiles,leads,tasks,comments TO authenticated;
    GRANT INSERT ON leads TO anon; GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  `);
  const as = async (id, role = "authenticated") => {
    await db.exec("RESET ROLE");
    await db.query("SELECT set_config('test.uid',$1,false)", [id || ""]);
    await db.exec(`SET ROLE ${role}`);
  };
  return { db, as };
}

async function accessSnapshot(db, as) {
  const result = [];
  for (const id of ids) {
    await as(id);
    const row = {};
    for (const table of ["profiles", "leads", "tasks", "comments"])
      row[table] = (await db.query(`SELECT id FROM ${table} ORDER BY id`)).rows;
    row.rental = (await db.query("SELECT has_rental_access() AS allowed")).rows[0].allowed;
    result.push(row);
  }
  await as(null, "service_role");
  result.push({ serviceCount: (await db.query("SELECT count(*)::int AS count FROM leads")).rows[0].count });
  await as(null, "anon");
  await assert.rejects(db.query("SELECT * FROM leads"), (error) => error.code === "42501");
  await db.exec("RESET ROLE");
  return result;
}

test("initplans preservam visibilidade, tipos de políticas, escrita restrita e autorização de aluguel", async () => {
  const { db, as } = await fixture();
  try {
    const before = await accessSnapshot(db, as);
    assert.deepEqual(before[1].leads, [{ id: 1 }]);
    assert.deepEqual(before[1].tasks, [{ id: 1 }, { id: 2 }]);
    assert.deepEqual(before[1].comments, [{ id: 1 }]);
    assert.equal(before[0].rental, false); assert.equal(before[1].rental, true); assert.equal(before[3].rental, false);
    const kinds = (await db.query("SELECT tablename,policyname,permissive,roles,cmd FROM pg_policies ORDER BY tablename,policyname")).rows;
    const untouched = (await db.query("SELECT policyname,qual,with_check FROM pg_policies WHERE policyname IN ('leads_update','leads_insert','anon_site_lead','tasks_update','Profiles administracao') ORDER BY policyname")).rows;
    await db.exec(migration); await db.exec(migration);
    assert.deepEqual(await accessSnapshot(db, as), before);
    assert.deepEqual((await db.query("SELECT tablename,policyname,permissive,roles,cmd FROM pg_policies ORDER BY tablename,policyname")).rows, kinds);
    assert.deepEqual((await db.query("SELECT policyname,qual,with_check FROM pg_policies WHERE policyname IN ('leads_update','leads_insert','anon_site_lead','tasks_update','Profiles administracao') ORDER BY policyname")).rows, untouched);
    await as(ids[1]);
    assert.equal((await db.query("UPDATE leads SET notas='permitted' WHERE id=1 RETURNING id")).rows.length, 1);
    assert.equal((await db.query("UPDATE leads SET notas='denied' WHERE id=2 RETURNING id")).rows.length, 0);
    await assert.rejects(db.query("UPDATE leads SET corretor='Other' WHERE id=1"), (error) => error.code === "42501");
    await assert.rejects(db.query("INSERT INTO comments VALUES(9,2,'denied')"), (error) => error.code === "42501");
    await as(ids[3]);
    await assert.rejects(db.query("INSERT INTO leads(id,origem) VALUES(9,'Site')"), (error) => error.code === "42501");
    await as(null, "anon");
    await db.query("INSERT INTO leads(id,origem) VALUES(10,'Site')");
    await assert.rejects(db.query("INSERT INTO leads(id,origem) VALUES(11,'Meta')"), (error) => error.code === "42501");
  } finally { await db.close(); }
});

test("plano de tarefas avalia helpers por initplan e usa índice da ordenação paginada", async () => {
  const { db, as } = await fixture();
  try {
    await db.exec("INSERT INTO tasks(id,corretor,data,hora,titulo) SELECT n,'Broker','2026-09-13','10:00','Fixture' FROM generate_series(5,18026) n; ANALYZE tasks;");
    await as(ids[0]);
    const before = (await db.query("EXPLAIN (ANALYZE,FORMAT JSON) SELECT * FROM tasks ORDER BY data,hora,id LIMIT 1000")).rows[0]["QUERY PLAN"][0];
    const beforeCount = (await db.query("EXPLAIN (ANALYZE,FORMAT JSON) SELECT count(*) FROM tasks")).rows[0]["QUERY PLAN"][0];
    await db.exec("RESET ROLE"); await db.exec(migration); await as(ids[0]);
    const after = (await db.query("EXPLAIN (ANALYZE,FORMAT JSON) SELECT * FROM tasks ORDER BY data,hora,id LIMIT 1000")).rows[0]["QUERY PLAN"][0];
    const afterCount = (await db.query("EXPLAIN (ANALYZE,FORMAT JSON) SELECT count(*) FROM tasks")).rows[0]["QUERY PLAN"][0];
    const nodes = (node) => [node, ...(node.Plans || []).flatMap(nodes)];
    assert.equal(nodes(before.Plan).some((node) => node["Node Type"] === "Sort"), true);
    assert.equal(nodes(after.Plan).some((node) => node["Index Name"] === "crm_tasks_read_order_idx"), true);
    const initplans = nodes(after.Plan).filter((node) => node["Parent Relationship"] === "InitPlan");
    assert.ok(initplans.length >= 3);
    for (const plan of initplans) assert.ok(plan["Actual Loops"] <= 1);
    const countInitplans = nodes(afterCount.Plan).filter((node) => node["Parent Relationship"] === "InitPlan");
    assert.ok(countInitplans.length >= 3);
    for (const plan of countInitplans) assert.ok(plan["Actual Loops"] <= 1);
    assert.equal(after.Plan["Actual Rows"], 1000);
    console.log(JSON.stringify({ fixture: "18026 tasks, authenticated admin", beforeMs: before["Execution Time"], afterMs: after["Execution Time"], countBeforeMs: beforeCount["Execution Time"], countAfterMs: afterCount["Execution Time"], initplans: initplans.length }));
  } finally { await db.close(); }
});
