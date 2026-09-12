import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("manual cron installer requires a verified deployed endpoint and denies runtime application roles", async () => {
  const db = new PGlite();
  try {
    await db.exec("CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role");
    const source = await readFile(new URL("../scripts/install-campaign-sync-cron.sql", import.meta.url), "utf8");
    await db.exec(source);
    await db.exec(source);
    const endpoint = "https://abcdefghijklmnopqrst.supabase.co/functions/v1/sync-zernio-campaigns";
    for (const [url, ref, verified] of [[endpoint, "abcdefghijklmnopqrst", false], ["https://untrusted.example/sync", "abcdefghijklmnopqrst", true], [endpoint, "differentprojectrefab", true]]) {
      await assert.rejects(db.query("SELECT install_campaign_sync_schedule($1,$2,$3,$4)", [url, ref, "cron-secret-name", verified]), /endpoint já publicado/);
    }
    await assert.rejects(db.query("SELECT install_campaign_sync_schedule($1,$2,$3,true)", [endpoint, "abcdefghijklmnopqrst", "cron-secret-name"]), /Habilite Cron, pg_net e Vault/);
    const permissions = (await db.query("SELECT has_function_privilege('anon','install_campaign_sync_schedule(text,text,text,boolean)','EXECUTE') AS anon,has_function_privilege('authenticated','install_campaign_sync_schedule(text,text,text,boolean)','EXECUTE') AS authenticated,has_function_privilege('service_role','install_campaign_sync_schedule(text,text,text,boolean)','EXECUTE') AS service_role")).rows[0];
    assert.deepEqual(permissions, { anon: false, authenticated: false, service_role: false });
  } finally { await db.close(); }
});
