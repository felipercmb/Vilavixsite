import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
} from 'recharts';
import {
  MessageCircle, Phone, Mail, TrendingUp, Users, DollarSign,
  ChevronLeft, X, Pencil, Trash2, Plus, Check, Shield,
  ShieldCheck, UserCheck, CheckSquare, Star, AlertCircle,
  ToggleLeft, ToggleRight, Save, ArrowUpRight, ArrowDownRight,
  Building2, Target,
} from 'lucide-react';
import { TIPO_TASK } from '../../data/tasks.js';
import { formatCurrency, formatCurrencyShort, wppLink } from '../../utils/helpers.js';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const WEEK_START = '2026-03-16';
const WEEK_END   = '2026-03-22';

const RANK_COLOR = ['#F59E0B', '#6366F1', '#10B981'];
const RANK_MEDAL = ['🥇', '🥈', '🥉'];

// Mock historical monthly data per corretor (deterministic)
const HISTORY = {
  1: [
    { mes: 'Out', vendas: 3, leads: 10, tarefas: 18, concluidas: 15 },
    { mes: 'Nov', vendas: 4, leads: 12, tarefas: 20, concluidas: 18 },
    { mes: 'Dez', vendas: 4, leads: 11, tarefas: 16, concluidas: 14 },
    { mes: 'Jan', vendas: 5, leads: 14, tarefas: 22, concluidas: 20 },
    { mes: 'Fev', vendas: 4, leads: 11, tarefas: 18, concluidas: 16 },
    { mes: 'Mar', vendas: 5, leads: 13, tarefas: 12, concluidas: 7  },
  ],
  2: [
    { mes: 'Out', vendas: 3, leads: 8,  tarefas: 16, concluidas: 12 },
    { mes: 'Nov', vendas: 2, leads: 7,  tarefas: 14, concluidas: 11 },
    { mes: 'Dez', vendas: 4, leads: 10, tarefas: 18, concluidas: 15 },
    { mes: 'Jan', vendas: 3, leads: 9,  tarefas: 16, concluidas: 13 },
    { mes: 'Fev', vendas: 4, leads: 10, tarefas: 18, concluidas: 15 },
    { mes: 'Mar', vendas: 4, leads: 9,  tarefas: 14, concluidas: 8  },
  ],
  3: [
    { mes: 'Out', vendas: 2, leads: 6,  tarefas: 12, concluidas: 9  },
    { mes: 'Nov', vendas: 2, leads: 7,  tarefas: 14, concluidas: 10 },
    { mes: 'Dez', vendas: 2, leads: 6,  tarefas: 12, concluidas: 10 },
    { mes: 'Jan', vendas: 3, leads: 8,  tarefas: 16, concluidas: 13 },
    { mes: 'Fev', vendas: 2, leads: 7,  tarefas: 14, concluidas: 12 },
    { mes: 'Mar', vendas: 3, leads: 8,  tarefas: 10, concluidas: 6  },
  ],
};

// Fallback history for dynamically added corretores
const fallbackHistory = (id) => {
  const seed = id % 5 + 1;
  return ['Out','Nov','Dez','Jan','Fev','Mar'].map((mes, i) => ({
    mes, vendas: seed + (i % 3), leads: seed * 2 + i,
    tarefas: seed * 4 + i * 2, concluidas: seed * 3 + i,
  }));
};

const getHistory = (id) => HISTORY[id] || fallbackHistory(id);

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function matchCorretor(c, leadCorretor) {
  return c.nome.startsWith(leadCorretor);
}

