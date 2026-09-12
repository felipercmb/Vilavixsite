import { fetchCampaigns } from "./zernio.js";

const reply = (status, body, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers },
});

async function sameSecret(candidate, expected) {
  if (!candidate || candidate.length > 256) return false;
  const encode = new TextEncoder();
  const [left, right] = await Promise.all([candidate, expected].map((value) => crypto.subtle.digest("SHA-256", encode.encode(value))));
  const a = new Uint8Array(left), b = new Uint8Array(right);
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a[index] ^ b[index];
  return difference === 0;
}

// Fetch/Response APIs keep this handler usable in Deno and in offline Node tests.
/**
 * @param {Record<string, string | undefined>} env
 * @param {{fetcher?: typeof fetch, timeoutMs?: number, onFailure?: (event: {event: string, stage: string, code: string}) => void}} options
 */
export function createCampaignSyncHandler(env, { fetcher = fetch, timeoutMs = 90_000, onFailure = () => {} } = {}) {
  let inFlight = null;
  return async (request) => {
    if (request.method !== "POST") return reply(405, { error: "Método não permitido." }, { Allow: "POST" });
    const key = env.CAMPAIGN_SYNC_CRON_KEY || "";
    if (key.length < 32 || key.length > 256 || key === env.SUPABASE_SERVICE_ROLE_KEY || key === env.SUPABASE_ANON_KEY)
      return reply(503, { error: "A sincronização automática precisa ser configurada." });
    // A user JWT, anon token, or service-role Authorization header cannot authorize
    // this endpoint. It requires its own high-entropy secret in this single header.
    if (!await sameSecret(request.headers.get("X-Campaign-Sync-Key") || "", key))
      return reply(401, { error: "Não autorizado." });

    const synchronize = async () => {
      let stage = "configuration";
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const projectUrl = new URL(env.SUPABASE_URL || "");
        if (projectUrl.protocol !== "https:" || !/^[a-z0-9]+\.supabase\.co$/.test(projectUrl.hostname) || projectUrl.username || projectUrl.password || projectUrl.search || projectUrl.hash || !["", "/"].includes(projectUrl.pathname) || !env.SUPABASE_SERVICE_ROLE_KEY)
          throw new Error("Invalid server configuration");
        const timedFetch = (url, options = {}) => fetcher(url, {
          ...options,
          signal: AbortSignal.any([controller.signal, ...(options.signal ? [options.signal] : [])]),
        });
        stage = "provider";
        // All pages and active-status confirmations finish before the only write.
        const snapshot = await fetchCampaigns(env, timedFetch);
        const metadata = snapshot.campaigns.map(({ broker_ids, weights, routing_enabled, daily_limit, ...row }) => row);
        if (controller.signal.aborted) throw new Error("Sync deadline exceeded");
        stage = "database";
        const stored = await timedFetch(new URL("/rest/v1/rpc/sync_zernio_campaigns", projectUrl), {
          method: "POST",
          headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, apikey: env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ p_rows: metadata, p_account_id: snapshot.adAccountId }),
        });
        if (!stored.ok) throw new Error("Campaign persistence failed");
        const count = await stored.json();
        if (!Number.isInteger(count) || count !== metadata.length) throw new Error("Campaign persistence was not confirmed");
        return { status: 200, body: { ok: true, total: snapshot.total, active: snapshot.active, syncedAt: snapshot.syncedAt } };
      } catch {
        // Never log exceptions, response bodies, headers, or environment values.
        const code = controller.signal.aborted ? "timeout" : "sync_failed";
        try { onFailure({ event: "campaign_sync_failed", stage, code }); } catch { /* Logging cannot change the response. */ }
        return { status: controller.signal.aborted || stage === "configuration" ? 503 : 502, body: { error: "Não foi possível confirmar a sincronização. Consulte a última atualização no CRM." } };
      } finally { clearTimeout(timer); }
    };
    if (!inFlight) inFlight = synchronize().finally(() => { inFlight = null; });
    const result = await inFlight;
    return reply(result.status, result.body);
  };
}
