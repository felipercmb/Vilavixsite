import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Users, Calendar, TrendingUp, DollarSign,
  ArrowUpRight, ArrowDownRight, Phone, MessageCircle,
  Instagram, Mail, CheckSquare, Check, Trophy,
  ChevronDown, ChevronUp, Flame, AlertCircle,
  MapPin, ArrowRight,
} from 'lucide-react';
import { corretores } from '../../data/corretores.js';
import { TIPO_TASK } from '../../data/tasks.js';
import {
  formatCurrencyShort,
  PIPELINE_LABELS, PIPELINE_STAGES,
  STATUS_COLORS, ORIGIN_EMOJI, initials,
} from '../../utils/helpers.js';
import Badge from '../../components/Badge.jsx';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const TODAY      = '2026-03-20';
const WEEK_START = '2026-03-16';
const WEEK_END   = '2026-03-22';
const MES_START  = '2026-03-01';

const CHART_DATA = [
  { mes: 'Abr', valor: 890000  },
  { mes: 'Mai', valor: 1230000 },
  { mes: 'Jun', valor: 980000  },
  { mes: 'Jul', valor: 1560000 },
  { mes: 'Ago', valor: 1100000 },
  { mes: 'Set', valor: 2100000 },
  { mes: 'Out', valor: 1780000 },
  { mes: 'Nov', valor: 2340000 },
  { mes: 'Dez', valor: 1920000 },
  { mes: 'Jan', valor: 2560000 },
  { mes: 'Fev', valor: 2100000 },
  { mes: 'Mar', valor: 3280000, current: true },
];

const TIPO_ICON = {
  ligacao:   Phone,
  mensagem:  MessageCircle,
  visita:    Calendar,
  instagram: Instagram,
  email:     Mail,
  geral:     CheckSquare,
};

const MEDAL     = ['🥇', '🥈', '🥉'];
const BAR_COLOR = ['#F59E0B', '#6366F1', '#10B981'];

// ─────────────────────────────────────────────────────────────
// Custom hook — all derived data in one memoized block
// ─────────────────────────────────────────────────────────────
function useDashboardStats(leads, tasks) {
  return useMemo(() => {
    // ── KPIs ────────────────────────────────────────────────
    const leadsAtivos   = leads.filter(l => l.status !== 'fechado').length;
    const visitasPend   = tasks.filter(t => t.tipo === 'visita' && t.data >= TODAY && !t.concluida).length;
    const emProposta    = leads.filter(l => l.status === 'proposta').length;
    const fechadosMes   = leads.filter(l => l.status === 'fechado' && l.data >= MES_START).length;

    // ── Today's tasks ────────────────────────────────────────
    const todayTasks    = tasks
      .filter(t => t.data === TODAY)
      .sort((a, b) => a.hora.localeCompare(b.hora));
    const todayDone     = todayTasks.filter(t => t.concluida).length;

    // ── Pipeline funnel ──────────────────────────────────────
    const funnelData = PIPELINE_STAGES.map(stage => ({
      stage,
      label: PIPELINE_LABELS[stage],
      count: leads.filter(l => l.status === stage).length,
      color: STATUS_COLORS[stage],
    }));
    const maxFunnelCount = Math.max(...funnelData.map(f => f.count), 1);

    // ── Leads by origin ──────────────────────────────────────
    const originMap = {};
    leads.forEach(l => { originMap[l.origem] = (originMap[l.origem] || 0) + 1; });
    const originData = Object.entries(originMap)
      .map(([nome, count]) => ({ nome, count, emoji: ORIGIN_EMOJI[nome] || '📍' }))
      .sort((a, b) => b.count - a.count);

    // ── Hot leads (alta prioridade, não fechado) ─────────────
    const hotLeads = leads
      .filter(l => l.prioridade === 'alta' && l.status !== 'fechado')
      .map(l => ({
        ...l,
        pendingTasks: tasks.filter(t => t.leadId === l.id && !t.concluida).length,
        nextTask: tasks.find(t => t.leadId === l.id && !t.concluida && t.data >= TODAY),
      }))
      .sort((a, b) => b.pendingTasks - a.pendingTasks);

    // ── Recent leads ─────────────────────────────────────────
    const recentLeads = [...leads].sort((a, b) => b.id - a.id).slice(0, 5);

    // ── Weekly task summary ──────────────────────────────────
    const weekTasks = tasks.filter(t => t.data >= WEEK_START && t.data <= WEEK_END);
    const weekDone  = weekTasks.filter(t => t.concluida).length;
    const weekPct   = weekTasks.length ? Math.round((weekDone / weekTasks.length) * 100) : 0;

    const weekByTipo = {};
    weekTasks.forEach(t => {
      if (!weekByTipo[t.tipo]) weekByTipo[t.tipo] = { total: 0, done: 0 };
      weekByTipo[t.tipo].total++;
      if (t.concluida) weekByTipo[t.tipo].done++;
    });

    // ── Per-corretor stats ───────────────────────────────────
    const corretorStats = [...corretores]
      .sort((a, b) => b.vendas - a.vendas)
      .map((c, rank) => {
        const myLeads   = leads.filter(l => c.nome.startsWith(l.corretor));
        const myIds     = new Set(myLeads.map(l => l.id));
        const myWeek    = tasks.filter(t =>
          t.data >= WEEK_START && t.data <= WEEK_END &&
          t.leadId !== null && myIds.has(t.leadId)
        );
        const myDone    = myWeek.filter(t => t.concluida);
        const myPct     = myWeek.length ? Math.round((myDone.length / myWeek.length) * 100) : 0;

        const byType = {};
        myWeek.forEach(t => { byType[t.tipo] = (byType[t.tipo] || 0) + 1; });

        return {
          ...c, rank,
          myLeads,
          leadsAtivos: myLeads.filter(l => l.status !== 'fechado').length,
          leadsPropos: myLeads.filter(l => l.status === 'proposta').length,
          weekTasks:   myWeek,
          weekDone:    myDone,
          weekPct:     myPct,
          byType,
          typeRows:    Object.entries(byType).sort((a, b) => b[1] - a[1]),
        };
      });

    return {
      leadsAtivos, visitasPend, emProposta, fechadosMes,
      todayTasks, todayDone,
      funnelData, maxFunnelCount,
      originData, hotLeads, recentLeads,
      weekTasks, weekDone, weekPct, weekByTipo,
      corretorStats,
    };
  }, [leads, tasks]);
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--navy)', color: 'white', padding: '10px 16px', borderRadius: 10, fontSize: '0.83rem', boxShadow: 'var(--shadow-md)' }}>
      <div style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{formatCurrencyShort(payload[0].value)}</div>
    </div>
  );
};

