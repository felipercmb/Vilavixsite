import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Download,
  Phone,
  MessageCircle,
  Mail,
  Pencil,
  Trash2,
  ArrowRight,
  CalendarPlus,
  Clock,
  Check,
} from "lucide-react";
import {
  PageHeader,
  SearchBox,
  Empty,
  Badge,
  Field,
  Dialog,
  Alert,
  Avatar,
  STAGES,
  LABELS,
  today,
  date,
  matches,
  wpp,
  exportRows,
} from "./CRMUI.jsx";
import { filterPortfolio, isOpenLead, leadNeedsFollowup, nextLeadTask, searchProperties, saveLeadInteraction } from "../../lib/broker-workflow.js";
import "../../styles/crm-workflows.css";

function LeadForm({ lead, imoveis, corretoresList, onSave, onClose }) {
  const [form, setForm] = useState(
    lead || {
      nome: "",
      email: "",
      telefone: "",
      status: "novo",
      corretor: "",
      corretorId: null,
      origem: "Manual",
      prioridade: "media",
      interesse: "",
      orcamento: "",
      notas: "",
      data: today(),
    },
  );
  const [propertyQuery, setPropertyQuery] = useState("");
  const propertyResults = useMemo(() => searchProperties(imoveis, propertyQuery), [imoveis, propertyQuery]);
  const selectedProperty = imoveis.find((p) => String(p.codigo) === String(form.imovelRef) || String(p.id) === String(form.imovelId));
  const [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.nome.trim()) {
      setError("Informe o nome do contato.");
      return;
    }
    if (form.telefone && form.telefone.replace(/\D/g, "").length < 10) {
      setError("Informe um telefone com DDD.");
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, nome: form.nome.trim() });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog
      title={lead ? "Editar contato" : "Novo lead"}
      subtitle="Dados do contato e imóvel procurado."
      onClose={onClose}
      wide
    >
      <form onSubmit={submit}>
        <div className="crm-dialog-body">
          <Alert>{error}</Alert>
          <div className="crm-form-grid">
            <Field label="Nome completo *">
              <input
                value={form.nome || ""}
                onChange={(e) => set("nome", e.target.value)}
                required
                maxLength={150}
                autoComplete="name"
              />
            </Field>
            <Field label="E-mail">
              <input
                type="email"
                value={form.email || ""}
                onChange={(e) => set("email", e.target.value)}
                autoComplete="email"
              />
            </Field>
            <Field label="Telefone com DDD">
              <input
                type="tel"
                value={form.telefone || ""}
                onChange={(e) => set("telefone", e.target.value)}
                placeholder="(27) 99999-9999"
                autoComplete="tel"
              />
            </Field>
            <Field label="Origem">
              <select
                value={form.origem || "Manual"}
                onChange={(e) => set("origem", e.target.value)}
              >
                {[
                  "Manual",
                  "Site",
                  "WhatsApp",
                  "Meta Ads",
                  "Instagram",
                  "Facebook",
                  "Google",
                  "Indicação",
                  ...(form.origem &&
                  ![
                    "Manual",
                    "Site",
                    "WhatsApp",
                    "Meta Ads",
                    "Instagram",
                    "Facebook",
                    "Google",
                    "Indicação",
                  ].includes(form.origem)
                    ? [form.origem]
                    : []),
                ].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field label="Etapa do atendimento">
              <select
                value={form.status || "novo"}
                onChange={(e) => set("status", e.target.value)}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Responsável">
              <select
                value={
                  form.corretorId ||
                  corretoresList.find((c) => c.nome === form.corretor)?.id ||
                  ""
                }
                onChange={(e) => {
                  const c = corretoresList.find(
                    (c) => String(c.id) === e.target.value,
                  );
                  setForm((p) => ({
                    ...p,
                    corretor: c?.nome || "",
                    corretorId: c?.id || null,
                  }));
                }}
              >
                <option value="">Sem responsável</option>
                {corretoresList
                  .filter((c) => c.ativo !== false || c.nome === form.corretor)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
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
            <Field label="Orçamento informado">
              <input
                value={form.orcamento || ""}
                onChange={(e) => set("orcamento", e.target.value)}
                placeholder="Ex.: até R$ 900 mil"
              />
            </Field>
            <Field label="Imóvel de interesse" wide>
              <div className="crm-property-picker">
                {(selectedProperty || form.imovelRef || form.imovelId) && <div className="crm-selected-property"><span><strong>Ref. {selectedProperty?.codigo || form.imovelRef || form.imovelId}</strong> · {selectedProperty?.titulo || form.interesse}</span><button type="button" className="crm-link" onClick={() => setForm((f) => ({ ...f, imovelRef: null, imovelId: null }))}>Remover vínculo</button></div>}
                <input aria-label="Buscar imóvel por código, bairro ou título" value={propertyQuery} onChange={(e) => setPropertyQuery(e.target.value)} placeholder="Digite o código, bairro ou título do imóvel" autoComplete="off" />
                {propertyQuery.trim() && <div className="crm-property-options" aria-label="Imóveis encontrados">{propertyResults.map((p) => <button className="crm-property-option" key={p.id} type="button" onClick={() => { setForm((f) => ({ ...f, imovelId: p._imported ? null : p.id, imovelRef: p.codigo || null, interesse: p.titulo })); setPropertyQuery(""); }}>
                  {(p.img || p.fotos?.[0]) && <img src={p.img || p.fotos?.[0]} alt="" loading="lazy" />}<span><strong>{p.codigo} · {p.titulo}</strong><small>{[p.bairro, p.cidade].filter(Boolean).join(" · ")}</small></span>
                </button>)}{!propertyResults.length && <span className="crm-picker-hint">Nenhum imóvel encontrado. Tente outro código ou bairro.</span>}</div>}
                <span className="crm-picker-hint">{propertyResults.length === 12 ? "Mostrando até 12 imóveis. Refine a busca para encontrar o imóvel desejado." : "Busque no catálogo e selecione o imóvel para vincular ao contato."}</span>
              </div>
            </Field>
            <Field label="O que a pessoa procura" wide>
              <input
                value={form.interesse || ""}
                onChange={(e) => set("interesse", e.target.value)}
                placeholder="Tipo de imóvel, região e necessidades"
              />
            </Field>
            <Field label="Observações" wide>
              <textarea
                value={form.notas || ""}
                onChange={(e) => set("notas", e.target.value)}
                rows={3}
              />
            </Field>
          </div>
        </div>
        <footer className="crm-dialog-footer">
          <button type="button" className="crm-btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="crm-btn crm-btn-primary" disabled={saving}>
            {saving ? "Salvando…" : "Salvar contato"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
function LeadDetail({ lead, comments, tasks, corretoresList, onClose, onEdit, onDelete, updateLead, addComment, addTask, toggleTask }) {
  const [note, setNote] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false), [confirmDelete, setConfirmDelete] = useState(false);
  const [scheduleReturn, setScheduleReturn] = useState(true), [progress, setProgress] = useState({}), [savedMessage, setSavedMessage] = useState("");
  const [task, setTask] = useState({ titulo: `Retornar contato de ${lead.nome.split(" ")[0]}`, data: today(), hora: "09:00", tipo: "ligacao" });
  const run = async (fn) => { setError(""); setBusy(true); try { await fn(); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  const relatedTasks = tasks.filter((t) => String(t.leadId) === String(lead.id)).sort((a, b) => `${a.concluida ? 1 : 0}${a.data}${a.hora}`.localeCompare(`${b.concluida ? 1 : 0}${b.data}${b.hora}`));
  const upcoming = nextLeadTask(lead, tasks), link = wpp(lead.telefone);
  return <Dialog title={lead.nome} subtitle={`${lead.origem || "Origem não informada"} · Cadastro em ${date(lead.data)}`} onClose={onClose} wide>
    <div className="crm-dialog-body">
      <Alert>{error}</Alert>
      <div className="crm-actions"><Badge status={lead.status} /><span style={{ flex: 1 }} />{link && <a className="crm-btn" href={link} target="_blank" rel="noreferrer"><MessageCircle size={14} />WhatsApp</a>}{lead.telefone && <a className="crm-btn" href={`tel:${lead.telefone.replace(/\D/g, "")}`}><Phone size={14} />Ligar</a>}<button className="crm-btn" onClick={onEdit}><Pencil size={14} />Editar contato</button></div>
      <dl className="crm-details">
        <div><dt>Telefone</dt><dd>{lead.telefone || "Não informado"}</dd></div><div><dt>E-mail</dt><dd>{lead.email ? <a href={`mailto:${lead.email}`}>{lead.email}</a> : "Não informado"}</dd></div>
        <div><dt>Interesse</dt><dd>{lead.interesse || "Não informado"}{lead.imovelRef && ` · Ref. ${lead.imovelRef}`}</dd></div><div><dt>Orçamento informado</dt><dd>{lead.orcamento || "Não informado"}</dd></div>
      </dl>
      <div className="crm-form-grid">
        <Field label="Etapa"><select value={lead.status} disabled={busy} onChange={(e) => run(() => updateLead(lead.id, { status: e.target.value }))}>{STAGES.map((s) => <option key={s} value={s}>{LABELS[s]}</option>)}</select></Field>
        <Field label="Responsável"><select value={lead.corretorId || corretoresList.find((c) => c.nome === lead.corretor)?.id || ""} disabled={busy} onChange={(e) => { const broker = corretoresList.find((c) => String(c.id) === e.target.value); run(() => updateLead(lead.id, { corretor: broker?.nome || "", corretorId: broker?.id || null })); }}><option value="">Sem responsável</option>{corretoresList.filter((c) => c.ativo !== false || c.nome === lead.corretor).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Field>
      </div>
      <form className="crm-interaction" onSubmit={(e) => { e.preventDefault(); run(async () => { await saveLeadInteraction({ leadId: lead.id, note, followup: scheduleReturn ? task : null }, { addComment, addTask, onProgress: setProgress }, progress); setNote(""); setProgress({}); setSavedMessage(scheduleReturn ? "Atendimento registrado e retorno agendado." : "Atendimento registrado."); setScheduleReturn(false); }); }}>
        <h3>Registrar atendimento</h3>
        {savedMessage && <p className="crm-confirmed-note" role="status">{savedMessage}</p>}
        {progress.comment && <p className="crm-confirmed-note">A anotação já foi salva. Falta confirmar o agendamento abaixo.</p>}
        <Field label="O que foi conversado *"><textarea value={note} required disabled={busy || progress.comment} onChange={(e) => { setNote(e.target.value); setSavedMessage(""); }} placeholder="Ex.: enviadas 3 opções em Itaparica. Prefere 3 quartos e quer visitar sábado." rows={3} /></Field>
        <label className="crm-interaction-options"><input type="checkbox" checked={scheduleReturn} disabled={busy || progress.comment} onChange={(e) => setScheduleReturn(e.target.checked)} />Agendar retorno após este atendimento</label>
        {scheduleReturn && <div className="crm-form-grid">
          <Field label="Próxima atividade *" wide><input value={task.titulo} required disabled={busy} onChange={(e) => setTask((p) => ({ ...p, titulo: e.target.value }))} /></Field>
          <Field label="Data *"><input type="date" value={task.data} required disabled={busy} onChange={(e) => setTask((p) => ({ ...p, data: e.target.value }))} /></Field>
          <Field label="Horário *"><input type="time" value={task.hora} required disabled={busy} onChange={(e) => setTask((p) => ({ ...p, hora: e.target.value }))} /></Field>
          <Field label="Tipo de retorno"><select value={task.tipo} disabled={busy} onChange={(e) => setTask((p) => ({ ...p, tipo: e.target.value }))}><option value="ligacao">Ligação</option><option value="mensagem">WhatsApp</option><option value="visita">Visita</option><option value="email">E-mail</option><option value="geral">Tarefa</option></select></Field>
        </div>}
        <button className="crm-btn crm-btn-primary" disabled={busy || (!note.trim() && !progress.comment)}><Check size={14} />{busy ? "Salvando…" : progress.comment ? "Tentar agendar retorno" : scheduleReturn ? "Salvar atendimento e retorno" : "Salvar atendimento"}</button>
      </form>
      {relatedTasks.length > 0 && <><h3 className="crm-section-title">Retornos e visitas</h3>{relatedTasks.map((t) => <div key={t.id} className="crm-note crm-actions"><div style={{ flex: 1 }}><p style={{ textDecoration: t.concluida ? "line-through" : undefined }}>{t.titulo}</p><small>{date(t.data)} · {t.hora?.slice(0, 5) || "Sem horário"} · {t.concluida ? "Concluída" : t.data < today() ? "Em atraso" : "Pendente"}</small></div>{!t.concluida && toggleTask && <button className="crm-btn crm-btn-small" disabled={busy} onClick={() => run(() => toggleTask(t.id))}><Check size={13} />Concluir</button>}</div>)}</>}
      {!upcoming && isOpenLead(lead) && <p className="crm-next-task missing">Este contato está sem retorno agendado.</p>}
      {lead.notas && <><h3 className="crm-section-title">Observações do cadastro</h3><p className="crm-text-muted" style={{ whiteSpace: "pre-wrap" }}>{lead.notas}</p></>}
      <h3 className="crm-section-title">Histórico de atendimentos</h3>
      {!(comments[lead.id] || []).length ? <p className="crm-text-muted">Nenhum atendimento registrado.</p> : [...(comments[lead.id] || [])].reverse().map((c) => <div key={c.id} className="crm-note"><p style={{ whiteSpace: "pre-wrap" }}>{c.texto}</p><small>{c.autor} · {date(c.data)}</small></div>)}
    </div>
    <footer className="crm-dialog-footer">{confirmDelete ? <><span className="crm-text-muted" style={{ marginRight: "auto" }}>Excluir contato e histórico?</span><button className="crm-btn" onClick={() => setConfirmDelete(false)}>Cancelar</button><button className="crm-btn crm-btn-danger" disabled={busy} onClick={() => run(async () => { await onDelete(); onClose(); })}>Confirmar exclusão</button></> : <><button className="crm-btn crm-btn-danger" onClick={() => setConfirmDelete(true)} style={{ marginRight: "auto" }}><Trash2 size={14} />Excluir contato</button><button className="crm-btn" onClick={onClose}>Fechar</button></>}</footer>
  </Dialog>;
}
export default function Leads(props) {
  const { leads, tasks = [], corretoresList, focusLeadId, setFocusLeadId, currentProfile, portfolioScope = "all", setPortfolioScope, leadQueueFilter, setLeadQueueFilter } = props;
  const [needsReturn, setNeedsReturn] = useState(false);
  const [q, setQ] = useState(""),
    [stage, setStage] = useState(""),
    [broker, setBroker] = useState(""),
    [origin, setOrigin] = useState(""),
    [selected, setSelected] = useState(null),
    [editing, setEditing] = useState(null),
    [creating, setCreating] = useState(false),
    [page, setPage] = useState(1);
  useEffect(() => {
    if (!leadQueueFilter) return;
    setQ(""); setStage(leadQueueFilter === "new" ? "novo" : ""); setBroker(leadQueueFilter === "unassigned" ? "unassigned" : ""); setOrigin(""); setNeedsReturn(leadQueueFilter === "needs-return"); setPage(1);
    setLeadQueueFilter?.(null);
  }, [leadQueueFilter, setLeadQueueFilter]);
  useEffect(() => {
    if (focusLeadId) {
      setSelected(focusLeadId);
      setFocusLeadId(null);
    }
  }, [focusLeadId]);
  useEffect(() => setPage(1), [q, stage, broker, origin, needsReturn, portfolioScope]);
  const filtered = useMemo(
    () =>
      filterPortfolio(leads, portfolioScope, currentProfile).filter(
        (l) =>
          matches([l.nome, l.email, l.telefone, l.interesse, l.imovelRef].join(" "), q) &&
          (!needsReturn || leadNeedsFollowup(l, tasks)) &&
          (!stage || l.status === stage) &&
          (!broker ||
            (broker === "unassigned" ? !l.corretor && !l.corretorId : l.corretor === broker)) &&
          (!origin || l.origem === origin),
      ),
    [leads, tasks, q, stage, broker, origin, needsReturn, portfolioScope, currentProfile],
  );
  const selectedLead = leads.find((l) => String(l.id) === String(selected));
  const perPage = 15;
  const maxPage = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, maxPage);
  const visible = filtered.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );
  return (
    <>
      <PageHeader
        title="Contatos"
        description="Atendimentos, imóveis de interesse e retornos agendados."
        eyebrow="Carteira"
      >
        <button
          className="crm-btn"
          onClick={() =>
            exportRows(
              "vilavix-leads.csv",
              [
                "Nome",
                "E-mail",
                "Telefone",
                "Etapa",
                "Responsável",
                "Origem",
                "Interesse",
                "Cadastro",
              ],
              filtered.map((l) => [
                l.nome,
                l.email,
                l.telefone,
                LABELS[l.status],
                l.corretor,
                l.origem,
                l.interesse,
                l.data,
              ]),
            )
          }
        >
          <Download size={15} />
          Exportar
        </button>
        <button
          className="crm-btn crm-btn-primary"
          onClick={() => setCreating(true)}
        >
          <Plus size={16} />
          Novo lead
        </button>
      </PageHeader>
      <div className="crm-scope-bar">
        {setPortfolioScope && <div className="crm-tabs">{[["all", "Todos os contatos"], ["mine", "Minha carteira"], ["unassigned", "Sem responsável"]].map(([value, label]) => <button key={value} className={portfolioScope === value ? "active" : ""} onClick={() => { setPortfolioScope(value); setBroker(""); }}>{label}</button>)}</div>}
        <label className="crm-followup-filter"><input type="checkbox" checked={needsReturn} onChange={(e) => setNeedsReturn(e.target.checked)} />Sem retorno agendado ({filterPortfolio(leads, portfolioScope, currentProfile).filter((l) => leadNeedsFollowup(l, tasks)).length})</label>
      </div>
      <div className="crm-toolbar">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Buscar contato, telefone ou código do imóvel"
        />
        <select
          aria-label="Filtrar etapa"
          value={stage}
          onChange={(e) => setStage(e.target.value)}
        >
          <option value="">Todas as etapas</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {LABELS[s]}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar responsável"
          value={broker}
          onChange={(e) => setBroker(e.target.value)}
        >
          <option value="">Todos os responsáveis</option>
          <option value="unassigned">Sem responsável</option>
          {[
            ...new Set([
              ...corretoresList.map((c) => c.nome),
              ...leads.map((l) => l.corretor).filter(Boolean),
            ]),
          ].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Filtrar origem"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
        >
          <option value="">Todas as origens</option>
          {[...new Set(leads.map((l) => l.origem).filter(Boolean))]
            .sort()
            .map((o) => (
              <option key={o}>{o}</option>
            ))}
        </select>
        <span className="crm-result-count">
          {filtered.length} contato{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="crm-card">
        {visible.length ? (
          <>
            <div className="crm-table-wrap">
              <table className="crm-table">
                <thead>
                  <tr>
                    {[
                      "Contato",
                      "Interesse",
                      "Etapa",
                      "Responsável",
                      "Origem",
                      "Próximo retorno",
                      "",
                    ].map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <div className="crm-person">
                          <Avatar name={l.nome} />
                          <div>
                            <button
                              className="crm-link"
                              onClick={() => setSelected(l.id)}
                            >
                              {l.nome}
                            </button>
                            <small>
                              {l.telefone ||
                                l.email ||
                                "Contato ainda não informado"}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="crm-property-title">
                          {l.interesse || "A definir"}
                        </div>
                        <small>{l.orcamento}</small>
                      </td>
                      <td>
                        <Badge status={l.status} />
                      </td>
                      <td>
                        {l.corretor || (
                          <span className="crm-text-muted">
                            Sem responsável
                          </span>
                        )}
                      </td>
                      <td>{l.origem || "—"}</td>
                      <td>{(() => { const next = nextLeadTask(l, tasks); return next ? <div className={`crm-next-task ${next.data < today() ? "overdue" : ""}`}><span>{next.titulo}</span><small>{date(next.data)} · {next.hora?.slice(0, 5) || "Sem horário"}{next.data < today() && " · Em atraso"}</small></div> : <button className="crm-link crm-next-task missing" onClick={() => setSelected(l.id)}>{isOpenLead(l) ? "Agendar retorno" : "Atendimento encerrado"}</button>; })()}</td>
                      <td>
                        <button
                          className="crm-icon-btn"
                          aria-label={`Abrir ${l.nome}`}
                          onClick={() => setSelected(l.id)}
                        >
                          <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="crm-pagination">
              <span>
                {(currentPage - 1) * perPage + 1}–
                {Math.min(currentPage * perPage, filtered.length)} de{" "}
                {filtered.length} contatos
              </span>
              <div className="crm-actions">
                <button
                  className="crm-btn crm-btn-small"
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </button>
                <span>
                  {currentPage} / {maxPage}
                </span>
                <button
                  className="crm-btn crm-btn-small"
                  disabled={currentPage >= maxPage}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        ) : (
          <Empty
            title={
              leads.length
                ? "Nenhum contato corresponde aos filtros"
                : "Nenhum contato cadastrado"
            }
            text={
              leads.length
                ? "Ajuste a busca ou os filtros para encontrar o contato."
                : "Cadastre um lead para organizar seu atendimento e acompanhar cada etapa."
            }
          >
            <button
              className="crm-btn"
              onClick={() => {
                if (leads.length) {
                  setQ("");
                  setStage("");
                  setBroker("");
                  setOrigin("");
                  setNeedsReturn(false);
                  setPortfolioScope?.("all");
                } else setCreating(true);
              }}
            >
              {leads.length ? "Limpar filtros" : "Cadastrar primeiro lead"}
            </button>
          </Empty>
        )}
      </div>
      {selectedLead && !editing && (
        <LeadDetail
          key={selectedLead.id}
          {...props}
          lead={selectedLead}
          onClose={() => setSelected(null)}
          onEdit={() => setEditing(selectedLead)}
          onDelete={() => props.deleteLead(selectedLead.id)}
        />
      )}{" "}
      {(creating || editing) && (
        <LeadForm
          {...props}
          lead={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={(form) =>
            editing ? props.updateLead(editing.id, form) : props.addLead(form)
          }
        />
      )}
    </>
  );
}
