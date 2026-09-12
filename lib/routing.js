export const routingDay = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
export function campaignEligibility(campaign, now = new Date()) {
  if (!campaign) return "Selecione uma campanha.";
  if (campaign.effective_status !== "ACTIVE")
    return "A campanha não está ativa na origem.";
  const time = +new Date(now);
  if (
    campaign.source === "meta" &&
    (!campaign.synced_at ||
      !Number.isFinite(+new Date(campaign.synced_at)) ||
      time - +new Date(campaign.synced_at) > 30 * 60 * 1000)
  )
    return "Sincronize as campanhas antes de distribuir leads.";
  if (campaign.start_time && +new Date(campaign.start_time) > time)
    return "A campanha ainda não começou.";
  if (campaign.stop_time && +new Date(campaign.stop_time) < time)
    return "O período da campanha terminou.";
  if (!campaign.routing_enabled) return "Ative a distribuição desta campanha.";
  return null;
}
export function routingPreview(campaign, brokers, history, now = new Date()) {
  const day = routingDay(now);
  const eligibleBrokers = (brokers || [])
    .filter(
      (b) =>
        b.ativo !== false &&
        !b.paused &&
        (campaign?.broker_ids || []).map(String).includes(String(b.id)),
    )
    .map((b) => {
      const assigned = (history || []).filter(
        (h) =>
          String(h.broker_id) === String(b.id) &&
          String(h.campaign_id) === String(campaign.id),
      );
      const assignedToday = assigned.filter(
        (h) => routingDay(h.assigned_at) === day,
      ).length;
      const weight = Number(campaign.weights?.[b.id] ?? 1);
      const capacity =
        campaign.daily_limit === null || campaign.daily_limit === undefined
          ? Infinity
          : Number(campaign.daily_limit);
      return {
        ...b,
        weight,
        assignedToday,
        assignedTotal: assigned.length,
        capacityRemaining: Math.max(0, capacity - assignedToday),
        lastAssigned: assigned.reduce(
          (max, h) => Math.max(max, +new Date(h.assigned_at)),
          0,
        ),
      };
    })
    .filter((b) => b.weight > 0 && b.capacityRemaining > 0)
    .sort(
      (a, b) =>
        a.assignedToday / a.weight - b.assignedToday / b.weight ||
        a.lastAssigned - b.lastAssigned ||
        String(a.id).localeCompare(String(b.id)),
    );
  const reason =
    campaignEligibility(campaign, now) ||
    (!eligibleBrokers.length
      ? "Nenhum corretor elegível: confira participantes, pausa e limite diário."
      : null);
  return {
    campaign,
    eligibleBrokers,
    nextBroker: reason ? null : eligibleBrokers[0],
    reason,
  };
}