function useCorretorStats(c, leads, tasks) {
  return useMemo(() => {
    const myLeads   = leads.filter(l => matchCorretor(c, l.corretor));
    const myIds     = new Set(myLeads.map(l => l.id));
    const weekTasks = tasks.filter(t =>
      t.data >= WEEK_START && t.data <= WEEK_END &&
      t.leadId !== null && myIds.has(t.leadId)
    );
    const weekDone  = weekTasks.filter(t => t.concluida);
    const weekPct   = weekTasks.length ? Math.round((weekDone.length / weekTasks.length) * 100) : 0;

    const byTipo = {};
    weekTasks.forEach(t => { byTipo[t.tipo] = (byTipo[t.tipo] || { total: 0, done: 0 }); byTipo[t.tipo].total++; if (t.concluida) byTipo[t.tipo].done++; });

    const leadsAtivos  = myLeads.filter(l => l.status !== 'fechado').length;
    const leadsPropos  = myLeads.filter(l => l.status === 'proposta').length;
    const leadsFechados= myLeads.filter(l => l.status === 'fechado').length;

    const byStatus = {};
    myLeads.forEach(l => { byStatus[l.status] = (byStatus[l.status] || 0) + 1; });

    const totalVendas = c.vendas;
    const history     = getHistory(c.id);
    const lastMonth   = history[history.length - 1];
    const prevMonth   = history[history.length - 2];
    const trendVendas = prevMonth ? lastMonth.vendas - prevMonth.vendas : 0;

    return {
      myLeads, myIds, weekTasks, weekDone, weekPct,
      byTipo, leadsAtivos, leadsPropos, leadsFechados,
      byStatus, totalVendas, history, trendVendas,
    };
  }, [c, leads, tasks]);
}

