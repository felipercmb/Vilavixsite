import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { fetchCampaigns } from "../server/zernio.js";
import { createCampaignSyncHandler } from "../supabase/functions/_shared/campaign-sync.js";

const env = {
  ZERNIO_API_KEY: "fixture-zernio-private-key", ZERNIO_ACCOUNT_ID: "connection",
  ZERNIO_AD_ACCOUNT_ID: "act_123456", SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "fixture-server-private-key",
  CAMPAIGN_SYNC_CRON_KEY: "fixture-dedicated-cron-key-with-thirty-two-characters",
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const listRow = (id, status = "PAUSED") => ({ platformCampaignId: id, platformAdAccountId: env.ZERNIO_AD_ACCOUNT_ID, platform: "facebook", campaignName: `List ${id}`, status, platformCampaignStatus: status });
const detail = (id, status = "ACTIVE") => ({ id, name: `Live ${id}`, account_id: "123456", status, effective_status: status, objective: "OUTCOME_LEADS", start_time: "2026-09-01T00:00:00Z" });
const discoveryPath = "/rest/v1/rpc/discover_zernio_campaign_ids";
const syncPath = "/rest/v1/rpc/sync_zernio_campaigns";

test("descoberta recupera campanhas omitidas mesmo com catálogo completo de quarenta pausadas", async () => {
  const ids = ["2001", "2002", "2003", "2004"];
  const seen = [];
  const result = await fetchCampaigns(env, async (url, options = {}) => {
    const target = new URL(url); seen.push(target.pathname);
    if (target.pathname === discoveryPath) {
      assert.equal(options.method, "POST");
      assert.equal(options.headers.Authorization, `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`);
      assert.deepEqual(JSON.parse(options.body), { p_account_id: "act_123456", p_lookback_days: 90, p_limit: 500 });
      return json([...ids, "2001"].map((campaign_id) => ({ campaign_id })));
    }
    assert.equal(options.headers.Authorization, `Bearer ${env.ZERNIO_API_KEY}`);
    if (target.pathname === "/api/v1/ads/campaigns")
      return json({ campaigns: Array.from({ length: 40 }, (_, index) => listRow(String(1000 + index))), pagination: { pages: 1 } });
    const id = target.pathname.split("/").at(-1);
    assert.ok(ids.includes(id));
    assert.match(target.searchParams.get("fields"), /account_id/);
    return json({ campaign: detail(id, id === "2004" ? "PAUSED" : "ACTIVE") });
  });
  assert.equal(result.total, 44);
  assert.equal(result.active, 3);
  assert.equal(seen.length, 6, "one discovery, one listing, four unique detail lookups");
  const recovered = result.campaigns.find((campaign) => campaign.external_id === "2001");
  assert.equal(recovered.id, "meta-act_123456-2001");
  assert.equal(recovered.name, "Live 2001");
  assert.equal(recovered.ad_account_id, env.ZERNIO_AD_ACCOUNT_ID);
  assert.equal(recovered.objective, "OUTCOME_LEADS");
  assert.equal(recovered.routing_enabled, false, "discovery does not opt a campaign into routing");
  assert.equal(Object.hasOwn(recovered, "routing_configured"), false);
});

test("ID recebido já presente como pausado tem metadados atuais consultados uma única vez", async () => {
  let details = 0;
  const result = await fetchCampaigns(env, async (url) => {
    const path = new URL(url).pathname;
    if (path === discoveryPath) return json([{ campaign_id: "2001" }]);
    if (path === "/api/v1/ads/campaigns") return json({ campaigns: [listRow("2001")] });
    details++;
    return json({ campaign: detail("2001") });
  });
  assert.equal(result.total, 1); assert.equal(result.active, 1); assert.equal(details, 1);
  assert.equal(result.campaigns[0].name, "Live 2001");
});

for (const failure of ["discovery", "missing", "backfill", "wrong-id", "wrong-account", "no-account", "no-name"]) {
  test(`falha ${failure} impede persistência parcial e não expõe segredos`, async () => {
    let writes = 0;
    const handler = createCampaignSyncHandler(env, { fetcher: async (url) => {
      const path = new URL(url).pathname;
      if (path === discoveryPath) return failure === "discovery" ? json({ message: env.SUPABASE_SERVICE_ROLE_KEY }, 500) : json([{ campaign_id: "2001" }]);
      if (path === syncPath) { writes++; return json(1); }
      if (path === "/api/v1/ads/campaigns") return json({ campaigns: [listRow("1001")] });
      if (failure === "missing") return json({ message: env.ZERNIO_API_KEY }, 404);
      if (failure === "backfill") return json({ backfillPending: true }, 202);
      const row = detail("2001");
      if (failure === "wrong-id") row.id = "9999";
      if (failure === "wrong-account") row.account_id = "999999";
      if (failure === "no-account") delete row.account_id;
      if (failure === "no-name") delete row.name;
      return json({ campaign: row });
    } });
    const result = await handler(new Request(`${env.SUPABASE_URL}/functions/v1/sync-zernio-campaigns`, { method: "POST", headers: { "X-Campaign-Sync-Key": env.CAMPAIGN_SYNC_CRON_KEY } }));
    assert.equal(result.status, 502); assert.equal(writes, 0);
    const body = await result.text();
    for (const secret of [env.SUPABASE_SERVICE_ROLE_KEY, env.ZERNIO_API_KEY, env.CAMPAIGN_SYNC_CRON_KEY]) assert.equal(body.includes(secret), false);
  });
}

test("Edge persiste o catálogo recuperado somente depois de confirmar todos os IDs", async () => {
  const calls = [];
  const handler = createCampaignSyncHandler(env, { fetcher: async (url, options = {}) => {
    const path = new URL(url).pathname; calls.push(path);
    if (path === discoveryPath) return json([{ campaign_id: "2001" }]);
    if (path === "/api/v1/ads/campaigns") return json({ campaigns: [listRow("1001")] });
    if (path === "/api/v1/ads/campaigns/2001") return json({ campaign: detail("2001") });
    assert.equal(path, syncPath);
    assert.equal(calls.length, 4);
    const payload = JSON.parse(options.body);
    assert.equal(payload.p_rows.length, 2);
    assert.equal(payload.p_rows.find((row) => row.external_id === "2001").effective_status, "ACTIVE");
    for (const row of payload.p_rows) for (const field of ["broker_ids", "weights", "routing_enabled", "routing_configured", "daily_limit"]) assert.equal(Object.hasOwn(row, field), false);
    return json(2);
  } });
  const result = await handler(new Request(`${env.SUPABASE_URL}/functions/v1/sync-zernio-campaigns`, { method: "POST", headers: { "X-Campaign-Sync-Key": env.CAMPAIGN_SYNC_CRON_KEY } }));
  assert.equal(result.status, 200);
  assert.equal((await result.json()).active, 1);
});

test("descoberta inválida ou acima do limite não passa por catálogo vazio", async () => {
  for (const rows of [[{ campaign_id: "form-name" }], Array.from({ length: 501 }, (_, index) => ({ campaign_id: String(index) }))]) {
    await assert.rejects(fetchCampaigns(env, async () => json(rows)), /inválidos ou incompletos/);
  }
});

const migration = await readFile(new URL("../supabase/migrations/20260912195000_campaign_discovery.sql", import.meta.url), "utf8");
async function discoveryDatabase() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE public.campaigns(external_id text, provider text DEFAULT 'zernio', source text DEFAULT 'meta', ad_account_id text DEFAULT 'act_123456', effective_status text DEFAULT 'PAUSED', routing_enabled boolean DEFAULT false);
    CREATE TABLE public.zernio_inbound_log(created_at timestamptz DEFAULT now(), campaign_id text, raw jsonb, form_name text);
    INSERT INTO public.zernio_inbound_log(campaign_id,raw,form_name) VALUES ('101','{"private":"must not return"}','Form'),('101','{}','Form'),('102','{}','Formulário Universal'),('form name','{}','invalid');
    INSERT INTO public.zernio_inbound_log(campaign_id,created_at) VALUES ('103',now()-interval '91 days');
    INSERT INTO public.campaigns(external_id,effective_status) VALUES ('201','ACTIVE');
    INSERT INTO public.campaigns(external_id,routing_enabled) VALUES ('202',true),('203',false);
    INSERT INTO public.campaigns(external_id,effective_status,ad_account_id) VALUES ('204','ACTIVE','act_other');
  `);
  await db.exec(migration);
  return db;
}

test("RPC descobre IDs recentes distintos e preserva campanhas ativas/habilitadas sem retornar payloads", async () => {
  const db = await discoveryDatabase();
  try {
    await db.exec("SET ROLE service_role");
    const result = await db.query("SELECT * FROM public.discover_zernio_campaign_ids('123456')");
    assert.deepEqual(result.rows, ["101", "102", "201", "202"].map((campaign_id) => ({ campaign_id })));
    await assert.rejects(db.query("SELECT * FROM public.discover_zernio_campaign_ids('123456',90,2)"), (error) => error.code === "54000");
    await assert.rejects(db.query("SELECT * FROM public.discover_zernio_campaign_ids('123456',0,500)"), (error) => error.code === "22023");
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`RESET ROLE; SET ROLE ${role}`);
      await assert.rejects(db.query("SELECT * FROM public.discover_zernio_campaign_ids('123456')"), (error) => error.code === "42501");
    }
  } finally { await db.close(); }
});

test("instalação sem tabela de entrada ainda descobre campanhas conhecidas", async () => {
  const db = await discoveryDatabase();
  try {
    await db.exec("DROP TABLE public.zernio_inbound_log; SET ROLE service_role");
    assert.deepEqual((await db.query("SELECT * FROM public.discover_zernio_campaign_ids('act_123456')")).rows, [{ campaign_id: "201" }, { campaign_id: "202" }]);
  } finally { await db.close(); }
});
