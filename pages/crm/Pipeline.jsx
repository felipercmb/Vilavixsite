import React, { useDeferredValue, useMemo, useRef, useState } from "react";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, List, Inbox } from "lucide-react";
import { PageHeader, SearchBox, LABELS, Avatar, Badge, Alert, date, today } from "./CRMUI.jsx";
import { indexNextTasks } from "../../lib/broker-workflow.js";
import { PIPELINE_STAGES, buildPipelineModel, getPipelinePage, isPipelineOpen, normalizePipelineStage } from "../../lib/pipeline-model.js";
import "../../styles/crm-workflows.css";
import "../../styles/crm-pipeline.css";

const PAGE_SIZE = 20;
const stageColors = { novo: "#6a7f91", atendimento: "#4f7d98", visita: "#8d7397", proposta: "#a57b3e", fechado: "#54816a", descartado: "#82868b" };
const count = (value) => value.toLocaleString("pt-BR");

function ColumnPagination({ pagination, label, onPage }) {
  return <footer className="crm-funnel-pagination">
    <span>{pagination.total ? `${count(pagination.start)}–${count(pagination.end)} de ${count(pagination.total)}` : "0 contatos"}</span>
    <div>
      <button className="crm-icon-btn" aria-label={`Página anterior em ${label}`} disabled={pagination.page === 1} onClick={() => onPage(pagination.page - 1)}><ChevronLeft size={15} /></button>
      <label><span className="crm-sr-only">Página em {label}</span><select value={pagination.page} disabled={pagination.pages === 1} onChange={(event) => onPage(Number(event.target.value))}>{Array.from({ length: pagination.pages }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} / {pagination.pages}</option>)}</select></label>
      <button className="crm-icon-btn" aria-label={`Próxima página em ${label}`} disabled={pagination.page >= pagination.pages} onClick={() => onPage(pagination.page + 1)}><ChevronRight size={15} /></button>
    </div>
  </footer>;
}

function LeadCard({ lead, nextTask, tasksReady, tasksLoading, saving, onMove, onOpen, onDragEnd }) {
  const stage = normalizePipelineStage(lead.status);
  const overdue = nextTask?.data && nextTask.data < today();
  return <article className="crm-lead-card" draggable={!saving} onDragStart={(event) => { event.dataTransfer.setData("application/x-vilavix-lead", String(lead.id)); event.dataTransfer.effectAllowed = "move"; }} onDragEnd={onDragEnd} aria-busy={saving === lead.id}>
    <div className="crm-funnel-card-meta"><Badge status={lead.prioridade}>{lead.prioridade === "alta" ? "Prioridade alta" : lead.origem || "Origem não informada"}</Badge><time>{date(lead.data)}</time></div>
    <h3><button className="crm-link" onClick={() => onOpen(lead.id)}>{lead.nome}</button></h3>
    <p className="crm-funnel-interest" title={lead.interesse || ""}>{lead.interesse || "Interesse não informado"}{lead.imovelRef && ` · Ref. ${lead.imovelRef}`}</p>
    {lead.orcamento && <p className="crm-card-budget"><span>Orçamento: </span>{lead.orcamento}</p>}
    {isPipelineOpen(lead) && <div className={`crm-card-return ${tasksReady && !nextTask ? "missing" : tasksReady && overdue ? "overdue" : ""}`}><CalendarDays size={13} /><span>{!tasksReady ? tasksLoading ? "Carregando retornos…" : "Agenda indisponível" : nextTask ? <>{date(nextTask.data)} · {nextTask.hora?.slice(0, 5) || "Sem horário"}{overdue && " · Em atraso"}<br />{nextTask.titulo}</> : "Sem retorno agendado"}</span></div>}
    <div className="crm-lead-card-footer"><Avatar name={lead.corretor || "—"} /><span>{lead.corretor || "Sem responsável"}</span><button className="crm-icon-btn" aria-label={`Abrir contato ${lead.nome}`} onClick={() => onOpen(lead.id)}><ArrowRight size={15} /></button></div>
    <label className="crm-funnel-stage-select"><span>Mover para</span><select aria-label={`Mover ${lead.nome} para etapa`} value={stage || ""} disabled={Boolean(saving)} onChange={(event) => onMove(lead.id, event.target.value)}>{!stage && <option value="" disabled>{lead.status || "Etapa não informada"}</option>}{PIPELINE_STAGES.map((value) => <option key={value} value={value}>{LABELS[value]}</option>)}</select></label>
  </article>;
}