// ─────────────────────────────────────────────────────────────
// Chart tooltips
// ─────────────────────────────────────────────────────────────
const BarTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--navy)', color: 'white', padding: '8px 14px', borderRadius: 8, fontSize: '0.78rem' }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CorretorCard (Equipe tab)
// ─────────────────────────────────────────────────────────────
function CorretorCard({ c, rank, leads, tasks, selected, onClick }) {
  const s = useCorretorStats(c, leads, tasks);
  const color = RANK_COLOR[rank] || '#6B7280';
  const totalVendasEquipe = 33; // mock total da equipe

  return (
    <div
      onClick={onClick}
      className="card"
      style={{
        padding: 0, overflow: 'hidden', cursor: 'pointer',
        border: selected ? `2px solid ${color}` : '1px solid var(--line)',
        transform: selected ? 'scale(1.01)' : 'scale(1)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ height: 4, background: color }} />
      <div style={{ padding: '22px 24px' }}>

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700, color: 'white', fontFamily: 'var(--font-display)', boxShadow: `0 0 0 3px ${color}30` }}>
              {c.foto}
            </div>
            <span style={{ position: 'absolute', bottom: -4, right: -4, fontSize: '0.9rem' }}>{RANK_MEDAL[rank] || ''}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nome}</div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text3)', marginTop: 1 }}>{c.esp}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
              {c.role === 'admin' && (
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#7C3AED', background: 'rgba(124,58,237,0.10)', padding: '1px 7px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <ShieldCheck size={9} /> Admin
                </span>
              )}
              <span style={{ fontSize: '0.65rem', color: c.ativo !== false ? '#059669' : '#DC2626', background: c.ativo !== false ? 'rgba(16,185,129,0.10)' : 'rgba(220,38,38,0.10)', padding: '1px 7px', borderRadius: 99, fontWeight: 600 }}>
                {c.ativo !== false ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color, lineHeight: 1 }}>{c.vendas}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text3)' }}>vendas</div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Leads',      value: s.myLeads.length, color: '#3B82F6' },
            { label: 'Propostas',  value: s.leadsPropos,    color: '#EC4899' },
            { label: 'Comissão',   value: `R$${Math.round(c.comissao/1000)}k`, color: '#10B981' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 6px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.63rem', color: 'var(--text3)', marginTop: 3 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Task progress this week */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: '0.73rem', fontWeight: 500, color: 'var(--navy)' }}>Tarefas semana</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>
              {s.weekDone.length}/{s.weekTasks.length} · <span style={{ color: s.weekPct >= 70 ? '#059669' : s.weekPct >= 40 ? '#D97706' : '#DC2626', fontWeight: 600 }}>{s.weekPct}%</span>
            </span>
          </div>
          <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${s.weekPct}%`, background: s.weekPct >= 70 ? '#10B981' : s.weekPct >= 40 ? '#F59E0B' : '#EF4444', borderRadius: 4 }} />
          </div>
        </div>

        {/* Market share */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text3)' }}>
          <span>Market share</span>
          <span style={{ fontWeight: 700, color }}>{Math.round((c.vendas / totalVendasEquipe) * 100)}%</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Detail Panel (Equipe tab — right side)
// ─────────────────────────────────────────────────────────────
function DetailPanel({ c, rank, leads, tasks, corretoresList, onClose, onEdit }) {
  const s     = useCorretorStats(c, leads, tasks);
  const color = RANK_COLOR[rank] || '#6B7280';
  const [tab, setTab] = useState('performance');

  const comparData = ['Out','Nov','Dez','Jan','Fev','Mar'].map((mes, i) => {
    const row = { mes };
    corretoresList.forEach(cc => {
      const h = getHistory(cc.id);
      row[cc.nome.split(' ')[0]] = h[i]?.vendas || 0;
    });
    return row;
  });

  const statusLabels = { novo: 'Novo', contato: 'Contato', visita: 'Visita', proposta: 'Proposta', fechado: 'Fechado' };
  const statusColors = { novo: '#3B82F6', contato: '#F59E0B', visita: '#8B5CF6', proposta: '#EC4899', fechado: '#10B981' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--line)', background: `linear-gradient(135deg, ${color}15, transparent)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, color: 'white', fontFamily: 'var(--font-display)' }}>
                {c.foto}
              </div>
              <span style={{ position: 'absolute', bottom: -4, right: -4, fontSize: '0.85rem' }}>{RANK_MEDAL[rank] || `#${rank+1}`}</span>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)' }}>{c.nome}</div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text3)', marginTop: 1 }}>CRECI {c.creci} · {c.esp}</div>
              <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
                {c.role === 'admin' && (
                  <span style={{ fontSize: '0.63rem', fontWeight: 700, color: '#7C3AED', background: 'rgba(124,58,237,0.10)', padding: '2px 7px', borderRadius: 99 }}>Admin</span>
                )}
                <span style={{ fontSize: '0.63rem', fontWeight: 600, color: '#059669', background: 'rgba(16,185,129,0.10)', padding: '2px 7px', borderRadius: 99 }}>Ativo</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={onEdit} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line2)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
              <Pencil size={13} />
            </button>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--bg3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Contact row */}
        <div style={{ display: 'flex', gap: 6 }}>
          <a href={wppLink(c.telefone)} target="_blank" rel="noopener noreferrer" className="btn btn-wpp btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
            <MessageCircle size={13} /> WhatsApp
          </a>
          <a href={`tel:${c.telefone}`} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
            <Phone size={13} /> Ligar
          </a>
          <a href={`mailto:${c.email}`} className="btn btn-outline btn-sm" style={{ justifyContent: 'center', width: 34 }} title={c.email}>
            <Mail size={13} />
          </a>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderBottom: '1px solid var(--line)' }}>
        {[
          { label: 'Vendas',   value: c.vendas,           color },
          { label: 'Leads',    value: s.myLeads.length,   color: '#3B82F6' },
          { label: 'Tarefas',  value: `${s.weekDone.length}/${s.weekTasks.length}`, color: '#8B5CF6' },
          { label: 'Comissão', value: formatCurrencyShort(c.comissao), color: '#10B981' },
        ].map((k, i) => (
          <div key={k.label} style={{ padding: '12px 14px', textAlign: 'center', borderRight: i < 3 ? '1px solid var(--line)' : 'none' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: '0.63rem', color: 'var(--text3)', marginTop: 3 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', padding: '0 20px', flexShrink: 0 }}>
        {[['performance', 'Performance'], ['leads', 'Leads'], ['comparativo', 'vs Equipe']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: '10px 14px', fontSize: '0.8rem', fontWeight: tab === id ? 600 : 400, color: tab === id ? 'var(--navy)' : 'var(--text3)', background: 'none', border: 'none', borderBottom: `2px solid ${tab === id ? 'var(--navy)' : 'transparent'}`, cursor: 'pointer', fontFamily: 'var(--font-body)', marginBottom: -1, transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>

        {tab === 'performance' && (
          <>
            {/* Monthly sales chart */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--navy)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vendas mensais (últimos 6 meses)</div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={s.history} barSize={18}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<BarTip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="vendas" name="Vendas" radius={[4, 4, 0, 0]}>
                    {s.history.map((entry, i) => (
                      <Cell key={i} fill={i === s.history.length - 1 ? color : `${color}60`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Task completion by type */}
            {Object.keys(s.byTipo).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--navy)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tarefas por tipo — semana atual</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries(s.byTipo).map(([tipo, { total, done }]) => {
                    const tt = TIPO_TASK[tipo] || TIPO_TASK.geral;
                    const pct = total ? Math.round((done / total) * 100) : 0;
                    return (
                      <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.67rem', fontWeight: 600, color: tt.color, background: tt.bg, padding: '2px 7px', borderRadius: 99, whiteSpace: 'nowrap', minWidth: 68, textAlign: 'center' }}>{tt.label}</span>
                        <div style={{ flex: 1, height: 5, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: tt.color, borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text3)', whiteSpace: 'nowrap' }}>{done}/{total}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Monthly leads trend */}
            <div>
              <div style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--navy)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leads captados por mês</div>
              <ResponsiveContainer width="100%" height={110}>
                <LineChart data={s.history}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<BarTip />} />
                  <Line type="monotone" dataKey="leads" name="Leads" stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {tab === 'leads' && (
          <>
            {/* By status */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--navy)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leads por estágio</div>
              {Object.entries(s.byStatus).length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--text3)' }}>Nenhum lead vinculado</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {Object.entries(s.byStatus).map(([status, count]) => {
                    const total = s.myLeads.length;
                    const pct = total ? Math.round((count / total) * 100) : 0;
                    const col = statusColors[status] || '#6B7280';
                    return (
                      <div key={status}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--navy)', fontWeight: 500 }}>{statusLabels[status] || status}</span>
                          <span style={{ fontSize: '0.75rem', color: col, fontWeight: 600 }}>{count} ({pct}%)</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Lead list */}
            <div style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--navy)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lista de leads</div>
            {s.myLeads.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text3)' }}>Nenhum lead</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {s.myLeads.map(l => {
                  const col = statusColors[l.status] || '#6B7280';
                  return (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--bg)', borderRadius: 10 }}>
                      <div className="avatar" style={{ width: 30, height: 30, fontSize: '0.62rem', flexShrink: 0 }}>
                        {l.nome.split(' ').slice(0,2).map(w => w[0]).join('')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.nome}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>{l.interesse}</div>
                      </div>
                      <span style={{ fontSize: '0.67rem', fontWeight: 600, color: col, background: `${col}18`, padding: '2px 7px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                        {statusLabels[l.status]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'comparativo' && (
          <>
            <div style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--navy)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vendas — todos os corretores</div>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={comparData} barSize={10}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<BarTip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.72rem' }} />
                {corretoresList.map((cc, i) => (
                  <Bar key={cc.id} dataKey={cc.nome.split(' ')[0]} name={cc.nome.split(' ')[0]} fill={RANK_COLOR[i] || '#6B7280'} radius={[3,3,0,0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>

            <div style={{ marginTop: 16, fontSize: '0.73rem', fontWeight: 600, color: 'var(--navy)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Posição na equipe</div>
            {[
              { label: 'Vendas',   value: c.vendas,           max: Math.max(...corretoresList.map(cc => cc.vendas)) },
              { label: 'Comissão', value: c.comissao,         max: Math.max(...corretoresList.map(cc => cc.comissao)) },
              { label: 'Leads',    value: s.myLeads.length,   max: Math.max(...corretoresList.map(cc => leads.filter(l => matchCorretor(cc, l.corretor)).length)) },
            ].map(({ label, value, max }) => {
              const pct = max ? Math.round((value / max) * 100) : 0;
              return (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--navy)' }}>{label}</span>
                    <span style={{ fontSize: '0.75rem', color, fontWeight: 700 }}>{typeof value === 'number' && value > 1000 ? formatCurrencyShort(value) : value} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({pct}% do melhor)</span></span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Comparativo Tab
// ─────────────────────────────────────────────────────────────
function ComparativoTab({ corretoresList, leads, tasks }) {
  const comparData = ['Out','Nov','Dez','Jan','Fev','Mar'].map((mes, i) => {
    const row = { mes };
    corretoresList.forEach(c => { row[c.nome.split(' ')[0]] = getHistory(c.id)[i]?.vendas || 0; });
    return row;
  });

  const leadsData = ['Out','Nov','Dez','Jan','Fev','Mar'].map((mes, i) => {
    const row = { mes };
    corretoresList.forEach(c => { row[c.nome.split(' ')[0]] = getHistory(c.id)[i]?.leads || 0; });
    return row;
  });

  const taskData = corretoresList.map(c => {
    const myLeads = leads.filter(l => matchCorretor(c, l.corretor));
    const myIds   = new Set(myLeads.map(l => l.id));
    const weekT   = tasks.filter(t => t.data >= WEEK_START && t.data <= WEEK_END && t.leadId !== null && myIds.has(t.leadId));
    const done    = weekT.filter(t => t.concluida).length;
    const pct     = weekT.length ? Math.round((done / weekT.length) * 100) : 0;
    return { nome: c.nome.split(' ')[0], total: weekT.length, done, pct };
  });

  const totalVendas = corretoresList.reduce((s, c) => s + c.vendas, 0);

  return (
    <div style={{ padding: 28 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.3rem', marginBottom: 4 }}>Comparativo da Equipe</h2>
      <p style={{ color: 'var(--text3)', fontSize: '0.82rem', marginBottom: 28 }}>Análise comparativa entre todos os corretores</p>

      {/* Summary table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 28 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
                {['Corretor', 'Vendas', 'Leads', 'Market %', 'Comissão', 'Tasks/semana', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text3)', fontSize: '0.72rem', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...corretoresList].sort((a, b) => b.vendas - a.vendas).map((c, i) => {
                const myLeads = leads.filter(l => matchCorretor(c, l.corretor));
                const td = taskData.find(t => t.nome === c.nome.split(' ')[0]) || { total: 0, done: 0, pct: 0 };
                const mkShare = totalVendas ? Math.round((c.vendas / totalVendas) * 100) : 0;
                const col = RANK_COLOR[i] || '#6B7280';
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>{c.foto}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--navy)', fontSize: '0.85rem' }}>{c.nome.split(' ').slice(0,2).join(' ')}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>{c.esp}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: col }}>{c.vendas}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--navy)', fontWeight: 500 }}>{myLeads.length}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${mkShare}%`, background: col, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: col }}>{mkShare}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#10B981', fontSize: '0.85rem' }}>{formatCurrencyShort(c.comissao)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 50, height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${td.pct}%`, background: td.pct >= 70 ? '#10B981' : td.pct >= 40 ? '#F59E0B' : '#EF4444', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{td.done}/{td.total}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: c.ativo !== false ? '#059669' : '#DC2626', background: c.ativo !== false ? 'rgba(16,185,129,0.10)' : 'rgba(220,38,38,0.10)', padding: '3px 9px', borderRadius: 99 }}>
                        {c.ativo !== false ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="compar-grid">
        <div className="card" style={{ padding: 24 }}>
          <h4 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '0.95rem', marginBottom: 16 }}>Vendas mensais</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={comparData} barSize={12}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<BarTip />} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '0.7rem' }} />
              {corretoresList.map((c, i) => (
                <Bar key={c.id} dataKey={c.nome.split(' ')[0]} fill={RANK_COLOR[i]} radius={[3,3,0,0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h4 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '0.95rem', marginBottom: 16 }}>Leads captados</h4>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={leadsData}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<BarTip />} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '0.7rem' }} />
              {corretoresList.map((c, i) => (
                <Line key={c.id} type="monotone" dataKey={c.nome.split(' ')[0]} stroke={RANK_COLOR[i]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Gerenciar Tab
// ─────────────────────────────────────────────────────────────
const EMPTY_CORRETOR = { nome: '', creci: '', esp: '', telefone: '', email: '', foto: '', role: 'corretor', ativo: true };

function GerenciarTab({ corretoresList, updateCorretor, addCorretor, deleteCorretor }) {
  const [editingId, setEditingId]   = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [showAdd, setShowAdd]       = useState(false);
  const [addForm, setAddForm]       = useState(EMPTY_CORRETOR);
  const [editForm, setEditForm]     = useState({});

  const inp = { width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--line2)', fontSize: '0.84rem', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box', color: 'var(--navy)', background: 'white' };

  const startEdit = (c) => { setEditingId(c.id); setEditForm({ ...c }); setShowAdd(false); };
  const saveEdit  = () => { updateCorretor(editingId, editForm); setEditingId(null); };

  const saveAdd = () => {
    if (!addForm.nome.trim()) return alert('Informe o nome');
    addCorretor({ ...addForm, vendas: 0, leads: 0, comissao: 0 });
    setAddForm(EMPTY_CORRETOR); setShowAdd(false);
  };

  const FormRow = ({ label, field, type = 'text', form, setForm }) => (
    <div>
      <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>{label}</label>
      <input style={inp} type={type} value={form[field] || ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} placeholder={label} />
    </div>
  );

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.3rem' }}>Gerenciar Corretores</h2>
          <p style={{ color: 'var(--text3)', fontSize: '0.82rem', marginTop: 2 }}>Edite dados, permissões e acesso do sistema</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditingId(null); }} className="btn btn-primary" style={{ gap: 8 }}>
          <Plus size={15} /> Novo corretor
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card" style={{ padding: 24, marginBottom: 20, border: '2px solid var(--navy)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Plus size={16} style={{ color: 'var(--navy)' }} />
            <h4 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1rem' }}>Novo Corretor</h4>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            <FormRow label="Nome completo" field="nome" form={addForm} setForm={setAddForm} />
            <FormRow label="CRECI" field="creci" form={addForm} setForm={setAddForm} />
            <FormRow label="Especialidade" field="esp" form={addForm} setForm={setAddForm} />
            <FormRow label="Telefone" field="telefone" form={addForm} setForm={setAddForm} />
            <FormRow label="E-mail" field="email" type="email" form={addForm} setForm={setAddForm} />
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Sigla (avatar)</label>
              <input style={inp} value={addForm.foto} maxLength={2} placeholder="Ex: AB" onChange={e => setAddForm(f => ({ ...f, foto: e.target.value.toUpperCase() }))} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--navy)', fontWeight: 500 }}>Permissão:</span>
            {['corretor', 'admin'].map(r => (
              <button key={r} onClick={() => setAddForm(f => ({ ...f, role: r }))}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, border: `1px solid ${addForm.role === r ? (r === 'admin' ? '#7C3AED' : 'var(--navy)') : 'var(--line2)'}`, background: addForm.role === r ? (r === 'admin' ? 'rgba(124,58,237,0.10)' : 'rgba(21,32,54,0.08)') : 'white', color: addForm.role === r ? (r === 'admin' ? '#7C3AED' : 'var(--navy)') : 'var(--text3)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                {r === 'admin' ? <ShieldCheck size={13} /> : <UserCheck size={13} />}
                {r === 'admin' ? 'Administrador' : 'Corretor'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowAdd(false)} className="btn btn-outline">Cancelar</button>
            <button onClick={saveAdd} className="btn btn-primary" style={{ gap: 6 }}><Save size={14} /> Salvar</button>
          </div>
        </div>
      )}

      {/* Corretor list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {corretoresList.map((c, i) => {
          const isEditing = editingId === c.id;
          const rankCol   = RANK_COLOR[i] || '#6B7280';
          return (
            <div key={c.id} className="card" style={{ padding: 0, overflow: 'hidden', border: isEditing ? '2px solid var(--navy)' : '1px solid var(--line)' }}>
              <div style={{ height: 3, background: rankCol }} />
              <div style={{ padding: '18px 22px' }}>
                {!isEditing ? (
                  /* View row */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: rankCol, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>{c.foto}</div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)' }}>{c.nome}</div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text3)', marginTop: 1 }}>CRECI {c.creci} · {c.esp}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 1 }}>{c.email} · {c.telefone}</div>
                    </div>
                    {/* Role badge */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: c.role === 'admin' ? '#7C3AED' : 'var(--text3)', background: c.role === 'admin' ? 'rgba(124,58,237,0.10)' : 'var(--bg3)', padding: '3px 10px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {c.role === 'admin' ? <><ShieldCheck size={10} /> Admin</> : <><UserCheck size={10} /> Corretor</>}
                      </span>
                      {/* Active toggle */}
                      <button onClick={() => updateCorretor(c.id, { ativo: !c.ativo })}
                        title={c.ativo !== false ? 'Desativar' : 'Ativar'}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, border: 'none', background: c.ativo !== false ? 'rgba(16,185,129,0.10)' : 'rgba(220,38,38,0.10)', color: c.ativo !== false ? '#059669' : '#DC2626', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                        {c.ativo !== false ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                        {c.ativo !== false ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>
                    {/* Role toggle */}
                    <button onClick={() => updateCorretor(c.id, { role: c.role === 'admin' ? 'corretor' : 'admin' })}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 99, border: '1px solid var(--line2)', background: 'white', color: 'var(--text2)', fontSize: '0.73rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = c.role === 'admin' ? 'rgba(220,38,38,0.06)' : 'rgba(124,58,237,0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}>
                      <Shield size={12} />
                      {c.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                    </button>
                    {/* Edit & delete */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => startEdit(c)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line2)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setConfirmDel(c.id)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line2)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--text2)'; }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Edit form */
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
                      <FormRow label="Nome" field="nome" form={editForm} setForm={setEditForm} />
                      <FormRow label="CRECI" field="creci" form={editForm} setForm={setEditForm} />
                      <FormRow label="Especialidade" field="esp" form={editForm} setForm={setEditForm} />
                      <FormRow label="Telefone" field="telefone" form={editForm} setForm={setEditForm} />
                      <FormRow label="E-mail" field="email" form={editForm} setForm={setEditForm} />
                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Sigla</label>
                        <input style={inp} value={editForm.foto || ''} maxLength={2} onChange={e => setEditForm(f => ({ ...f, foto: e.target.value.toUpperCase() }))} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--navy)', fontWeight: 500 }}>Permissão:</span>
                      {['corretor', 'admin'].map(r => (
                        <button key={r} onClick={() => setEditForm(f => ({ ...f, role: r }))}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, border: `1px solid ${editForm.role === r ? (r === 'admin' ? '#7C3AED' : 'var(--navy)') : 'var(--line2)'}`, background: editForm.role === r ? (r === 'admin' ? 'rgba(124,58,237,0.10)' : 'rgba(21,32,54,0.08)') : 'white', color: editForm.role === r ? (r === 'admin' ? '#7C3AED' : 'var(--navy)') : 'var(--text3)', fontSize: '0.77rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                          {r === 'admin' ? <ShieldCheck size={12} /> : <UserCheck size={12} />}
                          {r === 'admin' ? 'Administrador' : 'Corretor'}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setEditingId(null)} className="btn btn-outline">Cancelar</button>
                      <button onClick={saveEdit} className="btn btn-primary" style={{ gap: 6 }}><Save size={14} /> Salvar</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirm */}
      {confirmDel && (
        <>
          <div className="overlay" onClick={() => setConfirmDel(null)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: 'var(--radius-lg)', padding: 32, zIndex: 300, width: 360, boxShadow: 'var(--shadow-xl)', animation: 'scaleUp 0.25s var(--ease) both' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--red-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={22} style={{ color: 'var(--red)' }} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', textAlign: 'center', fontSize: '1.3rem', marginBottom: 8 }}>Remover corretor?</h3>
            <p style={{ color: 'var(--text2)', textAlign: 'center', fontSize: '0.88rem', marginBottom: 24 }}>Esta ação não pode ser desfeita.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button className="btn btn-red" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { deleteCorretor(confirmDel); setConfirmDel(null); }}>Remover</button>
            </div>
          </div>
        </>
      )}

      <style>{`@media(max-width:900px){ .compar-grid{grid-template-columns:1fr!important} }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function Corretores({ corretoresList = [], updateCorretor, addCorretor, deleteCorretor, leads = [], tasks = [] }) {
  const [tab, setTab]           = useState('equipe');
  const [selectedId, setSelectedId] = useState(null);
  const [editingInPanel, setEditingInPanel] = useState(false);

  const sorted         = useMemo(() => [...corretoresList].sort((a, b) => b.vendas - a.vendas), [corretoresList]);
  const selectedIdx    = sorted.findIndex(c => c.id === selectedId);
  const selectedCorretor = sorted.find(c => c.id === selectedId);

  const handleSelect = (id) => {
    setSelectedId(prev => prev === id ? null : id);
    setEditingInPanel(false);
  };

  const totalVendas   = corretoresList.reduce((s, c) => s + c.vendas, 0);
  const totalLeads    = leads.length;
  const totalComissao = corretoresList.reduce((s, c) => s + c.comissao, 0);

  const TABS = [
    { id: 'equipe',      label: 'Equipe',      icon: Users       },
    { id: 'comparativo', label: 'Comparativo', icon: TrendingUp  },
    { id: 'gerenciar',   label: 'Gerenciar',   icon: ShieldCheck },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* Top nav with tabs */}
      <div style={{ padding: '20px 28px 0', borderBottom: '1px solid var(--line)', background: 'white', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 0 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.4rem' }}>Corretores</h2>
            <p style={{ color: 'var(--text3)', fontSize: '0.82rem', marginTop: 2 }}>Equipe de {corretoresList.length} corretores</p>
          </div>
          {/* KPI strip */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 14 }}>
            {[
              { label: 'Total vendas',  value: totalVendas,                       color: '#3B82F6' },
              { label: 'Leads ativos',  value: totalLeads,                        color: '#8B5CF6' },
              { label: 'Comissões',     value: formatCurrencyShort(totalComissao), color: '#10B981' },
            ].map(k => (
              <div key={k.label} style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: '0.67rem', color: 'var(--text3)', marginTop: 2 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 2 }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', fontSize: '0.85rem', fontWeight: tab === id ? 600 : 400, color: tab === id ? 'var(--navy)' : 'var(--text3)', background: 'none', border: 'none', borderBottom: `2px solid ${tab === id ? 'var(--navy)' : 'transparent'}`, cursor: 'pointer', fontFamily: 'var(--font-body)', marginBottom: -1, transition: 'all 0.15s' }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

        {tab === 'equipe' && (
          <>
            {/* Left: cards */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
              <div style={{ display: 'grid', gridTemplateColumns: selectedId ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 20, transition: 'grid-template-columns 0.3s' }} className="corr-grid">
                {sorted.map((c, i) => (
                  <CorretorCard
                    key={c.id}
                    c={c} rank={i}
                    leads={leads} tasks={tasks}
                    selected={selectedId === c.id}
                    onClick={() => handleSelect(c.id)}
                  />
                ))}
              </div>
            </div>

            {/* Right: detail panel */}
            {selectedCorretor && (
              <div style={{ width: 420, flexShrink: 0, borderLeft: '1px solid var(--line)', background: 'white', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.25s var(--ease) both' }}>
                <DetailPanel
                  c={selectedCorretor}
                  rank={selectedIdx}
                  leads={leads}
                  tasks={tasks}
                  corretoresList={sorted}
                  onClose={() => setSelectedId(null)}
                  onEdit={() => { setTab('gerenciar'); setSelectedId(null); }}
                />
              </div>
            )}
          </>
        )}

        {tab === 'comparativo' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <ComparativoTab corretoresList={corretoresList} leads={leads} tasks={tasks} />
          </div>
        )}

        {tab === 'gerenciar' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <GerenciarTab
              corretoresList={corretoresList}
              updateCorretor={updateCorretor}
              addCorretor={addCorretor}
              deleteCorretor={deleteCorretor}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @media(max-width:1200px){ .corr-grid{ grid-template-columns: repeat(2,1fr) !important; } }
        @media(max-width:700px) { .corr-grid{ grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
