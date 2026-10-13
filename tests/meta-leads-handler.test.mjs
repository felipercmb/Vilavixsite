import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { handleMetaLeads, verifyMetaSignature } from "../server/meta-leads-handler.js";

const env = {
  META_WEBHOOK_VERIFY_TOKEN: "verify-test-token",
  META_APP_SECRET: "meta-app-secret",
  META_PAGE_ACCESS_TOKEN: "page-token",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};
const event = (formId = "2037322303564878") => ({
  object: "page",
  entry: [{
    id: "426258463900482",
    changes: [{ field: "leadgen", value: { page_id: "426258463900482", form_id: formId, leadgen_id: "123456789" } }],
  }],
});
const signedRequest = (payload) => {
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", env.META_APP_SECRET).update(body).digest("hex");
  return new Request("https://vilavix.com/api/meta-leads", {
    method: "POST",
    headers: { "x-hub-signature-256": `sha256=${signature}` },
    body,
  });
};

test("Meta challenge and signature validation reject unauthenticated requests", async () => {
  const url = "https://vilavix.com/api/meta-leads?hub.mode=subscribe&hub.verify_token=verify-test-token&hub.challenge=12345";
  const verified = await handleMetaLeads(new Request(url), env);
  assert.equal(verified.status, 200);
  assert.equal(await verified.text(), "12345");
  assert.equal((await handleMetaLeads(new Request(url.replace("verify-test-token", "bad")), env)).status, 403);
  assert.equal(verifyMetaSignature(Buffer.from("{}"), "sha256=bad", env.META_APP_SECRET), false);
  assert.equal((await handleMetaLeads(new Request("https://vilavix.com/api/meta-leads", { method: "POST", body: "{}" }), env)).status, 403);
});

test("signed US form lead is assigned only to Wellington and replay does not create a second lead", async () => {
  let inserts = 0;
  const fetcher = async (url, options) => {
    if (String(url).startsWith("https://graph.facebook.com/")) {
      assert.equal(options.headers.Authorization, "Bearer page-token");
      return Response.json({
        id: "123456789",
        form_id: "2037322303564878",
        ad_id: "120247872007840289",
        created_time: "2026-10-13T12:00:00+0000",
        field_data: [
          { name: "full_name", values: ["Cliente Teste"] },
          { name: "phone_number", values: ["+1 555 123 4567"] },
          { name: "email", values: ["teste@example.com"] },
        ],
      });
    }
    assert.equal(new URL(url).pathname, "/rest/v1/leads");
    assert.equal(options.headers.Authorization, "Bearer service-role-key");
    const lead = JSON.parse(options.body);
    assert.equal(lead.corretor_id, "50c338f0-f76a-4ee7-a714-84f2feb2268c");
    assert.equal(lead.campaign_id, "meta-act_862381142187343-120247776821100289");
    assert.equal(lead.external_id, "l:123456789");
    assert.equal(lead.telefone, "+1 555 123 4567");
    inserts += 1;
    if (inserts === 1) return Response.json([{ id: 999, corretor_id: lead.corretor_id }], { status: 201 });
    return Response.json({ code: "23505", details: "Key (external_id)=(l:123456789) already exists." }, { status: 409 });
  };
  const first = await handleMetaLeads(signedRequest(event()), env, fetcher);
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { ok: true, created: 1, duplicate: 0 });
  const replay = await handleMetaLeads(signedRequest(event()), env, fetcher);
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), { ok: true, created: 0, duplicate: 1 });
  assert.equal(inserts, 2);
});

test("other forms are ignored and upstream failures remain retryable", async () => {
  const ignored = await handleMetaLeads(signedRequest(event("other-form")), env, () => {
    throw new Error("No fetch expected for unrelated forms");
  });
  assert.deepEqual(await ignored.json(), { ok: true, created: 0, duplicate: 0 });
  const prior = console.error;
  console.error = () => {};
  try {
    const failed = await handleMetaLeads(signedRequest(event()), env, () => new Response(null, { status: 503 }));
    assert.equal(failed.status, 503);
  } finally {
    console.error = prior;
  }
});