export default function Pipeline({ leads = [], corretoresList = [], updateLead, goToLead, setMenu, tasks = [], currentProfile, tasksLoading = false, tasksError = null }) {
  const [scope, setScope] = useState("all"), [query, setQuery] = useState(""), [broker, setBroker] = useState("");
  const [origin, setOrigin] = useState(""), [priority, setPriority] = useState(""), [returnState, setReturnState] = useState(""), [sort, setSort] = useState("recent");
  const [pages, setPages] = useState({}), [dragOver, setDragOver] = useState(null), [saving, setSaving] = useState(null), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const columnRefs = useRef({}), bodyRefs = useRef({});
  const deferredQuery = useDeferredValue(query);
  const day = today(), tasksReady = !tasksLoading && !tasksError;
  const isAdmin = currentProfile?.role === "admin";
  const nextTasks = useMemo(() => indexNextTasks(tasks), [tasks]);
  const leadMap = useMemo(() => new Map(leads.map((lead) => [String(lead.id), lead])), [leads]);
  const brokerOptions = useMemo(() => {
    const options = corretoresList.map((person) => ({ value: `id:${person.id}`, name: person.nome }));
    const knownNames = new Set(corretoresList.map((person) => person.nome));
    for (const name of new Set(leads.map((lead) => lead.corretor).filter(Boolean))) if (!knownNames.has(name)) options.push({ value: `name:${name}`, name });
    return options.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [corretoresList, leads]);
  const origins = useMemo(() => [...new Set(leads.map((lead) => lead.origem).filter(Boolean))].sort(), [leads]);
  const brokerName = brokerOptions.find((option) => option.value === broker)?.name || "";
  const model = useMemo(() => buildPipelineModel(leads, nextTasks, { scope, profile: currentProfile, query: deferredQuery, broker, brokerName, origin, priority, returnState: tasksReady ? returnState : "", sort: !tasksReady && sort === "return" ? "recent" : sort, day }), [leads, nextTasks, scope, currentProfile, deferredQuery, broker, brokerName, origin, priority, returnState, sort, tasksReady, day]);
  const pageKey = JSON.stringify([scope, deferredQuery, broker, origin, priority, returnState, sort]);
  const effectivePages = pages.key === pageKey ? pages.values || {} : {};
  const hasFilters = Boolean(query || broker || origin || priority || returnState || scope !== "all");
  const pageTo = (stage, page) => { setPages({ key: pageKey, values: { ...effectivePages, [stage]: page } }); bodyRefs.current[stage]?.scrollTo({ top: 0 }); };
  const changeScope = (value) => { setScope(value); setBroker(""); };
  const clearFilters = () => { setQuery(""); setBroker(""); setOrigin(""); setPriority(""); setReturnState(""); setScope("all"); };
  const jumpToStage = (stage) => columnRefs.current[stage]?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest", inline: "start" });
  const move = async (id, status) => {
    const lead = leadMap.get(String(id));
    if (saving || !lead || !PIPELINE_STAGES.includes(status) || normalizePipelineStage(lead.status) === status) return;
    setSaving(lead.id); setError(""); setNotice("");
    try { await updateLead(lead.id, { status }); setNotice(`${lead.nome} movido para ${LABELS[status].toLowerCase()}.`); }
    catch (failure) { setError(failure.message || "Não foi possível mudar a etapa. Tente novamente."); }
    finally { setSaving(null); setDragOver(null); }
  };
  const renderCard = (lead) => <LeadCard key={lead.id} lead={lead} nextTask={nextTasks.get(String(lead.id))} tasksReady={tasksReady} tasksLoading={tasksLoading} saving={saving} onMove={move} onOpen={goToLead} onDragEnd={() => setDragOver(null)} />;
  const unknownPage = getPipelinePage(model.unknown, effectivePages.unknown, PAGE_SIZE);

  return <div className="crm-complete-pipeline">
    <PageHeader title="Funil completo" description="Todos os contatos disponíveis, do primeiro atendimento ao encerramento."><button className="crm-btn" onClick={() => setMenu("leads")}><List size={16} />Ver em lista</button></PageHeader>
    <Alert>{error}</Alert>
    {notice && <p className="crm-confirmed-note" role="status">{notice}</p>}
    {tasksError && <Alert>A agenda não pôde ser carregada. Os contatos continuam disponíveis; filtros e indicadores de retorno serão exibidos quando a conexão for restabelecida.</Alert>}
    <div className="crm-funnel-filters">
      <div className="crm-funnel-scope"><div className="crm-tabs" aria-label="Carteira exibida no funil">{[["all", isAdmin ? "Toda a equipe" : "Meus contatos disponíveis"], ["mine", "Minha carteira"], ["unassigned", "Sem responsável"]].map(([value, label]) => <button key={value} className={scope === value ? "active" : ""} aria-pressed={scope === value} onClick={() => changeScope(value)}>{label}</button>)}</div><span>{count(model.scopeTotal)} contatos disponíveis</span></div>
      <div className="crm-funnel-filter-grid">
        <SearchBox value={query} onChange={setQuery} placeholder="Nome, telefone, imóvel ou campanha" label="Buscar no funil completo" />
        <label><span>Responsável</span><select value={broker} aria-label="Responsável no funil" onChange={(event) => setBroker(event.target.value)} disabled={scope !== "all"}><option value="">Todos os responsáveis disponíveis</option>{brokerOptions.map((option) => <option key={option.value} value={option.value}>{option.name}</option>)}</select></label>
        <label><span>Origem</span><select value={origin} aria-label="Origem no funil" onChange={(event) => setOrigin(event.target.value)}><option value="">Todas as origens</option>{origins.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>Prioridade</span><select value={priority} aria-label="Prioridade no funil" onChange={(event) => setPriority(event.target.value)}><option value="">Todas</option><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></select></label>
        <label><span>Retorno</span><select value={returnState} aria-label="Retorno no funil" disabled={!tasksReady} onChange={(event) => setReturnState(event.target.value)}><option value="">{tasksLoading ? "Carregando agenda…" : tasksError ? "Agenda indisponível" : "Todos os contatos"}</option><option value="missing">Sem retorno agendado</option><option value="overdue">Com retorno em atraso</option><option value="scheduled">Com atividade pendente</option></select></label>
        <label><span>Ordenar cartões</span><select value={sort} aria-label="Ordenar cartões do funil" onChange={(event) => setSort(event.target.value)}><option value="recent">Cadastro mais recente</option><option value="oldest">Cadastro mais antigo</option><option value="priority">Prioridade alta primeiro</option><option value="return" disabled={!tasksReady}>Próximo retorno</option></select></label>
      </div>
      <div className="crm-funnel-filter-status"><span aria-live="polite">{query !== deferredQuery ? "Atualizando busca…" : `${count(model.total)} contatos ${hasFilters ? "nos filtros selecionados" : "no funil"}`}</span>{hasFilters && <button className="crm-link" onClick={clearFilters}>Limpar filtros</button>}<small>20 cartões por página em cada etapa</small></div>
    </div>
    <nav className="crm-funnel-stages" aria-label="Etapas do funil">{model.columns.map((column) => <button key={column.id} onClick={() => jumpToStage(column.id)} style={{ "--stage-accent": stageColors[column.id] }} aria-label={`Ir para ${LABELS[column.id]}: ${column.count} contatos`}><span>{LABELS[column.id]}</span><strong>{count(column.count)}</strong><small>{["fechado", "descartado"].includes(column.id) ? "Atendimentos encerrados" : tasksReady ? `${count(column.noReturnCount)} sem retorno` : tasksLoading ? "Carregando retornos…" : "Retornos indisponíveis"}</small></button>)}</nav>
    <p className="crm-funnel-board-hint">Escolha uma etapa acima para ir direto à coluna. Use “Mover para” no cartão ou arraste o contato para mudar de etapa.</p>
    <div className="crm-pipeline" role="region" aria-label="Quadro das seis etapas do funil" tabIndex={0} aria-busy={query !== deferredQuery}>
      {model.columns.map((column) => {
        const pagination = getPipelinePage(column.leads, effectivePages[column.id], PAGE_SIZE);
        return <section key={column.id} ref={(element) => { columnRefs.current[column.id] = element; }} className={`crm-pipeline-column ${dragOver === column.id ? "drag-over" : ""}`} aria-label={LABELS[column.id]} style={{ "--stage-accent": stageColors[column.id] }} onDragOver={(event) => { if (!saving && event.dataTransfer.types.includes("application/x-vilavix-lead")) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDragOver(column.id); } }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragOver(null); }} onDrop={(event) => { event.preventDefault(); move(event.dataTransfer.getData("application/x-vilavix-lead"), column.id); }}>
          <header className="crm-funnel-column-heading"><h2>{LABELS[column.id]}</h2><b>{count(column.count)}</b><small>{column.priorityCount ? `${count(column.priorityCount)} com prioridade alta` : ""}{tasksReady && column.overdueCount > 0 ? `${column.priorityCount ? " · " : ""}${count(column.overdueCount)} com retorno atrasado` : ""}</small></header>
          <div className="crm-funnel-column-body" ref={(element) => { bodyRefs.current[column.id] = element; }}>
            {pagination.items.length ? pagination.items.map(renderCard) : <div className="crm-funnel-column-empty"><Inbox size={22} /><p>{hasFilters ? "Nenhum contato nesta etapa com os filtros atuais." : "Nenhum contato nesta etapa."}</p></div>}
          </div>
          <ColumnPagination pagination={pagination} label={LABELS[column.id]} onPage={(page) => pageTo(column.id, page)} />
        </section>;
      })}
    </div>
    {model.unknown.length > 0 && <section className="crm-funnel-unknown crm-card"><header><h2>Etapas a revisar <span>{count(model.unknown.length)}</span></h2><p>Estes contatos têm uma etapa diferente das seis do funil. Abra o contato ou selecione a etapa correta abaixo.</p></header><div className="crm-funnel-unknown-cards">{unknownPage.items.map(renderCard)}</div><ColumnPagination pagination={unknownPage} label="Etapas a revisar" onPage={(page) => pageTo("unknown", page)} /></section>}
  </div>;
}
