import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { leadCollection } from "../lib/lead-collections.js";
import { dbToLead } from "../lib/mappers.js";

test("migração preserva contatos e permissões; troca de carteira persiste sem redistribuir nem notificar", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE authenticated;
      CREATE TABLE leads(id int PRIMARY KEY, nome text, corretor text, status text, campaign_id text, notas text);
      CREATE TABLE notification_probe(lead_id int);
      CREATE FUNCTION notify_probe() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN INSERT INTO notification_probe VALUES(NEW.id);RETURN NEW;END;$$;
      CREATE TRIGGER lead_notification AFTER INSERT ON leads FOR EACH ROW EXECUTE FUNCTION notify_probe();
      ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
      CREATE POLICY broker_leads ON leads TO authenticated USING(corretor=current_setting('test.broker',true)) WITH CHECK(corretor=current_setting('test.broker',true));
      GRANT USAGE ON SCHEMA public TO authenticated;
      GRANT SELECT,UPDATE ON leads TO authenticated;
      INSERT INTO leads VALUES(1,'Contato histórico','Broker A','atendimento','campanha-a','Importado da planilha de leads da VilaVix. Observações originais'),(2,'Outro contato','Broker B','novo','campanha-b','Contato recebido hoje');
    `);
    const policies = (await db.query("SELECT policyname,cmd,qual,with_check FROM pg_policies WHERE tablename='leads'")).rows;
    const migration = await readFile(new URL("../supabase/migrations/20261021170000_manual_lead_collection.sql", import.meta.url), "utf8");
    await db.exec(migration);
    await db.exec(migration);
    assert.deepEqual((await db.query("SELECT policyname,cmd,qual,with_check FROM pg_policies WHERE tablename='leads'")).rows, policies);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM leads")).rows[0].n, 2);
    const before = (await db.query("SELECT * FROM leads WHERE id=1")).rows[0];
    assert.equal(before.carteira, null);
    assert.equal(leadCollection(dbToLead(before)), "prospeccao");
    await db.exec("SELECT set_config('test.broker','Broker A',false); SET ROLE authenticated;");
    await db.exec("UPDATE leads SET carteira='entrada' WHERE id=1;");
    const readBack = (await db.query("SELECT * FROM leads WHERE id=1")).rows[0];
    assert.equal(leadCollection(dbToLead(readBack)), "entrada");
    assert.deepEqual({ ...readBack, carteira: null }, before);
    assert.equal((await db.query("UPDATE leads SET carteira='entrada' WHERE id=2 RETURNING id")).rows.length, 0);
    // The same RLS rule applies to bulk PATCHes: only the broker's row returns.
    assert.deepEqual((await db.query("UPDATE leads SET carteira='prospeccao' WHERE id IN (1,2) RETURNING id,carteira")).rows, [{ id: 1, carteira: "prospeccao" }]);
    await assert.rejects(db.exec("UPDATE leads SET carteira='all' WHERE id=1"), /leads_carteira_check/);
    await db.exec("UPDATE leads SET carteira='prospeccao' WHERE id=1;");
    assert.equal(leadCollection(dbToLead((await db.query("SELECT * FROM leads WHERE id=1")).rows[0])), "prospeccao");
    await db.exec("RESET ROLE;");
    assert.equal((await db.query("SELECT count(*)::int AS n FROM notification_probe")).rows[0].n, 2);
    assert.equal((await db.query("SELECT carteira FROM leads WHERE id=2")).rows[0].carteira, null);
  } finally { await db.close(); }
});
