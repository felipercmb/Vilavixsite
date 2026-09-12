import { supabase } from "./supabase.js";
import { routingPreview } from "./routing.js";
const KEY = "vilavix:campaign-rules:review:v1";
const HISTORY = "vilavix:routing:review:v1";
let snapshot = [];
const read = (key, fallback = []) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const fail = (error) => ({
  data: null,
  error: { message: error.message || String(error) },
});
async function provider(method = "GET") {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const response = await fetch("/api/campaigns", {
    method,
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    signal: AbortSignal.timeout(55000),
  });
  const payload = await response.json();
  if (!response.ok)
    throw new Error(
      payload.error || "Não foi possível consultar as campanhas.",
    );
  snapshot = payload.campaigns || [];
  return payload;
}
async function campaigns(options = {}, method = "GET") {
  try {
    if (options.demo && !import.meta.env.DEV)
      throw new Error("A revisão local não está disponível neste ambiente.");
    const payload = await provider(method);
    let rules = [];
    if (options.demo) rules = read(KEY);
    else {
      const result = await supabase.from("campaigns").select("*");
      if (result.error) throw result.error;
      rules = result.data || [];
    }
    const map = new Map(rules.map((r) => [String(r.id), r]));
    const data = snapshot.map((c) => ({
      ...c,
      ...Object.fromEntries(
        ["broker_ids", "weights", "routing_enabled", "daily_limit"].map((k) => [
          k,
          map.get(String(c.id))?.[k] ?? c[k],
        ]),
      ),
    }));
    if (options.demo)
      data.push(
        ...rules.filter(
          (r) => r.source === "manual" && !data.some((c) => c.id === r.id),
        ),
      );
    return {
      data,
      error: null,
      syncedAt: payload.syncedAt,
      provider: "zernio",
      mode: payload.mode,
    };
  } catch (error) {
    return fail(error);
  }
}
export const getCampaigns = (options = {}) => campaigns(options);
export const syncMetaCampaigns = (options = {}) => campaigns(options, "POST");
export const syncZernioCampaigns = syncMetaCampaigns;
export async function saveCampaign(campaign, options = {}) {
  try {
    const ids = [...new Set((campaign.broker_ids || []).map(String))];
    const weights = Object.fromEntries(
      ids.map((id) => [id, Number(campaign.weights?.[id] ?? 1)]),
    );
    if (
      Object.values(weights).some(
        (w) => !Number.isFinite(w) || w < 0 || w > 100,
      )
    )
      throw new Error("Informe pesos entre 0 e 100.");
    const limit =
      campaign.daily_limit === null ||
      campaign.daily_limit === undefined ||
      campaign.daily_limit === ""
        ? null
        : Number(campaign.daily_limit);
    if (limit !== null && (!Number.isInteger(limit) || limit < 0))
      throw new Error(
        "O limite diário deve ser um número inteiro maior ou igual a zero.",
      );
    const rules = {
      id: campaign.id,
      broker_ids: ids,
      weights,
      routing_enabled: Boolean(campaign.routing_enabled),
      daily_limit: limit,
    };
    if (options.demo && import.meta.env.DEV) {
      const rows = read(KEY);
      const found = rows.findIndex((r) => r.id === campaign.id);
      const row =
        campaign.source === "manual" ? { ...campaign, ...rules } : rules;
      if (found >= 0) rows[found] = row;
      else rows.push(row);
      write(KEY, rows);
      return { data: { ...campaign, ...rules }, error: null };
    }
    const result = await supabase.rpc("save_campaign_rules", {
      p_id: rules.id,
      p_broker_ids: ids,
      p_weights: weights,
      p_enabled: rules.routing_enabled,
      p_daily_limit: limit,
    });
    if (result.error) throw result.error;
    return { data: result.data, error: null };
  } catch (error) {
    return fail(error);
  }
}
export async function getRoutingHistory(options = {}) {
  if (options.demo && import.meta.env.DEV)
    return { data: read(HISTORY), error: null };
  return supabase
    .from("lead_assignments")
    .select("*")
    .order("assigned_at", { ascending: false })
    .limit(1000);
}
export async function getRoutingPreview(campaignId, options = {}) {
  try {
    const result = await getCampaigns(options);
    if (result.error) throw result.error;
    const campaign = result.data.find(
      (c) => String(c.id) === String(campaignId),
    );
    if (!options.demo) {
      // Aggregate in the database: the activity table's display limit cannot determine routing quotas.
      const preview = await supabase.rpc("preview_campaign_routing", {
        p_campaign_id: campaignId,
      });
      if (preview.error) throw preview.error;
      const eligibleBrokers = preview.data.eligibleBrokers.map((b) => ({
        ...b,
        capacityRemaining: b.capacityRemaining ?? Infinity,
      }));
      const nextBroker = preview.data.nextBroker
        ? eligibleBrokers.find((b) => b.id === preview.data.nextBroker.id)
        : null;
      return {
        data: { ...preview.data, eligibleBrokers, nextBroker },
        error: null,
      };
    }
    const history = await getRoutingHistory(options);
    if (history.error) throw history.error;
    return {
      data: routingPreview(campaign, options.brokers || [], history.data),
      error: null,
    };
  } catch (error) {
    return fail(error);
  }
}
export async function routeLead(leadId, campaignId, options = {}) {
  if (!options.demo)
    return supabase.rpc("route_lead", {
      p_lead_id: leadId,
      p_campaign_id: campaignId,
    });
  if (!import.meta.env.DEV) return fail(new Error("Revisão indisponível."));
  try {
    const history = read(HISTORY);
    const existing = history.find((h) => String(h.lead_id) === String(leadId));
    if (existing) return { data: existing, error: null };
    const lead = (options.leads || []).find(
      (l) => String(l.id) === String(leadId),
    );
    if (lead?.corretor || lead?.corretorId)
      throw new Error(
        "Este lead já possui um corretor. A roleta não substitui o responsável.",
      );
    const { data: preview, error } = await getRoutingPreview(
      campaignId,
      options,
    );
    if (error) throw error;
    if (!preview.nextBroker) throw new Error(preview.reason);
    const record = {
      id: crypto.randomUUID(),
      lead_id: leadId,
      campaign_id: campaignId,
      broker_id: preview.nextBroker.id,
      broker_name: preview.nextBroker.nome,
      assigned_at: new Date().toISOString(),
      reason: "Distribuição ponderada por campanha (revisão local)",
    };
    write(HISTORY, [record, ...history]);
    return { data: record, error: null };
  } catch (error) {
    return fail(error);
  }
}