function KpiCard({ title, value, change, positive, Icon, color, bg }) {
  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} style={{ color }} />
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: '0.75rem', fontWeight: 600,
          color: positive ? '#059669' : '#DC2626',
          background: positive ? 'rgba(16,185,129,0.10)' : 'rgba(220,38,38,0.10)',
          padding: '3px 8px', borderRadius: 8,
        }}>
          {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {change}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 600, color: 'var(--navy)', lineHeight: 1, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>{title}</div>
    </div>
  );
}

function FunnelCard({ funnelData, maxCount }) {
  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.05rem' }}>Funil de Conversão</h3>
        <p style={{ color: 'var(--text3)', fontSize: '0.75rem', marginTop: 2 }}>Distribuição atual dos leads</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {funnelData.map((item, i) => {
          const pct = maxCount ? Math.round((item.count / maxCount) * 100) : 0;
          const conversionRate = i > 0 && funnelData[i - 1].count
            ? Math.round((item.count / funnelData[i - 1].count) * 100)
            : null;
          return (
            <div key={item.stage}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--navy)' }}>{item.label}</span>
                  {conversionRate !== null && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--text3)' }}>
                      <ArrowRight size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 1 }} />
                      {conversionRate}%
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: item.color }}>{item.count}</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text4)' }}>lead{item.count !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div style={{ height: 7, background: 'var(--bg3)', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: 6, opacity: 0.85 }} />
              </div>
            </div>
          );
        })}
      </div>
      {/* Taxa de fechamento */}
      {(() => {
        const novos    = funnelData.find(f => f.stage === 'novo')?.count || 0;
        const fechados = funnelData.find(f => f.stage === 'fechado')?.count || 0;
        const total    = funnelData.reduce((s, f) => s + f.count, 0);
        const txFech   = total ? Math.round((fechados / total) * 100) : 0;
        return (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)', display: 'flex', gap: 16 }}>
            <div style={{ flex: 1, textAlign: 'center', background: 'rgba(16,185,129,0.07)', borderRadius: 10, padding: '8px 0' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, color: '#10B981' }}>{txFech}%</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text3)', marginTop: 2 }}>Taxa de fechamento</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', background: 'rgba(59,130,246,0.07)', borderRadius: 10, padding: '8px 0' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, color: '#3B82F6' }}>{total}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text3)', marginTop: 2 }}>Leads total</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function OriginCard({ originData }) {
  const total = originData.reduce((s, o) => s + o.count, 0);
  const COLORS = ['#C62828', '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981'];
  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.05rem' }}>Origem dos Leads</h3>
        <p style={{ color: 'var(--text3)', fontSize: '0.75rem', marginTop: 2 }}>De onde vêm seus clientes</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {originData.map((o, i) => {
          const pct = total ? Math.round((o.count / total) * 100) : 0;
          const color = COLORS[i % COLORS.length];
          return (
            <div key={o.nome}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>{o.emoji}</span> {o.nome}
                </span>
                <span style={{ fontSize: '0.75rem', color, fontWeight: 700 }}>{pct}% <span style={{ color: 'var(--text4)', fontWeight: 400 }}>({o.count})</span></span>
              </div>
              <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 6 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HotLeadsCard({ hotLeads, goToLead }) {
  if (!hotLeads.length) return null;
  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <Flame size={16} style={{ color: '#EF4444' }} />
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.05rem' }}>Leads Quentes</h3>
        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', background: 'rgba(239,68,68,0.10)', color: '#EF4444', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>
          Alta prioridade
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {hotLeads.slice(0, 4).map(lead => {
          const TipoIcon = lead.nextTask ? (TIPO_ICON[lead.nextTask.tipo] || CheckSquare) : AlertCircle;
          const tt = lead.nextTask ? (TIPO_TASK[lead.nextTask.tipo] || TIPO_TASK.geral) : null;
          return (
            <div
              key={lead.id}
              onClick={() => goToLead(lead.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div className="avatar" style={{ width: 34, height: 34, fontSize: '0.68rem', flexShrink: 0, background: '#EF4444' }}>
                {initials(lead.nome)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {lead.nome}
                </div>
                {lead.nextTask ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <TipoIcon size={10} style={{ color: tt.color }} />
                    <span style={{ fontSize: '0.68rem', color: tt.color, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lead.nextTask.titulo}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.68rem', color: 'var(--text3)', marginTop: 2 }}>{lead.interesse}</div>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <Badge status={lead.status} />
                {lead.pendingTasks > 0 && (
                  <div style={{ fontSize: '0.65rem', color: '#EF4444', marginTop: 3 }}>
                    {lead.pendingTasks} tarefa{lead.pendingTasks > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CorretorCard({ stats, goToLead }) {
  const [expanded, setExpanded] = useState(false);
  const { rank, weekPct, weekTasks, weekDone, leadsAtivos, leadsPropos, typeRows, myLeads } = stats;
  const color = BAR_COLOR[rank] || '#6B7280';

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', border: rank === 0 ? `2px solid ${color}40` : '1px solid var(--line)' }}>
      <div style={{ height: 4, background: color }} />
      <div style={{ padding: '20px 22px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ position: 'relative' }}>
            <div className="avatar" style={{ width: 44, height: 44, fontSize: '0.78rem', background: color }}>{stats.foto}</div>
            <span style={{ position: 'absolute', top: -6, right: -6, fontSize: '0.9rem', lineHeight: 1 }}>{MEDAL[rank] || ''}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {stats.nome.split(' ').slice(0, 2).join(' ')}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 1 }}>{stats.esp}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)', lineHeight: 1 }}>{stats.vendas}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>vendas</div>
          </div>
        </div>

        {/* Stats tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Leads ativos', value: leadsAtivos, color: '#3B82F6' },
            { label: 'Em proposta',  value: leadsPropos,  color: '#8B5CF6' },
            { label: 'Comissão',     value: `R$ ${(stats.comissao / 1000).toFixed(0)}k`, color: '#10B981' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 6px 8px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text3)', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Weekly task progress */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--navy)' }}>Tarefas da semana</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>
              {weekDone.length}/{weekTasks.length} ·{' '}
              <span style={{ color: weekPct >= 70 ? '#059669' : weekPct >= 40 ? '#D97706' : '#DC2626', fontWeight: 600 }}>{weekPct}%</span>
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${weekPct}%`, background: weekPct >= 70 ? '#10B981' : weekPct >= 40 ? '#F59E0B' : '#EF4444', borderRadius: 6, transition: 'width 0.5s ease' }} />
          </div>
        </div>

        {/* Expandable type breakdown */}
        {typeRows.length > 0 && (
          <>
            <button
              onClick={() => setExpanded(e => !e)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--text3)', fontFamily: 'var(--font-body)', padding: 0 }}
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? 'Ocultar detalhes' : 'Ver por tipo de tarefa'}
            </button>
            {expanded && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {typeRows.map(([tipo, count]) => {
                  const tt   = TIPO_TASK[tipo] || TIPO_TASK.geral;
                  const done = weekTasks.filter(t => t.tipo === tipo && t.concluida).length;
                  return (
                    <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.67rem', fontWeight: 600, color: tt.color, background: tt.bg, padding: '2px 7px', borderRadius: 99, whiteSpace: 'nowrap' }}>{tt.label}</span>
                      <div style={{ flex: 1, height: 4, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${count ? (done / count) * 100 : 0}%`, background: tt.color, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text3)', whiteSpace: 'nowrap' }}>{done}/{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Mini lead list */}
        {myLeads.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text3)', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Leads atribuídos</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {myLeads.map(l => (
                <button
                  key={l.id}
                  onClick={() => goToLead(l.id)}
                  title={l.nome}
                  style={{ width: 26, height: 26, borderRadius: '50%', background: l.status === 'fechado' ? '#10B981' : l.prioridade === 'alta' ? '#EF4444' : 'var(--navy)', color: 'white', fontSize: '0.6rem', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {initials(l.nome)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WeeklySummaryBar({ weekTasks, weekDone, weekPct, weekByTipo }) {
  return (
    <div className="card" style={{ padding: '18px 24px', marginTop: 16, display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
      {/* Total */}
      <div style={{ minWidth: 120 }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginBottom: 3 }}>Total da semana</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--navy)', lineHeight: 1 }}>{weekDone}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>/ {weekTasks.length} concluídas</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text3)', marginBottom: 4 }}>
          <span>Progresso geral da equipe</span>
          <span style={{ fontWeight: 700, color: weekPct >= 70 ? '#059669' : weekPct >= 40 ? '#D97706' : '#DC2626' }}>{weekPct}%</span>
        </div>
        <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${weekPct}%`, background: weekPct >= 70 ? '#10B981' : weekPct >= 40 ? '#F59E0B' : '#EF4444', borderRadius: 8, transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* By type */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {Object.entries(weekByTipo)
          .sort((a, b) => b[1].total - a[1].total)
          .map(([tipo, { total, done }]) => {
            const tt = TIPO_TASK[tipo] || TIPO_TASK.geral;
            return (
              <div key={tipo} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: tt.color, background: tt.bg, padding: '2px 9px', borderRadius: 99, marginBottom: 3 }}>{tt.label}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>{done}/{total}</div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────
export default function Dashboard({ leads, tasks, toggleTask, goToLead, setMenu }) {
  const s = useDashboardStats(leads, tasks);

  const kpis = [
    { title: 'Leads ativos',      value: s.leadsAtivos,  change: '+12%', positive: true,  Icon: Users,      color: '#3B82F6', bg: 'rgba(59,130,246,0.10)'  },
    { title: 'Visitas pendentes', value: s.visitasPend,  change: '+2',   positive: true,  Icon: Calendar,   color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)'  },
    { title: 'Em proposta',       value: s.emProposta,   change: '-1',   positive: false, Icon: TrendingUp, color: '#EC4899', bg: 'rgba(236,72,153,0.10)'  },
    { title: 'Fechados no mês',   value: s.fechadosMes,  change: '+28%', positive: true,  Icon: DollarSign, color: '#10B981', bg: 'rgba(16,185,129,0.10)'  },
  ];

  return (
    <div style={{ padding: 32 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: 'var(--text3)', fontSize: '0.8rem', marginBottom: 4 }}>Bem-vindo de volta,</p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.8rem', fontWeight: 600 }}>
          Ana Paula 👋
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: '0.88rem', marginTop: 4 }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 28 }} className="metrics-grid">
        {kpis.map((kpi, i) => <KpiCard key={i} {...kpi} />)}
      </div>

      {/* Chart + Today's tasks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 24 }} className="dash-mid">

        {/* Bar chart */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.1rem' }}>Performance mensal</h3>
              <p style={{ color: 'var(--text3)', fontSize: '0.8rem', marginTop: 2 }}>Volume de vendas em reais</p>
            </div>
            <span className="badge badge-red">Mês atual</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={CHART_DATA} barSize={26}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(21,32,54,0.04)' }} />
              <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                {CHART_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.current ? '#C62828' : '#152036'} opacity={entry.current ? 1 : 0.55} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Today's tasks */}
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.05rem' }}>Tarefas de hoje</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{s.todayDone}/{s.todayTasks.length} concluídas</span>
          </div>

          <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 4, marginBottom: 14, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: s.todayTasks.length ? `${(s.todayDone / s.todayTasks.length) * 100}%` : '0%', background: 'var(--green)', borderRadius: 4, transition: 'width 0.4s ease' }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {s.todayTasks.slice(0, 7).map(task => {
              const TIcon = TIPO_ICON[task.tipo] || CheckSquare;
              const tt    = TIPO_TASK[task.tipo] || TIPO_TASK.geral;
              return (
                <div
                  key={task.id}
                  onClick={() => task.leadId ? goToLead(task.leadId) : setMenu('tarefas')}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <button
                    onClick={e => { e.stopPropagation(); toggleTask(task.id); }}
                    style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${task.concluida ? tt.color : 'var(--line2)'}`, background: task.concluida ? tt.color : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginTop: 1, transition: 'all 0.2s ease' }}
                  >
                    {task.concluida && <Check size={10} strokeWidth={3} color="white" />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, color: task.concluida ? 'var(--text3)' : 'var(--navy)', textDecoration: task.concluida ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {task.titulo}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <TIcon size={10} style={{ color: tt.color }} />
                      <span style={{ fontSize: '0.7rem', color: tt.color, fontWeight: 500 }}>{tt.label}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text4)' }}>· {task.hora}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {s.todayTasks.length > 7 && (
            <button onClick={() => setMenu('tarefas')} style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--red)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', padding: '4px 0' }}>
              Ver todas as {s.todayTasks.length} tarefas →
            </button>
          )}
        </div>
      </div>

      {/* Funnel + Origin + Hot leads */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.9fr 1.1fr', gap: 20, marginBottom: 24 }} className="dash-funnel">
        <FunnelCard funnelData={s.funnelData} maxCount={s.maxFunnelCount} />
        <OriginCard originData={s.originData} />
        <HotLeadsCard hotLeads={s.hotLeads} goToLead={goToLead} />
      </div>

      {/* Recent leads + Ranking */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 28 }} className="dash-bottom">
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.05rem', marginBottom: 18 }}>Leads recentes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {s.recentLeads.map(lead => (
              <div
                key={lead.id}
                onClick={() => goToLead(lead.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 10, cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.72rem' }}>
                  {initials(lead.nome)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.nome}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <MapPin size={9} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                    {lead.interesse}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Badge status={lead.status} />
                  <div style={{ fontSize: '0.68rem', color: 'var(--text4)', marginTop: 3 }}>{lead.corretor}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.05rem', marginBottom: 18 }}>Ranking de corretores</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {s.corretorStats.map((c, i) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 22, textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: BAR_COLOR[i] }}>{MEDAL[i] || `#${i + 1}`}</span>
                <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.7rem', background: BAR_COLOR[i] }}>{c.foto}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.83rem', color: 'var(--navy)' }}>{c.nome.split(' ')[0]}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{c.vendas} vendas · {c.myLeads.length} leads</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.83rem', color: 'var(--navy)' }}>{formatCurrencyShort(c.comissao)}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>comissão</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team performance */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={18} style={{ color: '#F59E0B' }} />
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.1rem', lineHeight: 1 }}>Desempenho da Equipe</h3>
              <p style={{ color: 'var(--text3)', fontSize: '0.75rem', marginTop: 2 }}>Semana atual · 16–22 mar 2026</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="equipe-grid">
          {s.corretorStats.map(cs => (
            <CorretorCard key={cs.id} stats={cs} goToLead={goToLead} />
          ))}
        </div>

        <WeeklySummaryBar
          weekTasks={s.weekTasks}
          weekDone={s.weekDone}
          weekPct={s.weekPct}
          weekByTipo={s.weekByTipo}
        />
      </div>

      <style>{`
        @media (max-width:1280px) {
          .metrics-grid  { grid-template-columns: repeat(2, 1fr) !important; }
          .dash-mid      { grid-template-columns: 1fr !important; }
          .dash-funnel   { grid-template-columns: 1fr 1fr !important; }
          .dash-bottom   { grid-template-columns: 1fr !important; }
          .equipe-grid   { grid-template-columns: 1fr !important; }
        }
        @media (max-width:768px) {
          .metrics-grid  { grid-template-columns: 1fr !important; }
          .dash-funnel   { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
