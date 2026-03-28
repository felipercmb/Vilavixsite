import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, X, MessageCircle, Phone, Edit2, Check,
  Plus, Send, CheckSquare, Calendar, Instagram, Mail,
  Zap, AlertTriangle, UserCheck, UserX, Clock, Folder,
  ChevronRight, ArrowRight, RefreshCw,
} from 'lucide-react';
import { imoveis } from '../../data/imoveis.js';
import { TIPO_TASK } from '../../data/tasks.js';
import Badge from '../../components/Badge.jsx';
import {
  formatDate, wppLink, wppLeadMsg,
  PIPELINE_STAGES, ALL_STATUSES, PIPELINE_LABELS, STATUS_COLORS,
  ORIGIN_EMOJI, PRIORITY_COLORS, PRIORITY_LABELS,
} from '../../utils/helpers.js';
import { AUTOMATION_INFO, AUTOMATION_TIMELINE, daysBetween, TODAY } from '../../lib/automation.js';

const STATUSES = ['Todos', ...PIPELINE_STAGES];
const ORIGENS  = ['Todas', 'Site', 'WhatsApp', 'Instagram', 'Google', 'Indicação'];
const TIPO_ICON_MAP = { ligacao: Phone, mensagem: MessageCircle, visita: Calendar, instagram: Instagram, email: Mail, geral: CheckSquare };
const TIPOS_TASK_LIST = ['ligacao', 'mensagem', 'visita', 'instagram', 'email', 'geral'];

const TIPO_ICON = {
  ligacao:   Phone,
  mensagem:  MessageCircle,
  visita:    Calendar,
  instagram: Instagram,
  email:     Mail,
  geral:     CheckSquare,
};

// ── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'info',       label: 'Resumo'      },
  { id: 'automacao',  label: '⚡ Automação' },
  { id: 'comentarios',label: 'Comentários' },
  { id: 'tarefas',    label: 'Tarefas'     },
];

