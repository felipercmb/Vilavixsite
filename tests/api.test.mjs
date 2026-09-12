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
