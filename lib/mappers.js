/**
 * Converters entre formato do banco (snake_case) e formato do app (camelCase)
 */

// ── LEADS ────────────────────────────────────────────────────
export const dbToLead = (r) => ({
  id: r.id,
  nome: r.nome,
  email: r.email,
  telefone: r.telefone,
  interesse: r.interesse,
  imovelId: r.imovel_ref || r.imovel_id,
  campaignId: r.campaign_id,
  campanha: r.campanha,
  routingStatus: r.routing_status,
  routingReason: r.routing_reason,
  routingCampaignReference: r.routing_campaign_reference,
  corretorId: r.corretor_id,
  status: r.status,
  data: r.data,
  corretor: r.corretor,
  origem: r.origem,
  notas: r.notas,
  prioridade: r.prioridade,
  orcamento: r.orcamento,
  statusChangedAt: r.status_changed_at || null,
});

export const leadToDb = (l) => ({
  nome: l.nome,
  email: l.email,
  telefone: l.telefone,
  interesse: l.interesse,
  imovel_id: /^\d+$/.test(String(l.imovelId || "")) ? Number(l.imovelId) : null,
  ...(l.imovelId && !/^\d+$/.test(String(l.imovelId))
    ? { imovel_ref: String(l.imovelId) }
    : {}),
  ...(l.campaignId ? { campaign_id: l.campaignId } : {}),
  ...(l.corretorId ? { corretor_id: l.corretorId } : {}),
  status: l.status,
  data: l.data,
  corretor: l.corretor,
  origem: l.origem,
  notas: l.notas,
  prioridade: l.prioridade,
  orcamento: l.orcamento,
  status_changed_at: l.statusChangedAt || null,
});

// ── TASKS ────────────────────────────────────────────────────
export const dbToTask = (r) => ({
  id: r.id,
  tipo: r.tipo,
  titulo: r.titulo,
  descricao: r.descricao,
  leadId: r.lead_id,
  corretor: r.corretor,
  data: r.data,
  hora: r.hora,
  concluida: r.concluida,
  prioridade: r.prioridade,
  autoGerada: r.auto_gerada ?? false,
  exigeDecisao: r.exige_decisao ?? false,
  tipoAuto: r.tipo_auto || null,
  diaSequencia: r.dia_sequencia || null,
});

export const taskToDb = (t) => ({
  tipo: t.tipo,
  titulo: t.titulo,
  descricao: t.descricao,
  lead_id: t.leadId || null,
  ...(t.corretor !== undefined ? { corretor: t.corretor } : {}),
  data: t.data,
  hora: t.hora,
  concluida: t.concluida ?? false,
  prioridade: t.prioridade,
  auto_gerada: t.autoGerada ?? false,
  exige_decisao: t.exigeDecisao ?? false,
  tipo_auto: t.tipoAuto || null,
  dia_sequencia: t.diaSequencia || null,
});

// Updates must not send defaults for fields the user did not change.
export const taskChangesToDb = (changes) => {
  const columns = {
    tipo: "tipo", titulo: "titulo", descricao: "descricao", leadId: "lead_id",
    corretor: "corretor", data: "data", hora: "hora", concluida: "concluida",
    prioridade: "prioridade", autoGerada: "auto_gerada", exigeDecisao: "exige_decisao",
    tipoAuto: "tipo_auto", diaSequencia: "dia_sequencia",
  };
  const normalized = taskToDb(changes);
  return Object.fromEntries(Object.entries(columns)
    .filter(([key]) => Object.hasOwn(changes, key) && changes[key] !== undefined)
    .map(([, column]) => [column, normalized[column]]));
};

// ── COMMENTS ─────────────────────────────────────────────────
// DB: array de rows   →  App: objeto { leadId: [...] }
export const dbToComments = (rows) => {
  const grouped = {};
  (rows || []).forEach((r) => {
    const key = r.lead_id;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({
      id: r.id,
      texto: r.texto,
      autor: r.autor,
      data: r.created_at?.split("T")[0] || r.data,
    });
  });
  return grouped;
};

export const commentToDb = (leadId, texto, autor) => ({
  lead_id: leadId,
  texto,
  autor,
});

// ── PROFILES / CORRETORES ─────────────────────────────────────
export const dbToCorretor = (r) => ({
  id: r.id,
  nome: r.nome,
  email: r.email,
  telefone: r.telefone,
  creci: r.creci,
  esp: r.especialidade,
  foto: r.foto,
  role: r.role,
  ativo: r.ativo,
  vendas: r.vendas,
  comissao: r.comissao,
});
