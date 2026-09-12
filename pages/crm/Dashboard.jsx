import React, { useMemo, useState } from "react";
import { CalendarDays, Plus, Check, Clock3, ArrowRight, CalendarClock, Phone, MessageCircle, Building2 } from "lucide-react";
import { PageHeader, Badge, Avatar, Empty, today, date, TYPES, wpp } from "./CRMUI.jsx";
import { filterPortfolio, isOpenLead, nextTaskForLead } from "../../lib/broker-workflow.js";

function tomorrow() {
  const value = new Date(`${today()}T12:00:00`);
  value.setDate(value.getDate() + 1);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export default function Dashboard({ leads, tasks, setMenu, goToLead, toggleTask, updateTask, currentProfile, portfolioScope, openTaskDraft, setAgendaFilter, setLeadQueueFilter, demo }) {
  const [busy, setBusy] = useState(null);
  const [view, setView] = useState("today");
  const day = today();
  const scopedLeads = useMemo(() => filterPortfolio(leads, portfolioScope, currentProfile), [leads, portfolioScope, currentProfile]);
  const leadIds = useMemo(() => new Set(scopedLeads.map(lead => String(lead.id))), [scopedLeads]);
  const scopedTasks = tasks.filter(task => portfolioScope === "all" || !task.leadId || leadIds.has(String(task.leadId)));
  const pending = scopedTasks.filter(task => !task.concluida);
  const overdue = pending.filter(task => task.data && task.data < day).sort((a, b) => `${a.data}${a.hora || ""}`.localeCompare(`${b.data}${b.hora || ""}`));
  const todayTasks = scopedTasks.filter(task => task.data === day).sort((a, b) => `${a.hora || "23:59"}`.localeCompare(`${b.hora || "23:59"}`));
  const futureTasks = pending.filter(task => task.data > day).sort((a, b) => `${a.data}${a.hora || ""}`.localeCompare(`${b.data}${b.hora || ""}`));
  const unscheduled = scopedLeads.filter(lead => isOpenLead(lead) && !nextTaskForLead(lead.id, tasks));
  const newLeads = scopedLeads.filter(lead => lead.status === "novo");
  const agenda = view === "today" ? todayTasks : futureTasks;
  const act = async (id, action) => {
    setBusy(id);
    try { await action(); } catch { /* The shared persistence handler displays the error. */ }
    finally { setBusy(null); }
  };
  const showAgenda = (filter) => { setAgendaFilter(filter); setMenu("tarefas"); };
  const showContactQueue = (filter) => { setLeadQueueFilter(filter); setMenu("leads"); };
  const taskRow = (task, late = false) => {
    const lead = leads.find(item => String(item.id) === String(task.leadId));
    return <div className={`crm-day-task ${task.concluida ? "is-done" : ""}`} key={task.id}>
      <button className={`crm-task-check ${task.concluida ? "checked" : ""}`} disabled={busy === task.id} aria-label={`${task.concluida ? "Reabrir" : "Concluir"} ${task.titulo}`} onClick={() => act(task.id, () => toggleTask(task.id))}>{task.concluida && <Check size={14} />}</button>
      <div className={`crm-day-time ${late ? "is-late" : ""}`}><strong>{late || view === "upcoming" ? date(task.data) : task.hora || "Sem hora"}</strong><span>{late || view === "upcoming" ? task.hora || "Sem hora" : TYPES[task.tipo] || "Tarefa"}</span></div>
      <div className="crm-day-task-copy"><button className="crm-link" onClick={() => openTaskDraft(task.leadId, task.tipo, task.id)}>{task.titulo}</button><small>{lead ? <button className="crm-link" onClick={() => goToLead(lead.id)}>{lead.nome}</button> : "Atividade da equipe"}{lead?.interesse && <span>{lead.interesse}</span>}</small></div>
      <div className="crm-day-task-actions">{lead?.telefone && wpp(lead.telefone) && <a className="crm-icon-btn" href={wpp(lead.telefone)} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${lead.nome}`}><MessageCircle size={16} /></a>}{late && <button className="crm-btn crm-btn-small" disabled={busy === task.id} onClick={() => act(task.id, () => updateTask(task.id, { data: tomorrow() }))}>Para amanhã</button>}{lead && <button className="crm-icon-btn" aria-label={`Abrir atendimento de ${lead.nome}`} onClick={() => goToLead(lead.id)}><ArrowRight size={17} /></button>}</div>
    </div>;
  };
  return <>
    <PageHeader title="Meu dia" description={new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" })}>
      <button className="crm-btn" onClick={() => openTaskDraft("", "visita")}><Building2 size={16} />Agendar visita</button>
      <button className="crm-btn crm-btn-primary" onClick={() => openTaskDraft()}><Plus size={17} />Novo retorno</button>
    </PageHeader>
    <div className="crm-day-brief" aria-label="Resumo da carteira">
      <button onClick={() => showAgenda("overdue")} className={overdue.length ? "needs-attention" : ""}><Clock3 size={19} /><strong>{overdue.length}</strong><span>{overdue.length === 1 ? "atividade atrasada" : "atividades atrasadas"}</span><ArrowRight size={15} /></button>
      <button onClick={() => showAgenda("today")}><CalendarDays size={19} /><strong>{todayTasks.filter(task => !task.concluida).length}</strong><span>pendentes hoje</span><ArrowRight size={15} /></button>
      <button onClick={() => showContactQueue("new")}><Phone size={19} /><strong>{newLeads.length}</strong><span>no primeiro atendimento</span><ArrowRight size={15} /></button>
    </div>
    <div className="crm-daily-layout">
      <div className="crm-daily-main">
        {overdue.length > 0 && <section className="crm-card crm-overdue-card">
          <div className="crm-card-heading"><div><h2>Retornos em atraso <span className="crm-count">{overdue.length}</span></h2><p>Conclua o contato ou combine uma nova data.</p></div><button className="crm-link" onClick={() => showAgenda("overdue")}>Ver todos</button></div>
          {overdue.slice(0, 4).map(task => taskRow(task, true))}
        </section>}
        <section className="crm-card">
          <div className="crm-card-heading"><div><h2>Minha agenda</h2><p>{portfolioScope === "all" ? "Atividades de todos os contatos" : portfolioScope === "unassigned" ? "Atividades dos contatos sem corretor" : "Sua carteira e atividades gerais da equipe"}</p></div><button className="crm-icon-btn" aria-label="Adicionar atividade à agenda" onClick={() => openTaskDraft("", "geral")}><Plus size={19} /></button></div>
          <div className="crm-day-tabs" role="tablist" aria-label="Período da agenda"><button role="tab" aria-selected={view === "today"} className={view === "today" ? "active" : ""} onClick={() => setView("today")}>Hoje <span>{todayTasks.length}</span></button><button role="tab" aria-selected={view === "upcoming"} className={view === "upcoming" ? "active" : ""} onClick={() => setView("upcoming")}>Próximos dias <span>{futureTasks.length}</span></button></div>
          {agenda.length ? agenda.slice(0, 7).map(task => taskRow(task)) : <Empty title={view === "today" ? "Nenhuma atividade para hoje" : "Nenhuma atividade futura"} text="Agende o próximo contato ou uma visita."><button className="crm-btn crm-btn-small" onClick={() => openTaskDraft()}><Plus size={14} />Adicionar à agenda</button></Empty>}
          <div className="crm-day-footer"><span>{view === "today" ? `${todayTasks.filter(task => task.concluida).length} concluídas hoje` : `${futureTasks.length} atividades agendadas`}</span><button className="crm-link" onClick={() => showAgenda("all")}>Abrir agenda completa <ArrowRight size={14} /></button></div>
        </section>
        <section className="crm-card crm-incoming-card">
          <div className="crm-card-heading"><div><h2>Primeiro atendimento</h2><p>Contatos que ainda estão na etapa inicial.</p></div><span className="crm-count">{newLeads.length}</span></div>
          {newLeads.length ? newLeads.slice(0, 4).map(lead => <div className="crm-incoming-row" key={lead.id}><Avatar name={lead.nome} /><div><button className="crm-link" onClick={() => goToLead(lead.id)}>{lead.nome}</button><small>{lead.interesse || "Interesse não informado"}</small><span>{lead.origem || "Origem não informada"}{!lead.corretor && !lead.corretorId ? " · Sem corretor" : ""}</span></div><button className="crm-btn crm-btn-small" onClick={() => goToLead(lead.id)}>Atender <ArrowRight size={14} /></button></div>) : <Empty title="Nenhum contato aguardando" text="Novos contatos aparecem aqui até o início do atendimento." />}
        </section>
      </div>
      <aside className="crm-daily-aside">
        <section className="crm-card crm-next-step-card">
          <div className="crm-card-heading"><div><h2>Sem próximo passo <span className="crm-count">{unscheduled.length}</span></h2><p>Contatos em aberto sem uma atividade pendente.</p></div></div>
          {unscheduled.length ? unscheduled.slice(0, 5).map(lead => <div className="crm-next-step" key={lead.id}><div className="crm-next-step-title"><button className="crm-link" onClick={() => goToLead(lead.id)}>{lead.nome}</button><Badge status={lead.status} /></div><p>{lead.interesse || "Interesse não informado"}</p><button className="crm-btn crm-btn-small" onClick={() => openTaskDraft(lead.id, "ligacao")}><CalendarClock size={14} />Agendar retorno</button></div>) : <Empty title="Próximos passos definidos" text="Os contatos em aberto têm atividades agendadas." />}
          {unscheduled.length > 5 && <div className="crm-day-footer"><button className="crm-link" onClick={() => showContactQueue("needs-return")}>Ver contatos restantes <ArrowRight size={14} /></button></div>}
        </section>
        <div className="crm-daily-note"><CalendarClock size={19} /><p>Depois de cada atendimento, registre o que foi combinado e deixe o próximo retorno na agenda.</p></div>
      </aside>
    </div>
    {demo && <p className="crm-review-note">Esta agenda usa contatos de exemplo para você testar o atendimento.</p>}
  </>;
}
