import React, { useState } from 'react';
import { MessageCircle, ChevronLeft, ChevronRight, X, Phone } from 'lucide-react';
import { PIPELINE_STAGES, PIPELINE_LABELS, STATUS_COLORS, ORIGIN_EMOJI, PRIORITY_COLORS, PRIORITY_LABELS, wppLink, wppLeadMsg, formatDate } from '../../utils/helpers.js';
import Badge from '../../components/Badge.jsx';

const COL_COLORS = {
  novo:        { bg: '#EFF6FF', header: '#DBEAFE', accent: '#3B82F6' },
  atendimento: { bg: '#F5F3FF', header: '#EDE9FE', accent: '#8B5CF6' },
  visita:      { bg: '#FFFBEB', header: '#FEF3C7', accent: '#F59E0B' },
  proposta:    { bg: '#FDF2F8', header: '#FCE7F3', accent: '#EC4899' },
  fechado:     { bg: '#F0FDF4', header: '#DCFCE7', accent: '#10B981' },
  // fallbacks para status fora do pipeline
  descartado:  { bg: '#F9FAFB', header: '#F3F4F6', accent: '#6B7280' },
  contato:     { bg: '#FFFBEB', header: '#FEF3C7', accent: '#F59E0B' },
};

// ── Lead Popup ────────────────────────────────────────────────────────────────
function LeadPopup({ lead, onClose, goToLead, comments, tasks }) {
  const stageIdx     = PIPELINE_STAGES.indexOf(lead.status);
  const leadComments = comments[lead.id] || [];
  const leadTasks    = tasks.filter(t => t.leadId === lead.id);
  const pendingTasks = leadTasks.filter(t => !t.concluida);
  // Garante cor mesmo para status fora do pipeline (descartado, legado)
  const colors = COL_COLORS[lead.status] || COL_COLORS.descartado;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: 480, padding: 0, overflow: 'hidden', animation: 'scaleUp 0.25s cubic-bezier(.22,1,.36,1)' }}
      >
        {/* Header strip */}
        <div style={{ background: colors.header, borderBottom: `3px solid ${colors.accent}`, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="avatar" style={{ width: 48, height: 48, fontSize: '1rem', background: colors.accent }}>
              {lead.nome.split(' ').slice(0,2).map(w=>w[0]).join('')}
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.15rem', marginBottom: 2 }}>{lead.nome}</h3>
              <p style={{ color: 'var(--text3)', fontSize: '0.78rem' }}>{lead.email}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Pipeline progress */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
              {PIPELINE_STAGES.map((s, i) => (
                <div key={s} title={PIPELINE_LABELS[s]}
                  style={{ flex: 1, height: 6, borderRadius: 4, background: i <= stageIdx ? STATUS_COLORS[s] : 'var(--bg3)', transition: 'background 0.3s' }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>Novo Lead</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: colors.accent }}>{PIPELINE_LABELS[lead.status]}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>Fechado</span>
            </div>
          </div>

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Telefone',   val: lead.telefone },
              { label: 'Orçamento',  val: lead.orcamento },
              { label: 'Origem',     val: `${ORIGIN_EMOJI[lead.origem]} ${lead.origem}` },
              { label: 'Prioridade', val: PRIORITY_LABELS[lead.prioridade] },
              { label: 'Corretor',   val: lead.corretor },
              { label: 'Desde',      val: formatDate(lead.data) },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text3)', marginBottom: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--navy)', fontWeight: 500 }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Imóvel de interesse */}
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text3)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Imóvel de interesse</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--navy)', fontWeight: 600 }}>{lead.interesse}</div>
          </div>

          {/* Counters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, textAlign: 'center', background: 'var(--bg)', borderRadius: 10, padding: '10px 0' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--navy)' }}>{leadComments.length}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>comentários</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', background: pendingTasks.length > 0 ? 'rgba(198,40,40,0.07)' : 'var(--bg)', borderRadius: 10, padding: '10px 0' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: pendingTasks.length > 0 ? 'var(--red)' : 'var(--navy)' }}>{pendingTasks.length}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>tarefas pendentes</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', background: 'var(--bg)', borderRadius: 10, padding: '10px 0' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--navy)' }}>{leadTasks.filter(t => t.concluida).length}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>concluídas</div>
            </div>
          </div>

          {/* Notes preview */}
          {lead.notas && (
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', marginBottom: 20, fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.6, fontStyle: 'italic' }}>
              "{lead.notas}"
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <a href={wppLink(lead.telefone, wppLeadMsg(lead.nome))} target="_blank" rel="noopener noreferrer"
              className="btn btn-wpp btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
              <MessageCircle size={14} /> WhatsApp
            </a>
            <a href={`tel:${lead.telefone}`} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
              <Phone size={14} /> Ligar
            </a>
            <button onClick={() => { goToLead(lead.id); onClose(); }}
              className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
              Ver detalhes →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Pipeline({ leads, setLeads, updateLead, goToLead, comments, tasks }) {
  const [popup, setPopup] = useState(null); // leadId

  // Filtra descartados — eles ficam só na aba Descartados de Leads
  const activeLeads = leads.filter(l => l.status !== 'descartado');

  const moveLeft = (leadId) => {
    const lead = leads.find(l => l.id === leadId);
    const idx  = PIPELINE_STAGES.indexOf(lead?.status);
    if (idx <= 0) return;
    updateLead(leadId, { status: PIPELINE_STAGES[idx - 1] });
  };

  const moveRight = (leadId) => {
    const lead = leads.find(l => l.id === leadId);
    const idx  = PIPELINE_STAGES.indexOf(lead?.status);
    if (idx >= PIPELINE_STAGES.length - 1) return;
    updateLead(leadId, { status: PIPELINE_STAGES[idx + 1] });
  };

  const popupLead = popup ? leads.find(l => l.id === popup) : null;

  return (
    <div style={{ padding: 24, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.4rem' }}>Pipeline de Vendas</h2>
        <p style={{ color: 'var(--text3)', fontSize: '0.82rem', marginTop: 2 }}>Gerencie seus leads por etapa do funil · Clique em um card para ver detalhes</p>
      </div>

      {/* Kanban */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, flex: 1, overflowX: 'auto', minWidth: 0 }}>
        {PIPELINE_STAGES.map(stage => {
          const stageLeads = activeLeads.filter(l => l.status === stage);
          const colors     = COL_COLORS[stage];

          return (
            <div key={stage} style={{ display: 'flex', flexDirection: 'column', minWidth: 220 }}>
              {/* Column header */}
              <div style={{ background: colors.header, borderRadius: '12px 12px 0 0', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `3px solid ${colors.accent}` }}>
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: colors.accent }}>{PIPELINE_LABELS[stage]}</span>
                <span style={{ width: 22, height: 22, borderRadius: 8, background: colors.accent, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700 }}>
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ flex: 1, background: colors.bg, borderRadius: '0 0 12px 12px', padding: '10px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 120 }}>
                {stageLeads.length === 0 && (
                  <div style={{ textAlign: 'center', color: colors.accent, opacity: 0.4, padding: '24px 8px', fontSize: '0.8rem' }}>Sem leads</div>
                )}

                {stageLeads.map(lead => {
                  const stageIdx = PIPELINE_STAGES.indexOf(stage);
                  const prColor  = PRIORITY_COLORS[lead.prioridade];
                  const leadPendingTasks = tasks ? tasks.filter(t => t.leadId === lead.id && !t.concluida).length : 0;

                  return (
                    <div key={lead.id}
                      onClick={() => setPopup(lead.id)}
                      style={{ background: 'white', borderRadius: 10, padding: '14px 12px', boxShadow: '0 2px 8px rgba(21,32,54,0.08)', border: `1px solid ${colors.header}`, cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(21,32,54,0.14)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(21,32,54,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      {/* Priority dot + name */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: prColor, flexShrink: 0, marginTop: 4 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.83rem', color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.nome}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.interesse}</div>
                        </div>
                        {/* Pending tasks badge */}
                        {leadPendingTasks > 0 && (
                          <span style={{ background: 'var(--red)', color: 'white', fontSize: '0.62rem', fontWeight: 700, minWidth: 17, height: 17, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {leadPendingTasks}
                          </span>
                        )}
                      </div>

                      {/* Origin + corretor */}
                      <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginBottom: 8 }}>
                        {ORIGIN_EMOJI[lead.origem]} {lead.origem} · {lead.corretor.split(' ')[0]}
                      </div>

                      {/* Budget */}
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: colors.accent, marginBottom: 10, background: colors.header, padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>
                        {lead.orcamento}
                      </div>

                      {/* Actions row */}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => moveLeft(lead.id)} disabled={stageIdx === 0} title="Mover para etapa anterior"
                          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--line2)', background: 'white', cursor: stageIdx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: stageIdx === 0 ? 0.3 : 1, transition: 'all 0.2s' }}>
                          <ChevronLeft size={12} />
                        </button>
                        <a href={wppLink(lead.telefone, wppLeadMsg(lead.nome))} target="_blank" rel="noopener noreferrer" title="WhatsApp"
                          style={{ flex: 1, height: 28, borderRadius: 7, background: '#25D366', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                          <MessageCircle size={12} />
                        </a>
                        <button onClick={() => moveRight(lead.id)} disabled={stageIdx === PIPELINE_STAGES.length - 1} title="Mover para próxima etapa"
                          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--line2)', background: 'white', cursor: stageIdx === PIPELINE_STAGES.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: stageIdx === PIPELINE_STAGES.length - 1 ? 0.3 : 1, transition: 'all 0.2s' }}>
                          <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lead Popup */}
      {popupLead && (
        <LeadPopup
          lead={popupLead}
          onClose={() => setPopup(null)}
          goToLead={goToLead}
          comments={comments || {}}
          tasks={tasks || []}
        />
      )}
    </div>
  );
}
