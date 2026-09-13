const BASE = "https://zernio.com/api/v1";
export class IntegrationError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}
export function normalizeCampaign(row, syncedAt) {
  const providerState = String(row.status || "unknown").toUpperCase();
  const parentState = String(
    row.platformCampaignStatus || providerState,
  ).toUpperCase();
  const isActive = providerState === "ACTIVE" && parentState === "ACTIVE";
  return {
    id: `meta-${row.platformAdAccountId || "account"}-${row.platformCampaignId}`,
    external_id: String(row.platformCampaignId),
    name: row.campaignName || row.name || String(row.platformCampaignId),
    status: parentState,
    effective_status: isActive
      ? "ACTIVE"
      : parentState === "ACTIVE"
        ? providerState
        : parentState,
    source: "meta",
    provider: "zernio",
    platform: row.platform,
    ad_account_id: row.platformAdAccountId || null,
    ad_account_name: row.platformAdAccountName || null,
    objective: row.platformObjective || row.objective || row.goal || null,
    start_time: row.schedule?.startDate || null,
    stop_time: row.schedule?.endDate || null,
    ad_count: row.adCount || 0,
    synced_at: syncedAt,
    broker_ids: [],
    weights: {},
    routing_enabled: false,
    daily_limit: null,
  };
}
export async function zernioGet(path, params, env, fetcher = fetch) {
  if (!env.ZERNIO_API_KEY)
    throw new IntegrationError(
      "A chave da Zernio não está configurada no servidor.",
      503,
    );
  const url = new URL(`${BASE}/${path}`);
  for (const [key, value] of Object.entries(params || {}))
    if (value !== undefined && value !== null && value !== "")
      url.searchParams.set(key, String(value));
  const response = await fetcher(url, {
    headers: { Authorization: `Bearer ${env.ZERNIO_API_KEY}` },
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok)
    throw new IntegrationError(
      response.status === 401
        ? "A autenticação da Zernio expirou. Atualize a chave no servidor."
        : response.status === 403
          ? "A conexão Zernio não tem acesso a anúncios. Confira as permissões da conta."
          : response.status === 429
            ? "A Zernio atingiu o limite temporário. Aguarde antes de sincronizar."
            : `Não foi possível consultar a Zernio (HTTP ${response.status}).`,
      response.status === 429 ? 429 : 502,
    );
  const data = await response.json();
  if (response.status === 202 || data.backfillPending)
    throw new IntegrationError(
      "A Zernio ainda está atualizando os dados. Tente sincronizar novamente em instantes.",
      503,
    );
  return data;
}
export async function discoverCampaignIds(env, fetcher = fetch) {
  // A local preview without server credentials can still inspect the provider list.
  if (!env.SUPABASE_URL && !env.SUPABASE_SERVICE_ROLE_KEY) return [];
  let projectUrl;
  try { projectUrl = new URL(env.SUPABASE_URL || ""); } catch { /* Report only a safe configuration error. */ }
  if (!projectUrl || projectUrl.protocol !== "https:" || !/^[a-z0-9]+\.supabase\.co$/.test(projectUrl.hostname) || projectUrl.username || projectUrl.password || projectUrl.search || projectUrl.hash || !["", "/"].includes(projectUrl.pathname) || !env.SUPABASE_SERVICE_ROLE_KEY)
    throw new IntegrationError("Configure a descoberta de campanhas no servidor.", 503);
  const response = await fetcher(new URL("/rest/v1/rpc/discover_zernio_campaign_ids", projectUrl), {
    method: "POST",
    headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, apikey: env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ p_account_id: env.ZERNIO_AD_ACCOUNT_ID, p_lookback_days: 90, p_limit: 500 }),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok)
    throw new IntegrationError("Não foi possível consultar os identificadores das campanhas recebidas. A sincronização foi interrompida para preservar as campanhas existentes.", 503);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length > 500 || rows.some((row) => typeof row?.campaign_id !== "string" || !/^\d{1,30}$/.test(row.campaign_id)))
    throw new IntegrationError("A descoberta retornou identificadores de campanha inválidos ou incompletos.");
  return [...new Set(rows.map((row) => row.campaign_id))];
}

