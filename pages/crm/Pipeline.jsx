import React, { useMemo, useState } from "react";
import { ArrowRight, SlidersHorizontal, CalendarDays } from "lucide-react";
import {
  PageHeader,
  SearchBox,
  STAGES,
  LABELS,
  Avatar,
  Badge,
  Alert,
  date,
  matches,
} from "./CRMUI.jsx";
import { filterPortfolio, nextLeadTask, leadNeedsFollowup, isOpenLead } from "../../lib/broker-workflow.js";
import "../../styles/crm-workflows.css";

export default function Pipeline({
  leads,
  corretoresList,
  updateLead,
  goToLead,
  setMenu,
  tasks = [],
  currentProfile,
  portfolioScope = "all",
  setPortfolioScope,
}) {
  const [showClosed, setShowClosed] = useState(false), [needsReturn, setNeedsReturn] = useState(false);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [q, setQ] = useState(""),
    [broker, setBroker] = useState(""),
    [dragOver, setDragOver] = useState(null),
    [saving, setSaving] = useState(null),
    [error, setError] = useState("");
  const filtered = useMemo(
    () =>
      filterPortfolio(leads, portfolioScope, currentProfile).filter(
        (l) =>
          matches([l.nome, l.interesse, l.imovelRef, l.origem].join(" "), q) &&
          (!needsReturn || leadNeedsFollowup(l, tasks)) &&
          (!broker ||
            (broker === "unassigned" ? !l.corretor && !l.corretorId : l.corretor === broker)),
      ),
    [leads, tasks, q, broker, portfolioScope, currentProfile, needsReturn],
  );
  const move = async (id, status) => {
    const lead = leads.find((l) => String(l.id) === String(id));
    if (!lead || lead.status === status) return;
    setSaving(id);
    setError("");
    try {
      await updateLead(lead.id, { status });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
      setDragOver(null);
    }
  };
  return (
    <>
      <PageHeader
        title="Negociações"
        eyebrow="Funil"
        description="Contatos por etapa, com responsável e próximo retorno."
      >
        <button className="crm-btn" onClick={() => setMenu("leads")}>
          <SlidersHorizontal size={15} />
          Ver lista de contatos
        </button>
      </PageHeader>
      <Alert>{error}</Alert>
      <div className="crm-scope-bar">
        {setPortfolioScope && <div className="crm-tabs">{[["all", "Toda a equipe"], ["mine", "Minha carteira"], ["unassigned", "Sem responsável"]].map(([value, label]) => <button key={value} className={portfolioScope === value ? "active" : ""} onClick={() => { setPortfolioScope(value); setBroker(""); }}>{label}</button>)}</div>}
        <label className="crm-followup-filter"><input type="checkbox" checked={needsReturn} onChange={(e) => setNeedsReturn(e.target.checked)} />Sem retorno agendado</label>
      </div>
      <div className="crm-toolbar">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Buscar oportunidade"
        />
        <select
          aria-label="Filtrar corretor no funil"
          value={broker}
          onChange={(e) => setBroker(e.target.value)}
        >
          <option value="">Todos os corretores</option>
          <option value="unassigned">Sem responsável</option>
          {corretoresList.map((c) => (
            <option key={c.id} value={c.nome}>
              {c.nome}
            </option>
          ))}
        </select>
        <span className="crm-result-count">
          {filtered.filter((l) => showClosed || isOpenLead(l)).length} negociações
        </span>
        <label className="crm-followup-filter"><input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />Mostrar encerradas</label>
      </div>
      <div className="crm-pipeline" style={{ "--crm-stage-count": showClosed ? 6 : 4 }}>
        {STAGES.filter((stage) => showClosed || !["fechado", "descartado"].includes(stage)).map((stage) => {
          const items = filtered.filter((l) => l.status === stage);
          return (
            <section
              key={stage}
              className={`crm-pipeline-column ${dragOver === stage ? "drag-over" : ""}`}
              aria-label={LABELS[stage]}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(stage);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                move(e.dataTransfer.getData("text/plain"), stage);
              }}
            >
              <h2 className="crm-pipeline-heading">
                <Badge status={stage} />
                <b>{items.length}</b>
              </h2>
              {isOpenLead({status: stage}) && <div className="crm-stage-note"><span>{items.filter((l) => leadNeedsFollowup(l, tasks)).length} sem retorno</span><span>{items.filter((l) => l.prioridade === "alta").length} prioritárias</span></div>}
              {items.map((l) => (
                <article
                  className="crm-lead-card"
                  key={l.id}
                  draggable={!saving}
                  onDragStart={(e) =>
                    e.dataTransfer.setData("text/plain", String(l.id))
                  }
                  onDragEnd={() => setDragOver(null)}
                  aria-busy={saving === l.id}
                >
                  <div className="crm-actions">
                    <Badge status={l.prioridade}>
                      {l.prioridade === "alta"
                        ? "Alta prioridade"
                        : l.origem || "Contato"}
                    </Badge>
                    <small
                      style={{
                        marginLeft: "auto",
                        fontSize: 10,
                        color: "#8596a2",
                      }}
                    >
                      {date(l.data)}
                    </small>
                  </div>
                  <h3>
                    <button className="crm-link" onClick={() => goToLead(l.id)}>
                      {l.nome}
                    </button>
                  </h3>
                  <p>{l.interesse || "Interesse não informado"}{l.imovelRef && ` · Ref. ${l.imovelRef}`}</p>
                  {l.orcamento && <p className="crm-card-budget"><span>Orçamento: </span>{l.orcamento}</p>}
                  {isOpenLead(l) && (() => { const next = nextLeadTask(l, tasks); return <div className={`crm-card-return ${!next ? "missing" : next.data < day ? "overdue" : ""}`}><CalendarDays size={13} style={{ flexShrink: 0, marginTop: 2 }} /><span>{next ? <>{date(next.data)} · {next.hora?.slice(0, 5) || "Sem horário"}<br />{next.titulo}</> : "Sem retorno agendado"}</span></div>; })()}
                  <div className="crm-lead-card-footer">
                    <Avatar name={l.corretor || "—"} />
                    <span style={{ flex: 1 }}>
                      {l.corretor || "Sem responsável"}
                    </span>
                    <button
                      className="crm-icon-btn"
                      style={{ width: 24, height: 24 }}
                      aria-label={`Abrir contato ${l.nome}`}
                      onClick={() => goToLead(l.id)}
                    >
                      <ArrowRight size={12} />
                    </button>
                  </div>
                  <select
                    aria-label={`Mover ${l.nome} para etapa`}
                    value={l.status}
                    disabled={saving === l.id}
                    onChange={(e) => move(l.id, e.target.value)}
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {LABELS[s]}
                      </option>
                    ))}
                  </select>
                </article>
              ))}
              {!items.length && (
                <div className="crm-empty" style={{ padding: "40px 8px" }}>
                  <p style={{ fontSize: 11 }}>
                    Nenhuma oportunidade nesta etapa.
                  </p>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
