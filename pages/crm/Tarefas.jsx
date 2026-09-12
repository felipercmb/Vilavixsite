import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Check,
  Pencil,
  Trash2,
  CalendarDays,
  Clock,
  CheckSquare,
  RotateCcw,
  MessageCircle,
} from "lucide-react";
import {
  PageHeader,
  SearchBox,
  Empty,
  Stat,
  Badge,
  Field,
  Dialog,
  Alert,
  TYPES,
  today,
  date,
  matches,
  wpp,
} from "./CRMUI.jsx";
import { filterPortfolio, groupTasksByDay, postponeTaskDate } from "../../lib/broker-workflow.js";
import "../../styles/crm-workflows.css";

function TaskForm({ task, draft, leads, onSave, onClose, visitsOnly }) {
  const [form, setForm] = useState(
      task || {
        titulo: "",
        descricao: "",
        tipo: visitsOnly ? "visita" : "ligacao",
        leadId: null,
        data: today(),
        hora: "09:00",
        prioridade: "media",
        ...(draft || {}),
      },
    ),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <Dialog
      title={
        task
          ? "Editar atividade"
          : visitsOnly
            ? "Agendar visita"
            : "Nova atividade"
      }
      subtitle="Data, contato e detalhes da atividade."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError("");
          try {
            await onSave({ ...form, titulo: form.titulo.trim() });
            onClose();
          } catch (err) {
            setError(err.message);
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="crm-dialog-body">
          <Alert>{error}</Alert>
          <div className="crm-form-grid">
            <Field label="Título *" wide>
              <input
                required
                value={form.titulo}
                onChange={(e) => set("titulo", e.target.value)}
                maxLength={180}
                placeholder={
                  visitsOnly
                    ? "Ex.: visitar apartamento em Itaparica"
                    : "Ex.: retornar contato do cliente"
                }
              />
            </Field>
            <Field label="Tipo">
              <select
                value={form.tipo}
                onChange={(e) => set("tipo", e.target.value)}
                disabled={visitsOnly}
              >
                {Object.entries(TYPES).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Prioridade">
              <select
                value={form.prioridade || "media"}
                onChange={(e) => set("prioridade", e.target.value)}
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </Field>
            <Field label="Data *">
              <input
                type="date"
                required
                value={form.data || ""}
                onChange={(e) => set("data", e.target.value)}
              />
            </Field>
            <Field label="Horário *">
              <input
                type="time"
                required
                value={form.hora || ""}
                onChange={(e) => set("hora", e.target.value)}
              />
            </Field>
            <Field label="Contato relacionado" wide>
              <select
                value={form.leadId || ""}
                onChange={(e) =>
                  set(
                    "leadId",
                    leads.find((l) => String(l.id) === e.target.value)?.id ||
                      null,
                  )
                }
              >
                <option value="">Atividade geral, sem contato vinculado</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={
                visitsOnly
                  ? "Endereço, imóvel e instruções da visita"
                  : "Detalhes"
              }
              wide
            >
              <textarea
                value={form.descricao || ""}
                onChange={(e) => set("descricao", e.target.value)}
                rows={3}
              />
            </Field>
          </div>
        </div>
        <footer className="crm-dialog-footer">
          <button type="button" className="crm-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="crm-btn crm-btn-primary"
            disabled={saving || !form.titulo.trim()}
          >
            {saving
              ? "Salvando…"
              : task
                ? "Salvar alterações"
                : visitsOnly
                  ? "Agendar visita"
                  : "Criar atividade"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
function readAgendaFilters(key) {
  try { return JSON.parse(sessionStorage.getItem(key) || "{}"); } catch { return {}; }
}
export default function Tarefas({ tasks, leads, addTask, updateTask, deleteTask, toggleTask, goToLead, visitsOnly = false, currentProfile, portfolioScope = "all", setPortfolioScope, taskDraft, setTaskDraft, agendaFilter, setAgendaFilter }) {
  const filterKey = `vilavix:agenda-filters:${visitsOnly ? "visitas" : "tarefas"}:v1`;
  const [preferences] = useState(() => readAgendaFilters(filterKey));
  const [q, setQ] = useState(preferences.q || ""), [tab, setTab] = useState(preferences.tab || "pending"), [type, setType] = useState(preferences.type || ""), [selectedDate, setSelectedDate] = useState(preferences.selectedDate || "");
  const [editing, setEditing] = useState(null), [creating, setCreating] = useState(false), [draft, setDraft] = useState(null), [deleting, setDeleting] = useState(null), [busy, setBusy] = useState(null), [error, setError] = useState(""), [message, setMessage] = useState("");
  const day = today();
  useEffect(() => { try { sessionStorage.setItem(filterKey, JSON.stringify({ q, tab, type, selectedDate })); } catch {} }, [filterKey, q, tab, type, selectedDate]);
  useEffect(() => {
    if (!taskDraft) return;
    if (taskDraft.taskId) {
      const task = tasks.find((t) => String(t.id) === String(taskDraft.taskId));
      if (task) setEditing(task); else setError("Atividade não encontrada. Atualize os dados da agenda.");
    } else {
      const lead = leads.find((l) => String(l.id) === String(taskDraft.leadId));
      setDraft({ ...taskDraft, titulo: taskDraft.titulo || (lead ? `${taskDraft.tipo === "visita" ? "Visita com" : "Retornar contato de"} ${lead.nome}` : "") });
      setCreating(true);
    }
    setTaskDraft?.(null);
  }, [taskDraft, setTaskDraft, tasks, leads]);
  useEffect(() => { if (!agendaFilter) return; setTab(agendaFilter); setQ(""); setType(""); setSelectedDate(""); setAgendaFilter?.(null); }, [agendaFilter, setAgendaFilter]);
  const scopedIds = new Set(filterPortfolio(leads, portfolioScope, currentProfile).map((l) => String(l.id)));
  const base = tasks.filter((t) => (!visitsOnly || t.tipo === "visita") && (portfolioScope === "all" || !t.leadId || scopedIds.has(String(t.leadId))));
  const filtered = useMemo(() => base.filter((t) => matches([t.titulo, t.descricao, leads.find((l) => String(l.id) === String(t.leadId))?.nome].join(" "), q) && (!type || t.tipo === type) && (!selectedDate || t.data === selectedDate) && (tab === "all" || (tab === "done" ? t.concluida : !t.concluida && (tab === "today" ? t.data === day : tab === "overdue" ? t.data && t.data < day : true)))), [base, q, type, selectedDate, tab, leads, day]);
  const groups = groupTasksByDay(filtered);
  const run = async (id, fn) => { setBusy(id); setError(""); setMessage(""); try { await fn(); } catch (err) { setError(err.message); } finally { setBusy(null); } };
  const closeForm = () => { setCreating(false); setEditing(null); setDraft(null); };
  return <>
    <PageHeader title={visitsOnly ? "Visitas" : "Agenda"} eyebrow="Atendimento" description={visitsOnly ? "Horários, clientes e imóveis que serão visitados." : "Ligações, retornos e compromissos por dia."}>
      <button className="crm-btn crm-btn-primary" onClick={() => { setDraft(null); setCreating(true); }}><Plus size={15} />{visitsOnly ? "Agendar visita" : "Nova atividade"}</button>
    </PageHeader>
    <div className="crm-scope-bar">{setPortfolioScope && <div className="crm-tabs">{[["all", "Toda a equipe"], ["mine", "Minha carteira"], ["unassigned", "Sem responsável"]].map(([value, label]) => <button key={value} className={portfolioScope === value ? "active" : ""} onClick={() => setPortfolioScope(value)}>{label}</button>)}</div>}<span className="crm-result-count">{base.filter((t) => !t.concluida && t.data === day).length} para hoje · {base.filter((t) => !t.concluida && t.data && t.data < day).length} em atraso</span></div>
    <Alert>{error}</Alert>{message && <p role="status" className="crm-confirmed-note">{message}</p>}
    <div className="crm-toolbar"><div className="crm-tabs">{[["pending", "Pendentes"], ["today", "Hoje"], ["overdue", "Em atraso"], ["done", "Concluídas"], ["all", "Todas"]].map(([value, label]) => <button key={value} className={tab === value ? "active" : ""} onClick={() => { setTab(value); setSelectedDate(""); }}>{label}</button>)}</div></div>
    <div className="crm-toolbar">
      <SearchBox value={q} onChange={setQ} placeholder="Buscar atividade ou contato" />
      {!visitsOnly && <select aria-label="Filtrar tipo de atividade" value={type} onChange={(e) => setType(e.target.value)}><option value="">Todos os tipos</option>{Object.entries(TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}
      <input aria-label="Filtrar data" type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setTab("all"); }} />
      {(q || type || selectedDate) && <button className="crm-btn crm-btn-small" onClick={() => { setQ(""); setType(""); setSelectedDate(""); }}>Limpar filtros</button>}
      <span className="crm-result-count">{filtered.length} atividade{filtered.length !== 1 ? "s" : ""}</span>
    </div>
    {groups.length ? <div className="crm-agenda-days">{groups.map((group) => <section key={group.day} className={`crm-agenda-day ${group.day && group.day < day ? "overdue" : ""}`}>
      <header className="crm-agenda-day-heading"><CalendarDays size={16} /><h2>{group.day === day ? "Hoje" : group.day ? new Date(`${group.day}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) : "Sem data"}</h2><span>{group.tasks.length} atividade{group.tasks.length !== 1 ? "s" : ""}</span>{group.day && group.day < day && group.tasks.some((t) => !t.concluida) && <Badge status="alta">Em atraso</Badge>}</header>
      {group.tasks.map((t) => { const lead = leads.find((l) => String(l.id) === String(t.leadId)); const targetDate = postponeTaskDate(t.data, 1, day); return <article key={t.id} className={`crm-agenda-item ${t.concluida ? "done" : ""}`}>
        <button className={`crm-task-check ${t.concluida ? "checked" : ""}`} aria-label={`${t.concluida ? "Reabrir" : "Concluir"} ${t.titulo}`} disabled={busy === t.id} onClick={() => run(t.id, async () => { await toggleTask(t.id); setMessage(t.concluida ? "Atividade reaberta." : "Atividade concluída."); })}>{t.concluida && <Check size={13} />}</button>
        <time className="crm-agenda-time">{t.hora?.slice(0, 5) || "—"}</time>
        <div className="crm-agenda-copy"><button className="crm-link" onClick={() => setEditing(t)}>{t.titulo}</button><small><span>{TYPES[t.tipo] || t.tipo}</span>{lead ? <button className="crm-link" onClick={() => goToLead(lead.id)}>{lead.nome}</button> : <span>Atividade da equipe</span>}{t.prioridade === "alta" && <span>Prioridade alta</span>}</small>{t.descricao && <p>{t.descricao}</p>}</div>
        <div className="crm-actions">
          {lead && wpp(lead.telefone) && <a className="crm-icon-btn" href={wpp(lead.telefone)} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${lead.nome}`}><MessageCircle size={14} /></a>}
          {!t.concluida && <button className="crm-btn crm-btn-small" aria-label={`Adiar ${t.titulo} para ${date(targetDate)}`} disabled={busy === t.id} onClick={() => run(t.id, async () => { await updateTask(t.id, { data: targetDate }); setMessage(`Atividade reagendada para ${date(targetDate)} às ${t.hora?.slice(0, 5) || "horário não definido"}.`); })}><RotateCcw size={12} />{!t.data || t.data <= day ? "Amanhã" : "+1 dia"}</button>}
          <button className="crm-icon-btn" aria-label={`Editar ${t.titulo}`} onClick={() => setEditing(t)}><Pencil size={13} /></button><button className="crm-icon-btn" aria-label={`Excluir ${t.titulo}`} onClick={() => setDeleting(t)}><Trash2 size={13} /></button>
        </div>
      </article>; })}
    </section>)}</div> : <section className="crm-card"><Empty title="Nenhuma atividade nesta seleção" text="Ajuste os filtros ou agende uma atividade."><button className="crm-btn" onClick={() => setCreating(true)}>{visitsOnly ? "Agendar visita" : "Criar atividade"}</button></Empty></section>}
    {(creating || editing) && <TaskForm task={editing} draft={draft} leads={leads} visitsOnly={visitsOnly} onClose={closeForm} onSave={(t) => editing ? updateTask(editing.id, t) : addTask(t)} />}
    {deleting && <Dialog title="Excluir atividade?" subtitle={deleting.titulo} onClose={() => setDeleting(null)}><div className="crm-dialog-body"><p className="crm-text-muted">A atividade será removida da agenda.</p><Alert>{error}</Alert></div><footer className="crm-dialog-footer"><button className="crm-btn" onClick={() => setDeleting(null)}>Cancelar</button><button className="crm-btn crm-btn-danger" disabled={busy === deleting.id} onClick={() => run(deleting.id, async () => { await deleteTask(deleting.id); setDeleting(null); })}>Excluir atividade</button></footer></Dialog>}
  </>;
}
