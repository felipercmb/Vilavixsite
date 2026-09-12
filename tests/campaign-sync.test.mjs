import test from "node:test";
import assert from "node:assert/strict";
import { createCampaignSyncHandler } from "../supabase/functions/_shared/campaign-sync.js";

const env = {
  CAMPAIGN_SYNC_CRON_KEY: "fixture-only-dedicated-cron-secret-with-entropy-placeholder",
  SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "fixture-service-role-key",
  SUPABASE_ANON_KEY: "fixture-anon-key",
  ZERNIO_API_KEY: "fixture-zernio-key",
  ZERNIO_ACCOUNT_ID: "connection-fixture",
  ZERNIO_AD_ACCOUNT_ID: "act_fixture",
};
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
const request = (headers = { "X-Campaign-Sync-Key": env.CAMPAIGN_SYNC_CRON_KEY }, method = "POST") => new Request("https://abcdefghijklmnopqrst.supabase.co/functions/v1/sync-zernio-campaigns", { method, headers });
const campaign = (id, status = "paused") => ({ platformCampaignId: id, platformAdAccountId: "act_fixture", campaignName: `Campaign ${id}`, platform: "facebook", status, platformCampaignStatus: status });

test("scheduled sync rejects methods, anon/user/service JWTs and incorrect or unsafe cron secrets without network", async () => {
  let calls = 0;
  const handler = createCampaignSyncHandler(env, { fetcher: async () => { calls++; throw new Error("Unexpected network"); } });
  assert.equal((await handler(request({}, "GET"))).status, 405);
  for (const token of [env.SUPABASE_ANON_KEY, "fixture-user-jwt", env.SUPABASE_SERVICE_ROLE_KEY]) {
    assert.equal((await handler(request({ Authorization: `Bearer ${token}` }))).status, 401);
    assert.equal((await handler(request({ "X-Campaign-Sync-Key": token }))).status, 401);
  }
  assert.equal((await handler(request({ "X-Campaign-Sync-Key": env.CAMPAIGN_SYNC_CRON_KEY.slice(0, -1) + "x" }))).status, 401);
  assert.equal((await handler(request({}))).status, 401);
  const invalidConfig = createCampaignSyncHandler({ ...env, CAMPAIGN_SYNC_CRON_KEY: "short" });
  assert.equal((await invalidConfig(request())).status, 503);
  assert.equal(calls, 0);
});

test("scheduled sync reads every page and active status before one atomic metadata write without routing rules", async () => {
  const requests = [];
  let payload;
  const handler = createCampaignSyncHandler(env, { fetcher: async (url, options = {}) => {
    const target = new URL(url); requests.push(`${options.method || "GET"} ${target.pathname}${target.search}`);
    if (target.pathname === "/api/v1/ads/campaigns") {
      assert.equal(target.searchParams.get("accountId"), env.ZERNIO_ACCOUNT_ID);
      assert.equal(target.searchParams.get("adAccountId"), env.ZERNIO_AD_ACCOUNT_ID);
      assert.equal(target.searchParams.get("source"), "all");
      return json({ campaigns: [campaign(target.searchParams.get("page"), target.searchParams.get("page") === "1" ? "active" : "paused")], pagination: { pages: 2 } });
    }
    if (target.pathname === "/api/v1/ads/campaigns/1") return json({ campaign: { id: "1", status: "PAUSED", effective_status: "PAUSED" } });
    assert.equal(target.pathname, "/rest/v1/rpc/sync_zernio_campaigns");
    assert.equal(requests.length, 4, "both list pages and live active confirmation precede persistence");
    assert.equal(options.headers.Authorization, `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`);
    payload = JSON.parse(options.body);
    return json(2);
  } });
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(payload).sort(), ["p_account_id", "p_rows"]);
  assert.equal(payload.p_rows.length, 2);
  assert.equal(payload.p_rows[0].effective_status, "PAUSED", "live pause wins over cached active aggregate");
  for (const row of payload.p_rows) for (const field of ["broker_ids", "weights", "routing_enabled", "daily_limit"]) assert.equal(Object.hasOwn(row, field), false);
  const result = await response.json();
  assert.equal(result.total, 2); assert.equal(result.active, 0); assert.equal(result.ok, true);
});

test("a failed later page or unconfirmed provider cache never writes partial data or marks a sync successful", async () => {
  for (const failure of ["page", "cache"]) {
    let writes = 0;
    const events = [];
    const handler = createCampaignSyncHandler(env, { onFailure: (event) => events.push(event), fetcher: async (url, options = {}) => {
      if (options.method === "POST") { writes++; return json(1); }
      const page = new URL(url).searchParams.get("page");
      if (page === "1") return json({ campaigns: [campaign("1")], pagination: { pages: 2 } });
      return failure === "page" ? json({ error: env.ZERNIO_API_KEY }, 500) : json({ campaigns: [], backfillPending: true }, 202);
    } });
    const result = await handler(request());
    assert.equal(result.status, 502); assert.equal(writes, 0);
    const visible = JSON.stringify({ response: await result.json(), events });
    assert.equal(visible.includes(env.ZERNIO_API_KEY), false);
    assert.equal(events[0].stage, "provider");
  }
});

test("provider timeout aborts requests and cannot write or leak credentials", async () => {
  const events = [];
  let writes = 0;
  const handler = createCampaignSyncHandler(env, { timeoutMs: 15, onFailure: (event) => events.push(event), fetcher: (_url, options = {}) => {
    if (options.method === "POST") writes++;
    return new Promise((_resolve, reject) => {
      if (options.signal.aborted) return reject(new DOMException("Aborted", "AbortError"));
      options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    });
  } });
  assert.equal((await handler(request())).status, 503);
  assert.equal(writes, 0);
  assert.deepEqual(events, [{ event: "campaign_sync_failed", stage: "provider", code: "timeout" }]);
});

test("database errors have secret-safe responses and fixed log fields", async () => {
  const events = [];
  const handler = createCampaignSyncHandler(env, { onFailure: (event) => events.push(event), fetcher: async (_url, options = {}) => options.method === "POST" ? json({ error: `${env.SUPABASE_SERVICE_ROLE_KEY} ${env.ZERNIO_API_KEY}` }, 500) : json({ campaigns: [campaign("1")] }) });
  const response = await handler(request());
  assert.equal(response.status, 502);
  const visible = JSON.stringify({ response: await response.json(), events });
  for (const secret of [env.SUPABASE_SERVICE_ROLE_KEY, env.ZERNIO_API_KEY, env.CAMPAIGN_SYNC_CRON_KEY]) assert.equal(visible.includes(secret), false);
  assert.deepEqual(events, [{ event: "campaign_sync_failed", stage: "database", code: "sync_failed" }]);
});

test("overlapping authorized syncs share one in-flight provider snapshot and database write", async () => {
  let reads = 0, writes = 0;
  const handler = createCampaignSyncHandler(env, { fetcher: async (_url, options = {}) => {
    if (options.method === "POST") { writes++; return json(1); }
    reads++;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return json({ campaigns: [campaign("1")] });
  } });
  const results = await Promise.all([handler(request()), handler(request())]);
  assert.deepEqual(results.map((result) => result.status), [200, 200]);
  assert.equal(reads, 1); assert.equal(writes, 1);
});
