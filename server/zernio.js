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
export async function fetchCampaigns(env, fetcher = fetch) {
  const accountId = env.ZERNIO_ACCOUNT_ID;
  const adAccountId = env.ZERNIO_AD_ACCOUNT_ID;
  if (!accountId || !adAccountId)
    throw new IntegrationError(
      "Configure a conexão e a conta de anúncios da VilaVix no servidor.",
      503,
    );
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
    if (pages > 100)
      throw new IntegrationError(
        "A consulta excedeu o limite de páginas. Restrinja a conta de anúncios.",
      );
    page++;
  } while (page <= pages);
  const syncedAt = new Date().toISOString();
  const campaigns = [
    ...new Map(
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
    ).values(),
  ];
  // A cached aggregate cannot authorize routing after a campaign was paused.
  const candidates = campaigns.filter((c) => c.effective_status === "ACTIVE");
  for (let offset = 0; offset < candidates.length; offset += 4) {
    await Promise.all(
      candidates.slice(offset, offset + 4).map(async (campaign) => {
        const result = await zernioGet(
          `ads/campaigns/${encodeURIComponent(campaign.external_id)}`,
          { accountId, fields: "id,status,effective_status" },
          env,
          fetcher,
        );
        const current = result.campaign;
        if (
          !current ||
          String(current.id) !== campaign.external_id ||
          !current.status ||
          !current.effective_status
        )
          throw new IntegrationError(
            "Não foi possível confirmar o estado atual de uma campanha ativa. A distribuição permanece bloqueada até uma nova sincronização.",
          );
        campaign.status = String(current.status).toUpperCase();
        campaign.effective_status =
          campaign.status === "ACTIVE"
            ? String(current.effective_status).toUpperCase()
            : campaign.status;
      }),
    );
  }
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
