import { createHmac, timingSafeEqual } from "node:crypto";

const PAGE_ID = "426258463900482";
const EUA_FORM_ID = "2037322303564878";
const CAMPAIGN_ID = "meta-act_862381142187343-120247776821100289";
const WELLINGTON_ID = "50c338f0-f76a-4ee7-a714-84f2feb2268c";
const FORM_NAME = "Coqueiral EUA | Formulario simples | 07-09-2026";
const MAX_BODY_BYTES = 1_048_576;

const reply = (body, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });

function equalSecret(left, right) {
  const a = Buffer.from(left || "");
  const b = Buffer.from(right || "");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyMetaSignature(rawBody, header, appSecret) {
  if (!appSecret || !/^sha256=[a-f0-9]{64}$/i.test(header || "")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return equalSecret(header.slice(7).toLowerCase(), expected);
}

function oneField(fields, names) {
  const row = fields.find((field) => names.includes(String(field.name || "").toLowerCase()));
  return String(row?.values?.[0] || "").trim();
}

export function normalizeMetaLead(lead) {
  const fields = Array.isArray(lead.field_data) ? lead.field_data : [];
  const name = oneField(fields, ["full_name", "nome_completo", "name"]);
  const phone = oneField(fields, ["phone_number", "telefone", "phone"]);
  const email = oneField(fields, ["email", "email_address"]);
  if (!/^\d{5,30}$/.test(String(lead.id || "")) || !name || (!phone && !email))
    throw new Error("lead_fields_missing");
  const created = new Date(lead.created_time);
  if (Number.isNaN(created.valueOf())) throw new Error("lead_date_invalid");
  return {
    nome: name,
    telefone: phone || null,
    email: email || null,
    interesse: "Vivenda Coqueiral",
    origem: "Meta Ads",
    campanha: FORM_NAME,
    campaign_id: CAMPAIGN_ID,
    corretor_id: WELLINGTON_ID,
    external_id: `l:${lead.id}`,
    status: "novo",
    data: created.toISOString().slice(0, 10),
    notas: `Campanha: Coqueiral EUA\nFormulário: ${FORM_NAME}\nAnúncio Meta ID: ${String(lead.ad_id || "não informado").slice(0, 30)}`,
  };
}

function configured(env) {
  return Boolean(
    env.META_WEBHOOK_VERIFY_TOKEN &&
      env.META_APP_SECRET &&
      env.META_PAGE_ACCESS_TOKEN &&
      env.SUPABASE_URL &&
      env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

async function insertLead(lead, env, fetcher) {
  const url = new URL("/rest/v1/leads", env.SUPABASE_URL);
  const response = await fetcher(url, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(lead),
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 409) {
    const error = await response.json().catch(() => ({}));
    if (error.code === "23505" && String(error.details || "").includes("external_id"))
      return "duplicate";
  }
  if (!response.ok) throw new Error("crm_insert_failed");
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0].corretor_id !== WELLINGTON_ID)
    throw new Error("crm_assignment_failed");
  return "created";
}

async function processEvent(value, env, fetcher) {
  if (String(value?.page_id || "") !== PAGE_ID || String(value?.form_id || "") !== EUA_FORM_ID)
    return "ignored";
  const id = String(value?.leadgen_id || "");
  if (!/^\d{5,30}$/.test(id)) throw new Error("lead_id_invalid");
  const url = new URL(`https://graph.facebook.com/v26.0/${id}`);
  url.searchParams.set("fields", "id,created_time,ad_id,form_id,field_data");
  const response = await fetcher(url, {
    headers: { Authorization: `Bearer ${env.META_PAGE_ACCESS_TOKEN}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("meta_fetch_failed");
  const detail = await response.json();
  if (String(detail.id) !== id || String(detail.form_id) !== EUA_FORM_ID)
    throw new Error("meta_lead_mismatch");
  return insertLead(normalizeMetaLead(detail), env, fetcher);
}

export async function handleMetaLeads(request, env, fetcher = fetch) {
  if (request.method === "GET") {
    const params = new URL(request.url).searchParams;
    if (
      env.META_WEBHOOK_VERIFY_TOKEN &&
      params.get("hub.mode") === "subscribe" &&
      equalSecret(params.get("hub.verify_token"), env.META_WEBHOOK_VERIFY_TOKEN) &&
      /^\d{1,30}$/.test(params.get("hub.challenge") || "")
    )
      return new Response(params.get("hub.challenge"), {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    return reply({ error: "verification_failed" }, 403);
  }
  if (request.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  if (!configured(env)) return reply({ error: "not_configured" }, 503);
  const rawBody = Buffer.from(await request.arrayBuffer());
  if (rawBody.length > MAX_BODY_BYTES) return reply({ error: "payload_too_large" }, 413);
  if (!verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"), env.META_APP_SECRET))
    return reply({ error: "invalid_signature" }, 403);
  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return reply({ error: "invalid_json" }, 400);
  }
  if (payload?.object !== "page" || !Array.isArray(payload.entry))
    return reply({ error: "invalid_event" }, 400);
  try {
    let created = 0;
    let duplicate = 0;
    for (const entry of payload.entry) {
      if (String(entry?.id || "") !== PAGE_ID) continue;
      for (const change of entry.changes || []) {
        if (change?.field !== "leadgen") continue;
        const result = await processEvent(change.value, env, fetcher);
        if (result === "created") created += 1;
        if (result === "duplicate") duplicate += 1;
      }
    }
    return reply({ ok: true, created, duplicate });
  } catch (error) {
    // A non-2xx response asks Meta to retry; never log a lead's contact details.
    console.error("meta_leads_delivery_failed", error.message);
    return reply({ error: "temporarily_unavailable" }, 503);
  }
}