// ── Automation Panel ─────────────────────────────────────────────────────────
function AutomacaoPanel({ lead, tasks, updateLead }) {
  const info     = AUTOMATION_INFO[lead.status];
  const timeline = AUTOMATION_TIMELINE[lead.status] || [];
  const base     = lead.statusChangedAt || lead.data || TODAY();
  const days     = daysBetween(base);

  // Tarefas auto geradas para este lead
  const autoTasks = tasks.filter(t => t.leadId === lead.id && t.autoGerada);
  const pendingDecision = autoTasks.find(t => t.exigeDecisao && !t.concluida);

  if (!info) return (
    <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)', fontSize: '0.83rem' }}>
      Nenhuma automação configurada para este status.
    </div>
  );

  return (
    <div>
      {/* Active rule badge */}
      <div style={{ background: info.bg, borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Zap size={18} style={{ color: info.color, flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: info.color }}>{info.label}</div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text2)', marginTop: 2 }}>{info.descricao}</div>
        </div>
      </div>

      {/* Decision prompt — urgent */}
      {pendingDecision && (
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1.5px solid rgba(245,158,11,0.35)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={15} style={{ color: '#D97706' }} />
            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#D97706' }}>Decisão necessária</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text2)', lineHeight: 1.55, marginBottom: 12 }}>{pendingDecision.descricao}</p>
          {lead.status === 'novo' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => updateLead(lead.id, { status: 'atendimento' })}
                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: 'none', background: '#10B981', color: 'white', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <UserCheck size={13} /> Consegui contato
              </button>
              <button
                onClick={() => updateLead(lead.id, { status: 'descartado' })}
                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: 'none', background: '#6B7280', color: 'white', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <UserX size={13} /> Sem resposta
              </button>
            </div>
          )}
          {lead.status === 'proposta' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => updateLead(lead.id, { status: 'fechado' })}
                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: 'none', background: '#10B981', color: 'white', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Check size={13} /> Negócio fechado!
              </button>
              <button
                onClick={() => updateLead(lead.id, { status: 'descartado' })}
                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: 'none', background: '#6B7280', color: 'white', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <UserX size={13} /> Desistiu
              </button>
            </div>
          )}
        </div>
      )}

      {/* Timeline do fluxo */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          Linha do tempo — {days} dia{days !== 1 ? 's' : ''} neste status
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {timeline.map((step, i) => {
            const done   = days > step.dia;
            const active = days === step.dia;
            const tt     = TIPO_TASK[step.tipo] || TIPO_TASK.geral;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 9, background: active ? info.bg : 'transparent', border: active ? `1px solid ${info.color}30` : '1px solid transparent' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: done ? info.color : active ? `${info.color}30` : 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {done ? <Check size={11} color="white" /> : <span style={{ fontSize: '0.6rem', fontWeight: 700, color: done ? 'white' : 'var(--text3)' }}>{step.dia}</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: active ? 700 : 500, color: active ? info.color : done ? 'var(--text3)' : 'var(--navy)', textDecoration: done ? 'line-through' : 'none' }}>
                    Dia {step.dia}: {step.label}
                  </span>
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: tt.color, background: tt.bg, padding: '1px 6px', borderRadius: 99 }}>{tt.label}</span>
                {step.decisao && <span style={{ fontSize: '0.65rem', background: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>⚖️ decisão</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tarefas automáticas geradas */}
      {autoTasks.length > 0 && (
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            Tasks geradas automaticamente ({autoTasks.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {autoTasks.slice(0, 5).map(t => {
              const tt = TIPO_TASK[t.tipo] || TIPO_TASK.geral;
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'var(--bg)', opacity: t.concluida ? 0.5 : 1 }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, color: tt.color, background: tt.bg, padding: '1px 6px', borderRadius: 99, whiteSpace: 'nowrap' }}>{tt.label}</span>
                  <span style={{ flex: 1, fontSize: '0.75rem', color: 'var(--navy)', textDecoration: t.concluida ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titulo}</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text3)', whiteSpace: 'nowrap' }}>{t.data}</span>
                  {t.concluida && <Check size={11} color="#10B981" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick status change */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Mover para outro estágio</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ALL_STATUSES.filter(s => s !== lead.status).map(s => (
            <button key={s} onClick={() => updateLead(lead.id, { status: s })}
              style={{ padding: '4px 10px', borderRadius: 99, border: `1px solid ${STATUS_COLORS[s]}40`, background: `${STATUS_COLORS[s]}10`, color: STATUS_COLORS[s], fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowRight size={10} /> {PIPELINE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({
  lead, leads, onClose, updateLead,
  comments, addComment,
  tasks, toggleTask, addTask,
}) {
  const [tab, setTab]         = useState('info');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});

  // New comment
  const [novoComentario, setNovoComentario] = useState('');
  const comentariosEnd = useRef(null);

  // New task form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    titulo: '', tipo: 'ligacao', data: '2026-03-20', hora: '09:00', prioridade: 'media', descricao: '',
  });

  const leadComments = comments[lead.id] || [];
  const leadTasks    = tasks.filter(t => t.leadId === lead.id);
  const stageIdx     = PIPELINE_STAGES.indexOf(lead.status);

  // Enter edit mode
  const startEdit = () => {
    setEditForm({
      nome:       lead.nome,
      email:      lead.email,
      telefone:   lead.telefone,
      orcamento:  lead.orcamento,
      prioridade: lead.prioridade,
      status:     lead.status,
      corretor:   lead.corretor,
      imovelId:   lead.imovelId,
      interesse:  lead.interesse,
      origem:     lead.origem,
    });
    setEditMode(true);
  };

  const saveEdit = () => {
    // Sync interesse with imovelId
    const im = imoveis.find(i => i.id === Number(editForm.imovelId));
    updateLead(lead.id, {
      ...editForm,
      imovelId:  Number(editForm.imovelId),
      interesse: im ? im.titulo : editForm.interesse,
    });
    setEditMode(false);
  };

  const setF = (k, v) => setEditForm(p => ({ ...p, [k]: v }));

  const submitComment = () => {
    const txt = novoComentario.trim();
    if (!txt) return;
    addComment(lead.id, txt);
    setNovoComentario('');
    setTimeout(() => comentariosEnd.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const submitTask = () => {
    if (!taskForm.titulo.trim()) return;
    addTask({ ...taskForm, leadId: lead.id });
    setTaskForm({ titulo: '', tipo: 'ligacao', data: '2026-03-20', hora: '09:00', prioridade: 'media', descricao: '' });
    setShowTaskForm(false);
  };

  return (
    <div style={{ width: 380, borderLeft: '1px solid var(--line)', background: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'scaleUp 0.25s var(--ease) both' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.75rem', flexShrink: 0 }}>
            {lead.nome.split(' ').slice(0,2).map(w=>w[0]).join('')}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '0.9rem', lineHeight: 1.2 }}>{lead.nome}</div>
            <div style={{ color: 'var(--text3)', fontSize: '0.72rem' }}>{lead.email}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
          <X size={17} />
        </button>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <a href={wppLink(lead.telefone, wppLeadMsg(lead.nome))} target="_blank" rel="noopener noreferrer"
          className="btn btn-wpp btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: '0.78rem' }}>
          <MessageCircle size={13} /> WhatsApp
        </a>
        <a href={`tel:${lead.telefone}`} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: '0.78rem' }}>
          <Phone size={13} /> Ligar
        </a>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '10px 4px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '0.78rem', fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? 'var(--navy)' : 'var(--text3)',
              borderBottom: `2px solid ${tab === t.id ? 'var(--navy)' : 'transparent'}`,
              fontFamily: 'var(--font-body)', transition: 'all 0.2s',
            }}>
            {t.label}
            {t.id === 'tarefas' && leadTasks.length > 0 && (
              <span style={{ marginLeft: 4, background: 'var(--navy)', color: 'white', borderRadius: 10, padding: '1px 5px', fontSize: '0.65rem', fontWeight: 700 }}>
                {leadTasks.filter(t => !t.concluida).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

        {/* ── INFO TAB ── */}
        {tab === 'info' && (
          <div>
            {/* Edit toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dados do lead</span>
              {!editMode
                ? <button onClick={startEdit} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: '1px solid var(--line2)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text2)', fontFamily: 'var(--font-body)' }}>
                    <Edit2 size={11} /> Editar
                  </button>
                : <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setEditMode(false)} style={{ background: 'none', border: '1px solid var(--line2)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text3)', fontFamily: 'var(--font-body)' }}>Cancelar</button>
                    <button onClick={saveEdit} style={{ background: 'var(--navy)', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem', color: 'white', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Check size={11} /> Salvar
                    </button>
                  </div>
              }
            </div>

            {!editMode ? (
              <>
                {/* Info grid */}
                <div style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
                  {[
                    { label: 'Telefone',   val: lead.telefone },
                    { label: 'Imóvel',     val: lead.interesse },
                    { label: 'Orçamento',  val: lead.orcamento },
                    { label: 'Origem',     val: `${ORIGIN_EMOJI[lead.origem]} ${lead.origem}` },
                    { label: 'Corretor',   val: lead.corretor },
                    { label: 'Data',       val: formatDate(lead.data) },
                    { label: 'Prioridade', val: PRIORITY_LABELS[lead.prioridade] },
                  ].map(({ label, val }, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 14px', background: i % 2 === 0 ? 'var(--bg)' : 'white', gap: 12 }}>
                      <span style={{ color: 'var(--text3)', fontSize: '0.75rem', flexShrink: 0 }}>{label}</span>
                      <span style={{ color: 'var(--text)', fontSize: '0.75rem', fontWeight: 500, textAlign: 'right' }}>{val}</span>
                    </div>
                  ))}
                </div>

                {/* Pipeline progress */}
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pipeline</p>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                    {PIPELINE_STAGES.map((s, i) => (
                      <div key={s} title={PIPELINE_LABELS[s]} style={{ flex: 1, height: 6, borderRadius: 4, background: i <= stageIdx ? STATUS_COLORS[s] : 'var(--bg3)', transition: 'background 0.3s' }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>Novo Lead</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: STATUS_COLORS[lead.status] }}>{PIPELINE_LABELS[lead.status]}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>Fechado</span>
                  </div>
                </div>

                {/* Notas do corretor */}
                {lead.notas && (
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notas</p>
                    <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.65 }}>
                      {lead.notas}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* EDIT FORM */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Nome',      key: 'nome',      type: 'text' },
                  { label: 'E-mail',    key: 'email',     type: 'email' },
                  { label: 'Telefone',  key: 'telefone',  type: 'text' },
                  { label: 'Orçamento', key: 'orcamento', type: 'text' },
                  { label: 'Corretor',  key: 'corretor',  type: 'text' },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>{label}</label>
                    <input type={type} className="input" value={editForm[key] || ''} onChange={e => setF(key, e.target.value)} style={{ fontSize: '0.83rem' }} />
                  </div>
                ))}

                {/* Imóvel de interesse */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Imóvel de interesse</label>
                  <select className="select" value={editForm.imovelId || ''} onChange={e => setF('imovelId', e.target.value)} style={{ width: '100%', fontSize: '0.83rem' }}>
                    <option value="">— Selecionar —</option>
                    {imoveis.map(im => <option key={im.id} value={im.id}>{im.titulo}</option>)}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Status no pipeline</label>
                  <select className="select" value={editForm.status || ''} onChange={e => setF('status', e.target.value)} style={{ width: '100%', fontSize: '0.83rem' }}>
                    {ALL_STATUSES.map(s => <option key={s} value={s}>{PIPELINE_LABELS[s]}</option>)}
                  </select>
                </div>

                {/* Prioridade */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Prioridade</label>
                  <select className="select" value={editForm.prioridade || ''} onChange={e => setF('prioridade', e.target.value)} style={{ width: '100%', fontSize: '0.83rem' }}>
                    {['alta','media','baixa'].map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                  </select>
                </div>

                {/* Origem */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Origem</label>
                  <select className="select" value={editForm.origem || ''} onChange={e => setF('origem', e.target.value)} style={{ width: '100%', fontSize: '0.83rem' }}>
                    {['Site','WhatsApp','Instagram','Google','Indicação'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── AUTOMAÇÃO TAB ── */}
        {tab === 'automacao' && (
          <AutomacaoPanel lead={lead} tasks={tasks} updateLead={updateLead} />
        )}

        {/* ── COMENTÁRIOS TAB ── */}
        {tab === 'comentarios' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {leadComments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>
                <MessageCircle size={32} style={{ opacity: 0.2, display: 'block', margin: '0 auto 8px' }} />
                <p style={{ fontSize: '0.82rem' }}>Nenhum comentário ainda.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                {leadComments.map(c => (
                  <div key={c.id} style={{ background: 'var(--bg)', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--navy)' }}>{c.autor}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>{formatDate(c.data)}</span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{c.texto}</p>
                  </div>
                ))}
                <div ref={comentariosEnd} />
              </div>
            )}

            {/* Add comment */}
            <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
              <textarea
                className="input"
                placeholder="Escrever comentário..."
                value={novoComentario}
                onChange={e => setNovoComentario(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                rows={3}
                style={{ resize: 'none', fontSize: '0.83rem', marginBottom: 8 }}
              />
              <button
                onClick={submitComment}
                disabled={!novoComentario.trim()}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem', opacity: novoComentario.trim() ? 1 : 0.5 }}
              >
                <Send size={13} /> Enviar comentário
              </button>
            </div>
          </div>
        )}

        {/* ── TAREFAS TAB ── */}
        {tab === 'tarefas' && (
          <div>
            {/* Task list */}
            {leadTasks.length === 0 && !showTaskForm && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)', marginBottom: 16 }}>
                <CheckSquare size={28} style={{ opacity: 0.2, display: 'block', margin: '0 auto 8px' }} />
                <p style={{ fontSize: '0.82rem' }}>Nenhuma tarefa para este lead.</p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {leadTasks.map(task => {
                const tt       = TIPO_TASK[task.tipo] || TIPO_TASK.geral;
                const TipoIcon = TIPO_ICON[task.tipo] || CheckSquare;
                return (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--bg)', opacity: task.concluida ? 0.55 : 1 }}>
                    <button
                      onClick={() => toggleTask(task.id)}
                      style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${task.concluida ? tt.color : 'var(--line2)'}`, background: task.concluida ? tt.color : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginTop: 1, transition: 'all 0.2s' }}
                    >
                      {task.concluida && <Check size={9} strokeWidth={3} color="white" />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--navy)', textDecoration: task.concluida ? 'line-through' : 'none' }}>{task.titulo}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 5, background: tt.bg, fontSize: '0.68rem', fontWeight: 600, color: tt.color }}>
                          <TipoIcon size={9} /> {tt.label}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>{task.data} · {task.hora}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add task button / form */}
            {!showTaskForm ? (
              <button onClick={() => setShowTaskForm(true)} style={{ width: '100%', padding: '9px', borderRadius: 10, border: '1.5px dashed var(--line2)', background: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'var(--font-body)', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.color = 'var(--navy)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line2)'; e.currentTarget.style.color = 'var(--text3)'; }}
              >
                <Plus size={14} /> Nova tarefa para este lead
              </button>
            ) : (
              <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input className="input" placeholder="Título da tarefa *" value={taskForm.titulo} onChange={e => setTaskForm(p=>({...p, titulo: e.target.value}))} style={{ fontSize: '0.82rem' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <select className="select" value={taskForm.tipo} onChange={e => setTaskForm(p=>({...p, tipo: e.target.value}))} style={{ fontSize: '0.8rem' }}>
                    {TIPOS_TASK_LIST.map(t => <option key={t} value={t}>{TIPO_TASK[t].label}</option>)}
                  </select>
                  <select className="select" value={taskForm.prioridade} onChange={e => setTaskForm(p=>({...p, prioridade: e.target.value}))} style={{ fontSize: '0.8rem' }}>
                    {['alta','media','baixa'].map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                  </select>
                  <input type="date" className="input" value={taskForm.data} onChange={e => setTaskForm(p=>({...p, data: e.target.value}))} style={{ fontSize: '0.8rem' }} />
                  <input type="time" className="input" value={taskForm.hora} onChange={e => setTaskForm(p=>({...p, hora: e.target.value}))} style={{ fontSize: '0.8rem' }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowTaskForm(false)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid var(--line2)', background: 'none', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'var(--font-body)', color: 'var(--text3)' }}>Cancelar</button>
                  <button onClick={submitTask} disabled={!taskForm.titulo.trim()} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.78rem', opacity: taskForm.titulo.trim() ? 1 : 0.5 }}>
                    <Plus size={12} /> Adicionar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Descartados View ──────────────────────────────────────────────────────────
function DescartadosView({ leads, tasks, updateLead, setSelected }) {
  const disc = leads.filter(l => l.status === 'descartado');

  if (!disc.length) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>
      <RefreshCw size={36} style={{ opacity: 0.15, display: 'block', margin: '0 auto 12px' }} />
      <p style={{ fontSize: '0.88rem' }}>Nenhum lead descartado.</p>
      <p style={{ fontSize: '0.78rem', marginTop: 4 }}>Quando um lead for descartado, aparecerá aqui com a campanha automática de reativação.</p>
    </div>
  );

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(107,114,128,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Folder size={17} style={{ color: '#6B7280' }} />
        </div>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.1rem' }}>Leads Descartados</h3>
          <p style={{ color: 'var(--text3)', fontSize: '0.75rem' }}>{disc.length} lead{disc.length !== 1 ? 's' : ''} · Campanha de reativação ativa</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {disc.map(lead => {
          const base      = lead.statusChangedAt || lead.data || TODAY();
          const days      = daysBetween(base);
          const leadTasks = tasks.filter(t => t.leadId === lead.id && t.autoGerada && t.tipo === 'email');
          const nextFolder = leadTasks.find(t => !t.concluida);
          const doneFolder = leadTasks.filter(t => t.concluida).length;

          return (
            <div key={lead.id} className="card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div className="avatar" style={{ width: 38, height: 38, fontSize: '0.72rem', background: '#6B7280' }}>
                  {lead.nome.split(' ').slice(0,2).map(w=>w[0]).join('')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.nome}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{lead.interesse} · {lead.corretor}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Descartado há</div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#6B7280' }}>{days} dias</div>
                </div>
              </div>

              {/* Folder progress */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text3)', marginBottom: 5 }}>
                  <span>Campanha de folders ({doneFolder} enviados)</span>
                  {nextFolder && <span style={{ color: '#6B7280', fontWeight: 600 }}>Próximo: {nextFolder.data}</span>}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[15, 30, 45, 60].map((d, i) => (
                    <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: days >= d ? '#6B7280' : 'var(--bg3)', transition: 'background 0.3s' }} title={`Folder ${i+1} - dia ${d}`} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.63rem', color: 'var(--text4)', marginTop: 3 }}>
                  <span>15d</span><span>30d</span><span>45d</span><span>60d→mensal</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { updateLead(lead.id, { status: 'atendimento' }); }}
                  style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: 'none', background: 'rgba(139,92,246,0.10)', color: '#7C3AED', fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <RefreshCw size={12} /> Reativar
                </button>
                <button onClick={() => setSelected(lead.id)}
                  style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--line2)', background: 'white', color: 'var(--text2)', fontSize: '0.73rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <ChevronRight size={12} /> Ver detalhes
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Leads({
  leads, updateLead, addLead, deleteLead,
  tasks, toggleTask, addTask,
  comments, addComment,
  focusLeadId, setFocusLeadId,
}) {
  const [subTab,   setSubTab]   = useState('ativos');   // 'ativos' | 'descartados'
  const [busca,    setBusca]    = useState('');
  const [status,   setStatus]   = useState('Todos');
  const [origem,   setOrigem]   = useState('Todas');
  const [imovelF,  setImovelF]  = useState('Todos');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (focusLeadId) {
      const lead = leads.find(l => l.id === focusLeadId);
      if (lead?.status === 'descartado') setSubTab('descartados');
      else setSubTab('ativos');
      setSelected(focusLeadId);
      setFocusLeadId(null);
    }
  }, [focusLeadId, setFocusLeadId]);

  const ativos = useMemo(() => leads.filter(l => l.status !== 'descartado'), [leads]);

  const filtered = useMemo(() => {
    return ativos.filter((l) => {
      if (status !== 'Todos' && l.status !== status) return false;
      if (origem !== 'Todas' && l.origem !== origem) return false;
      if (imovelF !== 'Todos' && l.imovelId !== Number(imovelF)) return false;
      if (busca) {
        const q = busca.toLowerCase();
        if (!`${l.nome} ${l.email} ${l.interesse} ${l.corretor}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [ativos, busca, status, origem, imovelF]);

  const selectedLead   = selected ? leads.find(l => l.id === selected) : null;
  const discartadosCount = leads.filter(l => l.status === 'descartado').length;

  // Leads com decisão pendente (alertas)
  const withDecision = ativos.filter(l => tasks.some(t => t.leadId === l.id && t.exigeDecisao && !t.concluida));

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Main panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 28px 0', background: 'white', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.4rem' }}>Leads</h2>
              <p style={{ color: 'var(--text3)', fontSize: '0.82rem', marginTop: 2 }}>
                {ativos.length} ativos · {discartadosCount} descartados
              </p>
            </div>
            {withDecision.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10 }}>
                <AlertTriangle size={14} style={{ color: '#D97706' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#D97706' }}>{withDecision.length} lead{withDecision.length > 1 ? 's' : ''} aguardando decisão</span>
              </div>
            )}
          </div>

          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: 2 }}>
            {[
              { id: 'ativos', label: `Ativos (${ativos.length})`, Icon: UserCheck },
              { id: 'descartados', label: `Descartados (${discartadosCount})`, Icon: Folder },
            ].map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setSubTab(id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: '0.84rem', fontWeight: subTab === id ? 700 : 400, color: subTab === id ? 'var(--navy)' : 'var(--text3)', background: 'none', border: 'none', borderBottom: `2px solid ${subTab === id ? 'var(--navy)' : 'transparent'}`, cursor: 'pointer', fontFamily: 'var(--font-body)', marginBottom: -1, transition: 'all 0.15s' }}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* DESCARTADOS */}
        {subTab === 'descartados' ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <DescartadosView leads={leads} tasks={tasks} updateLead={updateLead} setSelected={setSelected} />
          </div>
        ) : (
          <>
            {/* Filters */}
            <div style={{ padding: '12px 28px', background: 'white', borderBottom: '1px solid var(--line)', display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
              <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 260 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                <input className="input" placeholder="Buscar lead..." value={busca} onChange={e => setBusca(e.target.value)} style={{ paddingLeft: 36, height: 38 }} />
              </div>
              <select className="select" value={status} onChange={e => setStatus(e.target.value)} style={{ height: 38, flex: '1 1 140px', maxWidth: 180 }}>
                {STATUSES.map(s => <option key={s} value={s}>{s === 'Todos' ? 'Todos os status' : PIPELINE_LABELS[s]}</option>)}
              </select>
              <select className="select" value={origem} onChange={e => setOrigem(e.target.value)} style={{ height: 38, flex: '1 1 140px', maxWidth: 180 }}>
                {ORIGENS.map(o => <option key={o} value={o}>{o === 'Todas' ? 'Todas as origens' : o}</option>)}
              </select>
              <select className="select" value={imovelF} onChange={e => setImovelF(e.target.value)} style={{ height: 38, flex: '1 1 160px', maxWidth: 220 }}>
                <option value="Todos">Todos os imóveis</option>
                {imoveis.map(im => <option key={im.id} value={im.id}>{im.titulo}</option>)}
              </select>
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
                    {['Lead', 'Contato', 'Imóvel de Interesse', 'Origem', 'Prioridade', 'Status / Auto', 'Ação'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text3)', fontSize: '0.75rem', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(lead => {
                    const prColor    = PRIORITY_COLORS[lead.prioridade];
                    const isSelected = selected === lead.id;
                    const autoInfo   = AUTOMATION_INFO[lead.status];
                    const hasDecision = tasks.some(t => t.leadId === lead.id && t.exigeDecisao && !t.concluida);
                    return (
                      <tr key={lead.id}
                        onClick={() => setSelected(isSelected ? null : lead.id)}
                        style={{ borderBottom: '1px solid var(--line)', cursor: 'pointer', background: isSelected ? 'rgba(21,32,54,0.04)' : 'white', transition: 'background 0.15s' }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(21,32,54,0.04)' : 'white'; }}
                      >
                        <td style={{ padding: '11px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="avatar" style={{ width: 34, height: 34, fontSize: '0.7rem', flexShrink: 0 }}>
                              {lead.nome.split(' ').slice(0,2).map(w=>w[0]).join('')}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {lead.nome.split(' ').slice(0,2).join(' ')}
                                {hasDecision && <AlertTriangle size={11} style={{ color: '#D97706', flexShrink: 0 }} />}
                              </div>
                              <div style={{ color: 'var(--text3)', fontSize: '0.72rem' }}>{lead.corretor}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '11px 16px', color: 'var(--text2)', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>{lead.telefone}</td>
                        <td style={{ padding: '11px 16px', maxWidth: 180 }}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)', fontSize: '0.82rem' }}>{lead.interesse}</div>
                        </td>
                        <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: 'var(--text2)', fontSize: '0.82rem' }}>{ORIGIN_EMOJI[lead.origem]} {lead.origem}</span>
                        </td>
                        <td style={{ padding: '11px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: prColor, display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.77rem', color: prColor, fontWeight: 500 }}>{PRIORITY_LABELS[lead.prioridade]}</span>
                          </div>
                        </td>
                        <td style={{ padding: '11px 16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <Badge status={lead.status} />
                            {autoInfo && (
                              <span style={{ fontSize: '0.62rem', fontWeight: 600, color: autoInfo.color, background: autoInfo.bg, padding: '1px 6px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 3, width: 'fit-content' }}>
                                <Zap size={8} /> {autoInfo.label}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '11px 16px' }}>
                          <a href={wppLink(lead.telefone, wppLeadMsg(lead.nome))} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ width: 30, height: 30, borderRadius: 8, background: '#25D366', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                            <MessageCircle size={13} />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text3)', fontSize: '0.85rem' }}>
                  Nenhum lead encontrado com os filtros selecionados.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Detail panel */}
      {selectedLead && (
        <DetailPanel
          lead={selectedLead}
          leads={leads}
          onClose={() => setSelected(null)}
          updateLead={updateLead}
          comments={comments}
          addComment={addComment}
          tasks={tasks}
          toggleTask={toggleTask}
          addTask={addTask}
        />
      )}
    </div>
  );
}
