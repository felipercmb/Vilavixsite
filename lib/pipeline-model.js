import { filterPortfolio } from "./broker-workflow.js";

export const PIPELINE_STAGES = ["novo", "atendimento", "visita", "proposta", "fechado", "descartado"];
const fold = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const idOrder = new Intl.Collator("pt-BR", { numeric: true });
export function normalizePipelineStage(status) {
  const stage = fold(status);
  if (stage === "contato") return "atendimento";
  return PIPELINE_STAGES.includes(stage) ? stage : null;
}
export const isPipelineOpen = (lead) => !["fechado", "descartado"].includes(normalizePipelineStage(lead.status));

export function buildPipelineModel(leads, nextTasks, filters = {}) {
  const { scope = "all", profile, query = "", broker = "", brokerName = "", origin = "", priority = "", returnState = "", day = "", sort = "recent" } = filters;
  const scoped = filterPortfolio(leads, scope, profile);
  const queryTokens = fold(query).split(/\s+/).filter(Boolean);
  const columns = PIPELINE_STAGES.map((id) => ({ id, leads: [], count: 0, noReturnCount: 0, overdueCount: 0, priorityCount: 0 }));
  const byStage = new Map(columns.map((column) => [column.id, column]));
  const unknown = [];
  let total = 0;
  for (const lead of scoped) {
    const next = nextTasks.get(String(lead.id));
    const open = isPipelineOpen(lead);
    if (broker && (broker.startsWith("id:") ? (lead.corretorId ? String(lead.corretorId) !== broker.slice(3) : fold(lead.corretor) !== fold(brokerName)) : fold(lead.corretor) !== fold(broker.slice(5)))) continue;
    if (origin && lead.origem !== origin) continue;
    if (priority && lead.prioridade !== priority) continue;
    if (returnState === "missing" && (!open || next)) continue;
    if (returnState === "overdue" && (!open || !next?.data || next.data >= day)) continue;
    if (returnState === "scheduled" && (!open || !next)) continue;
    if (queryTokens.length) {
      const search = fold([lead.nome, lead.email, lead.telefone, String(lead.telefone || "").replace(/\D/g, ""), lead.interesse, lead.imovelRef, lead.imovelId, lead.campaignName, lead.campanha, lead.corretor].join(" "));
      if (!queryTokens.every((token) => search.includes(token))) continue;
    }
    total++;
    const column = byStage.get(normalizePipelineStage(lead.status));
    if (!column) { unknown.push(lead); continue; }
    column.leads.push(lead);
    column.count++;
    if (open && !next) column.noReturnCount++;
    if (open && next?.data && next.data < day) column.overdueCount++;
    if (lead.prioridade === "alta") column.priorityCount++;
  }
  const priorityRank = { alta: 0, media: 1, baixa: 2 };
  const sortLeads = (a, b) => {
    if (sort === "priority") {
      const rank = (priorityRank[a.prioridade] ?? 1) - (priorityRank[b.prioridade] ?? 1);
      if (rank) return rank;
    }
    if (sort === "return") {
      const first = nextTasks.get(String(a.id)), second = nextTasks.get(String(b.id));
      const rank = `${first?.data || "9999"} ${first?.hora || "23:59"}`.localeCompare(`${second?.data || "9999"} ${second?.hora || "23:59"}`);
      if (rank) return rank;
    }
    const aDate = String(a.data || a.created_at || "").slice(0, 10), bDate = String(b.data || b.created_at || "").slice(0, 10);
    const chronological = sort === "oldest" ? aDate.localeCompare(bDate) : bDate.localeCompare(aDate);
    return chronological || idOrder.compare(String(a.id), String(b.id));
  };
  for (const column of columns) column.leads.sort(sortLeads);
  unknown.sort(sortLeads);
  return { columns, unknown, total, scopeTotal: scoped.length };
}

export function getPipelinePage(items, requestedPage = 1, pageSize = 20) {
  const size = Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 20;
  const total = items.length, pages = Math.max(1, Math.ceil(total / size));
  const page = Math.max(1, Math.min(pages, Number.isFinite(Number(requestedPage)) ? Math.trunc(Number(requestedPage)) : 1));
  const offset = (page - 1) * size;
  return { items: items.slice(offset, offset + size), total, pages, page, start: total ? offset + 1 : 0, end: Math.min(offset + size, total) };
}
