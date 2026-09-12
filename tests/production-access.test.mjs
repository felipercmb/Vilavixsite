import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { dbToTask, taskToDb } from "../lib/mappers.js";

const admin = "00000000-0000-4000-8000-000000000001";
const broker = "00000000-0000-4000-8000-000000000002";
const other = "00000000-0000-4000-8000-000000000003";
const inactive = "00000000-0000-4000-8000-000000000004";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("production migration preserves broker ownership, anonymous inbound and legacy triggers", async () => {
  const db = new PGlite();
  const as = async (id, role = "authenticated") => {
    await db.exec("RESET ROLE");
    await db.query("SELECT set_config('test.uid',$1,false),set_config('test.role',$2,false)", [id || "", role]);
    await db.exec(`SET ROLE ${role}`);
  };
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('test.uid',true),'')::uuid$$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT current_setting('test.role',true)$$;
      CREATE SCHEMA storage;
      CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    `);
    await db.exec(await read("supabase_schema.sql"));
    await db.exec(await read("supabase_migration_automation.sql"));
    await db.exec(`
      ALTER TABLE profiles ADD COLUMN foto_url text;
      ALTER TABLE leads ADD COLUMN valor_venda numeric,ADD COLUMN external_id text,ADD COLUMN campanha text;
      ALTER TABLE tasks ADD COLUMN corretor text;
      CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$SELECT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin')$$;
      CREATE FUNCTION public.my_nome() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$SELECT nome FROM profiles WHERE id=auth.uid()$$;
      DROP POLICY "Leads logado" ON leads;
      CREATE POLICY anon_site_lead ON leads FOR INSERT TO anon WITH CHECK(origem='Site');
      CREATE POLICY leads_select ON leads FOR SELECT TO authenticated USING(is_admin() OR corretor=my_nome());
      CREATE POLICY leads_update ON leads FOR UPDATE TO authenticated USING(is_admin() OR corretor=my_nome()) WITH CHECK(is_admin() OR corretor=my_nome());
      CREATE POLICY leads_delete ON leads FOR DELETE TO authenticated USING(is_admin() OR corretor=my_nome());
      CREATE POLICY leads_insert ON leads FOR INSERT TO authenticated WITH CHECK(true);
      DROP POLICY "Tasks logado" ON tasks;
      CREATE POLICY tasks_select ON tasks FOR SELECT TO authenticated USING(is_admin() OR corretor=my_nome() OR lead_id IN(SELECT id FROM leads WHERE corretor=my_nome()));
      CREATE POLICY tasks_update ON tasks FOR UPDATE TO authenticated USING(is_admin() OR corretor=my_nome() OR lead_id IN(SELECT id FROM leads WHERE corretor=my_nome())) WITH CHECK(is_admin() OR corretor=my_nome() OR lead_id IN(SELECT id FROM leads WHERE corretor=my_nome()));
      CREATE POLICY tasks_delete ON tasks FOR DELETE TO authenticated USING(is_admin() OR corretor=my_nome() OR lead_id IN(SELECT id FROM leads WHERE corretor=my_nome()));
      CREATE POLICY tasks_insert ON tasks FOR INSERT TO authenticated WITH CHECK(is_admin() OR corretor=my_nome() OR lead_id IN(SELECT id FROM leads WHERE corretor=my_nome()));
      CREATE TABLE config(id int PRIMARY KEY,marker text);
      ALTER TABLE config ENABLE ROW LEVEL SECURITY;
      CREATE POLICY auth_read_config ON config FOR SELECT USING(auth.role()='authenticated');
      CREATE POLICY auth_write_config ON config FOR ALL USING(auth.role()='authenticated');
      CREATE POLICY service_config ON config FOR ALL TO service_role USING(true);
      CREATE TABLE roleta_regras(id int PRIMARY KEY,descricao text,agentes jsonb);
      ALTER TABLE roleta_regras ENABLE ROW LEVEL SECURITY;
      CREATE POLICY roleta_regras_admin ON roleta_regras FOR ALL TO authenticated USING(is_admin());
      CREATE TABLE wa_notify_log(lead_id bigint,marker text);
      ALTER TABLE wa_notify_log ENABLE ROW LEVEL SECURITY;
      CREATE POLICY wa_log_admin_read ON wa_notify_log FOR SELECT TO authenticated USING(is_admin());
      CREATE FUNCTION assign_corretor_roleta() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$BEGIN IF NEW.corretor IS NULL THEN NEW.corretor:='Other';END IF;RETURN NEW;END$$;
      CREATE FUNCTION notify_lead_whatsapp() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$BEGIN INSERT INTO wa_notify_log VALUES(NEW.id,'legacy notification');RETURN NEW;END$$;
      CREATE TRIGGER leads_roleta BEFORE INSERT ON leads FOR EACH ROW EXECUTE FUNCTION assign_corretor_roleta();
      CREATE TRIGGER leads_notify_whatsapp AFTER INSERT ON leads FOR EACH ROW EXECUTE FUNCTION notify_lead_whatsapp();
      INSERT INTO config VALUES(1,'preserve config');
      INSERT INTO roleta_regras VALUES(1,'preserve routing','["Other"]');
    `);
    for (const [id, nome, role, ativo] of [
      [admin, "Admin", "admin", true], [broker, "Broker", "corretor", true],
      [other, "Other", "corretor", true], [inactive, "Inactive", "admin", false],
    ]) {
      await db.query("INSERT INTO auth.users VALUES($1,$2,$3)", [id, `${nome.toLowerCase()}@example.test`, JSON.stringify({ nome, role })]);
      await db.query("UPDATE profiles SET ativo=$2,foto_url='preserve avatar' WHERE id=$1", [id, ativo]);
    }
    await db.exec(`
      INSERT INTO imoveis(titulo) VALUES('Public property');
      INSERT INTO leads(nome,corretor,valor_venda,external_id,campanha) VALUES('Own','Broker',12345,'legacy-1','Legacy campaign'),('Other lead','Other',NULL,NULL,NULL),('Disabled lead','Inactive',NULL,NULL,NULL);
      INSERT INTO tasks(titulo,corretor,lead_id) VALUES('Owned task','Broker',NULL),('Linked own lead','Other',1),('Other task','Other',2);
      INSERT INTO comments(lead_id,autor,texto) VALUES(1,'Broker','Existing comment');
      INSERT INTO comments(lead_id,autor,texto) VALUES(2,'Other','Other contact history');
      GRANT USAGE ON SCHEMA public,auth,storage TO authenticated,anon,service_role;
      GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
      GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated,anon,service_role;
      GRANT SELECT ON imoveis TO anon; GRANT INSERT ON leads TO anon;
      GRANT SELECT,INSERT,DELETE ON storage.objects TO authenticated;
      GRANT SELECT ON storage.objects TO anon;
    `);
    const originalTriggers = (await db.query("SELECT pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgrelid='public.leads'::regclass AND NOT tgisinternal ORDER BY tgname")).rows;
    const originalOwnership = (await db.query("SELECT policyname,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND (policyname LIKE 'leads_%' OR policyname LIKE 'tasks_%' OR policyname='anon_site_lead') ORDER BY policyname")).rows;

    await db.exec(await read("supabase/migrations/20260912180000_catalog.sql"));
    await db.exec(await read("supabase/migrations/20260912181000_campaign_routing.sql"));
    // Simulate the earlier broad-policy version having been applied on production.
    // The corrected access migration must remove those bypasses while retaining
    // all independently defined production ownership policies.
    await db.exec('CREATE POLICY "Leads logado" ON leads FOR ALL TO authenticated USING(true);CREATE POLICY "Tasks logado" ON tasks FOR ALL TO authenticated USING(true);');
    const access = await read("supabase/migrations/20260912182000_access.sql");
    await db.exec(access);
    await db.exec(access);
    await db.exec(await read("supabase/migrations/20260912190000_rental_management.sql"));
    assert.deepEqual((await db.query("SELECT pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgrelid='public.leads'::regclass AND NOT tgisinternal ORDER BY tgname")).rows, originalTriggers);
    assert.deepEqual((await db.query("SELECT policyname,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND (policyname LIKE 'leads_%' OR policyname LIKE 'tasks_%' OR policyname='anon_site_lead') ORDER BY policyname")).rows, originalOwnership);
    assert.deepEqual((await db.query("SELECT valor_venda::int,external_id,campanha FROM leads WHERE id=1")).rows[0], { valor_venda: 12345, external_id: "legacy-1", campanha: "Legacy campaign" });
    assert.equal((await db.query("SELECT descricao FROM roleta_regras")).rows[0].descricao, "preserve routing");
    assert.equal((await db.query("SELECT foto_url FROM profiles WHERE id=$1", [admin])).rows[0].foto_url, "preserve avatar");

    await as(broker);
    assert.deepEqual((await db.query("SELECT nome FROM leads ORDER BY id")).rows, [{ nome: "Own" }], "active broker only sees owned leads");
    assert.deepEqual((await db.query("SELECT titulo FROM tasks ORDER BY id")).rows, [{ titulo: "Owned task" }, { titulo: "Linked own lead" }]);
    assert.deepEqual((await db.query("SELECT texto FROM comments ORDER BY id")).rows, [{ texto: "Existing comment" }], "contact history follows lead ownership");
    await assert.rejects(db.query("INSERT INTO comments(lead_id,autor,texto) VALUES(2,'Broker','Unauthorized comment')"), /row-level security/);
    assert.equal((await db.query("UPDATE leads SET notas='attempt' WHERE id=2 RETURNING id")).rows.length, 0);
    assert.equal((await db.query("DELETE FROM leads WHERE id=2 RETURNING id")).rows.length, 0);
    await assert.rejects(db.query("UPDATE leads SET corretor='Other' WHERE id=1"), /row-level security/);
    await assert.rejects(db.query("INSERT INTO tasks(titulo,corretor,lead_id)VALUES('Unauthorized','Other',2)"), /row-level security/);
    const standalone = taskToDb({ titulo: "Atividade pessoal", corretor: "Broker" });
    const personalTask = (await db.query("INSERT INTO tasks(titulo,corretor,lead_id) VALUES($1,$2,$3) RETURNING *", [standalone.titulo, standalone.corretor, standalone.lead_id])).rows[0];
    const completedTask = taskToDb({ ...dbToTask(personalTask), concluida: true });
    assert.equal((await db.query("UPDATE tasks SET corretor=$1,concluida=$2 WHERE id=$3 RETURNING id", [completedTask.corretor, completedTask.concluida, personalTask.id])).rows.length, 1, "standalone broker task retains ownership when edited");
    await db.query("DELETE FROM tasks WHERE id=$1", [personalTask.id]);
    assert.equal((await db.query("UPDATE profiles SET role='admin' WHERE id=$1 RETURNING id", [broker])).rows.length, 0, "profile self-promotion stays blocked");
    assert.equal((await db.query("SELECT count(*)::int AS n FROM roleta_regras")).rows[0].n, 0);
    assert.equal((await db.query("UPDATE leads SET notas='confirmed' WHERE id=1 RETURNING id")).rows.length, 1);

    await as(inactive);
    for (const table of ["leads", "tasks", "comments", "imoveis", "config", "roleta_regras", "wa_notify_log", "campaigns", "lead_assignments"])
      assert.equal((await db.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n, 0, `inactive admin cannot read ${table}`);
    await assert.rejects(db.query("INSERT INTO leads(nome,origem)VALUES('Attempt','Site')"), /row-level security/);
    await assert.rejects(db.query("INSERT INTO config VALUES(2,'attempt')"), /row-level security/);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM profiles")).rows[0].n, 1, "inactive user can load only their own profile for login status");

    await as(null, "anon");
    assert.equal((await db.query("SELECT count(*)::int AS n FROM imoveis")).rows[0].n, 1);
    await db.query("INSERT INTO leads(nome,origem)VALUES('Public inbound','Site')");
    await assert.rejects(db.query("INSERT INTO leads(nome,origem)VALUES('Wrong origin','Meta')"), /row-level security/);
    await db.exec("RESET ROLE");
    assert.equal((await db.query("SELECT corretor FROM leads WHERE nome='Public inbound'")).rows[0].corretor, "Other", "legacy before-insert router still executes");
    assert.equal((await db.query("SELECT count(*)::int AS n FROM wa_notify_log")).rows[0].n, 4, "notification trigger executes once for accepted inbound, never for rejected insert");
    const newlyRegistered = "00000000-0000-4000-8000-000000000005";
    await db.query("INSERT INTO auth.users VALUES($1,'new@example.test',$2)", [newlyRegistered, JSON.stringify({ nome: "New", role: "admin", ativo: true })]);
    assert.deepEqual((await db.query("SELECT role,ativo FROM profiles WHERE id=$1", [newlyRegistered])).rows[0], { role: "corretor", ativo: false });
    await as(admin);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM leads")).rows[0].n, 4);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM tasks")).rows[0].n, 3);
    await as(null, "service_role");
    assert.equal((await db.query("SELECT marker FROM config WHERE id=1")).rows[0].marker, "preserve config", "server integration remains authorized");
  } finally {
    await db.close();
  }
});