export async function fetchCampaigns(env, fetcher = fetch) {
  const accountId = env.ZERNIO_ACCOUNT_ID;
  const adAccountId = env.ZERNIO_AD_ACCOUNT_ID;
  if (!accountId || !adAccountId)
    throw new IntegrationError(
      "Configure a conexão e a conta de anúncios da VilaVix no servidor.",
      503,
    );
  // Listing alone can omit campaigns that are already delivering leads.
  // Failure to recover any known ID must abort before persistence marks it absent.
  const discoveredIds = new Set(await discoverCampaignIds(env, fetcher));
  const rows = [];
  let page = 1;
  let pages = 1;
  do {
    const payload = await zernioGet(
      "ads/campaigns",
      { accountId, adAccountId, source: "all", limit: 100, page },
      env,
      fetcher,
    );
    if (!Array.isArray(payload.campaigns))
      throw new IntegrationError(
        "A Zernio retornou um catálogo de campanhas inválido.",
      );
    rows.push(...payload.campaigns);
    pages = Number(payload.pagination?.pages || 1);
    if (!Number.isInteger(pages) || pages < 1 || pages > 100)
      throw new IntegrationError(
        "A consulta excedeu o limite de páginas. Restrinja a conta de anúncios.",
      );
    page++;
  } while (page <= pages);
  const syncedAt = new Date().toISOString();
  const campaignsById = new Map(
      rows
        .filter(
          (r) =>
            r.platformCampaignId &&
            ["facebook", "instagram"].includes(r.platform),
        )
        .map((r) => [
          String(r.platformCampaignId),
          normalizeCampaign(r, syncedAt),
        ]),
    );
  // A cached aggregate cannot authorize routing after a campaign was paused.
  const candidates = [...new Set([
    ...discoveredIds,
    ...[...campaignsById.values()].filter((c) => c.effective_status === "ACTIVE").map((c) => c.external_id),
  ])];
  for (let offset = 0; offset < candidates.length; offset += 4) {
    await Promise.all(
      candidates.slice(offset, offset + 4).map(async (externalId) => {
        const result = await zernioGet(
          `ads/campaigns/${encodeURIComponent(externalId)}`,
          { accountId, fields: "id,name,account_id,status,effective_status,objective,start_time,stop_time" },
          env,
          fetcher,
        );
        const current = result.campaign;
        if (
          !current ||
          String(current.id) !== externalId ||
          !current.status ||
          !current.effective_status
        )
          throw new IntegrationError(
            "Não foi possível confirmar o estado atual de uma campanha conhecida. A sincronização foi interrompida para preservar o catálogo.",
          );
        const currentAccount = String(current.account_id || "").replace(/^act_/, "");
        if ((discoveredIds.has(externalId) && !currentAccount) || (currentAccount && currentAccount !== String(adAccountId).replace(/^act_/, "")))
          throw new IntegrationError("Não foi possível confirmar a conta de anúncios de uma campanha conhecida.");
        let campaign = campaignsById.get(externalId);
        if (!campaign) {
          if (typeof current.name !== "string" || !current.name.trim())
            throw new IntegrationError("A Zernio retornou metadados incompletos de uma campanha recebida.");
          campaign = normalizeCampaign({
            platformCampaignId: externalId, platformAdAccountId: adAccountId,
            platform: "facebook", campaignName: current.name, status: current.status,
            platformCampaignStatus: current.status, platformObjective: current.objective,
            schedule: { startDate: current.start_time, endDate: current.stop_time },
          }, syncedAt);
          campaignsById.set(externalId, campaign);
        }
        if (current.name) campaign.name = current.name;
        if (Object.hasOwn(current, "objective")) campaign.objective = current.objective || null;
        if (Object.hasOwn(current, "start_time")) campaign.start_time = current.start_time || null;
        if (Object.hasOwn(current, "stop_time")) campaign.stop_time = current.stop_time || null;
        campaign.status = String(current.status).toUpperCase();
        campaign.effective_status =
          campaign.status === "ACTIVE"
            ? String(current.effective_status).toUpperCase()
            : campaign.status;
      }),
    );
  }
  const campaigns = [...campaignsById.values()];
  return {
    campaigns,
    syncedAt,
    accountId,
    adAccountId,
    total: campaigns.length,
    active: campaigns.filter((c) => c.effective_status === "ACTIVE").length,
    provider: "zernio",
  };
}
