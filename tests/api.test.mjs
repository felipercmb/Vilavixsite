import test from "node:test";
import assert from "node:assert/strict";
import { campaignsMiddleware } from "../server/campaigns-handler.js";
async function invoke(handler, { method = "GET", headers = {} } = {}) {
  const response = {
    statusCode: 0,
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
    },
    end(value) {
      this.body = JSON.parse(value);
    },
  };
  await handler({ method, headers }, response);
  return response;
}
test("campaign preview rejects external origins and nonlocal hosts before accessing Zernio", async () => {
  const handler = campaignsMiddleware({}, { local: true });
  for (const headers of [
    { host: "example.com" },
    { host: "127.0.0.1:5173", origin: "https://example.com" },
    { host: "127.0.0.1:5173", "sec-fetch-site": "cross-site" },
  ]) {
    const result = await invoke(handler, { headers });
    assert.equal(result.statusCode, 403);
    assert.ok(result.body.error);
  }
  const result = await invoke(handler, { method: "DELETE" });
  assert.equal(result.statusCode, 405);
  assert.equal(result.headers.Allow, "GET, POST");
});
test("production campaign data requires authentication and never uses the local bypass", async () => {
  const handler = campaignsMiddleware({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-only",
  });
  const result = await invoke(handler, { headers: { host: "localhost:5173" } });
  assert.equal(result.statusCode, 401);
  assert.match(result.body.error, /Entre no CRM/);
  assert.equal(result.headers["Cache-Control"], "no-store");
  assert.ok(!JSON.stringify(result).includes("test-only"));
});

test("API autenticada descobre IDs recebidos e salva metadados sem substituir regras", async () => {
  const env = { SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "fixture-private", ZERNIO_API_KEY: "fixture-zernio", ZERNIO_ACCOUNT_ID: "connection", ZERNIO_AD_ACCOUNT_ID: "act_123" };
  let writes = 0;
  const json = (value) => new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });
  const handler = campaignsMiddleware(env, { fetcher: async (url, options = {}) => {
    const path = new URL(url).pathname;
    if (path === "/auth/v1/user") return json({ id: "fixture-user" });
    if (path === "/rest/v1/profiles") return json({ role: "admin", ativo: true });
    if (path === "/rest/v1/rpc/discover_zernio_campaign_ids") return json([{ campaign_id: "101" }]);
    if (path === "/api/v1/ads/campaigns") return json({ campaigns: [] });
    if (path === "/api/v1/ads/campaigns/101") return json({ campaign: { id: "101", name: "Recovered", account_id: "123", status: "ACTIVE", effective_status: "ACTIVE" } });
    assert.equal(path, "/rest/v1/rpc/sync_zernio_campaigns"); writes++;
    const rows = JSON.parse(options.body).p_rows;
    assert.equal(rows[0].external_id, "101");
    assert.equal(Object.hasOwn(rows[0], "routing_configured"), false);
    return json(1);
  } });
  const result = await invoke(handler, { method: "POST", headers: { authorization: "Bearer fixture-user-session" } });
  assert.equal(result.statusCode, 200); assert.equal(result.body.active, 1); assert.equal(writes, 1);
  assert.equal(JSON.stringify(result.body).includes(env.SUPABASE_SERVICE_ROLE_KEY), false);
});
