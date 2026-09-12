import { createClient } from "@supabase/supabase-js";
import { fetchCampaigns, IntegrationError } from "./zernio.js";
const send = (res, status, data) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(data));
};
export function campaignsMiddleware(env, { local = false } = {}) {
  let cached = null,
    pending = null;
  return async (req, res) => {
    if (!["GET", "POST"].includes(req.method)) {
      res.setHeader("Allow", "GET, POST");
      return send(res, 405, { error: "Método não permitido." });
    }
    try {
      let admin = null;
      if (local) {
        const host = req.headers.host || "";
        if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host))
          throw new IntegrationError(
            "A prévia de campanhas está disponível apenas neste computador.",
            403,
          );
        if (req.headers.origin && new URL(req.headers.origin).host !== host)
          throw new IntegrationError("Origem não autorizada.", 403);
        if (req.headers["sec-fetch-site"] === "cross-site")
          throw new IntegrationError("Origem não autorizada.", 403);
      } else {
        if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)
          throw new IntegrationError(
            "A integração do CRM precisa ser configurada no servidor.",
            503,
          );
        const token = (req.headers.authorization || "").replace(/^Bearer /, "");
        if (!token)
          throw new IntegrationError(
            "Entre no CRM para consultar as campanhas.",
            401,
          );
        admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const {
          data: { user },
          error,
        } = await admin.auth.getUser(token);
        if (error || !user)
          throw new IntegrationError(
            "Sua sessão expirou. Entre novamente.",
            401,
          );
        const profile = await admin
          .from("profiles")
          .select("role,ativo")
          .eq("id", user.id)
          .single();
        if (
          profile.error ||
          !profile.data?.ativo ||
          profile.data.role !== "admin"
        )
          throw new IntegrationError(
            "Somente administradores podem sincronizar campanhas.",
            403,
          );
      }
      if (!cached || Date.now() - cached.at > 60_000 || req.method === "POST") {
        if (!pending)
          pending = fetchCampaigns(env).finally(() => {
            pending = null;
          });
        const data = await pending;
        if (admin) {
          const metadata = data.campaigns.map(
            ({ broker_ids, weights, routing_enabled, daily_limit, ...row }) =>
              row,
          );
          // Transaction preserves routing rules and marks disappeared campaigns inactive.
          const stored = await admin.rpc("sync_zernio_campaigns", {
            p_rows: metadata,
            p_account_id: data.adAccountId,
          });
          if (stored.error)
            throw new IntegrationError(
              "As campanhas foram consultadas, mas a migração do CRM ainda não foi aplicada.",
              503,
            );
        }
        cached = { at: Date.now(), data };
      }
      return send(res, 200, {
        ...cached.data,
        mode: local ? "local-preview" : "live",
      });
    } catch (error) {
      return send(res, error.status || 502, {
        error:
          error instanceof IntegrationError
            ? error.message
            : "A conexão demorou ou falhou. Tente sincronizar novamente.",
      });
    }
  };
}
