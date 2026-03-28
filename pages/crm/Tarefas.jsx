import React, { useState, useMemo } from 'react';
import {
  Phone, MessageCircle, Calendar, Instagram, Mail, CheckSquare,
  Check, Plus, X, ChevronDown, Search, Filter,
} from 'lucide-react';
import { TIPO_TASK } from '../../data/tasks.js';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../../utils/helpers.js';

const TODAY = '2026-03-20';

const TIPO_ICON = {
  ligacao:   Phone,
  mensagem:  MessageCircle,
  visita:    Calendar,
  instagram: Instagram,
  email:     Mail,
  geral:     CheckSquare,
};

const TIPOS_FILTER  = ['Todos', 'ligacao', 'mensagem', 'visita', 'instagram', 'email', 'geral'];
const PRIO_FILTER   = ['Todas', 'alta', 'media', 'baixa'];
const STATUS_FILTER = ['Todas', 'pendente', 'concluida'];

function groupByDate(tasks) {
  const map = {};
  tasks.forEach((t) => {
    if (!map[t.data]) map[t.data] = [];
    map[t.data].push(t);
  });
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
}

function formatDateLabel(dateStr) {
  if (dateStr === TODAY) return 'Hoje';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const DAYS   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return `${DAYS[dt.getDay()]}, ${d} ${MONTHS[m - 1]}`;
}

// ── New Task Form ─────────────────────────────────────────────────────────────
function NewTaskForm({ onAdd, onClose, leads }) {
  const [form, setForm] = useState({
    titulo: '', tipo: 'ligacao', data: TODAY, hora: '09:00',
    prioridade: 'media', leadId: '', descricao: '',
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    onAdd({
      ...form,
      leadId: form.leadId ? Number(form.leadId) : null,
    });
    onClose();
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Título */}
      <div>
        <label style={labelStyle}>Título *</label>
        <input
          className="input"
          placeholder="Ex: Ligar para João"
          value={form.titulo}
          onChange={(e) => set('titulo', e.target.value)}
          required
          style={{ marginTop: 4 }}
        />
      </div>

      {/* Tipo + Prioridade */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Tipo</label>
          <select className="select" value={form.tipo} onChange={(e) => set('tipo', e.target.value)} style={{ marginTop: 4, width: '100%' }}>
            {Object.entries(TIPO_TASK).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Prioridade</label>
          <select className="select" value={form.prioridade} onChange={(e) => set('prioridade', e.target.value)} style={{ marginTop: 4, width: '100%' }}>
            {PRIO_FILTER.slice(1).map((p) => (
              <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data + Hora */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Data</label>
          <input type="date" className="input" value={form.data} onChange={(e) => set('data', e.target.value)} style={{ marginTop: 4 }} />
        </div>
        <div>
          <label style={labelStyle}>Hora</label>
          <input type="time" className="input" value={form.hora} onChange={(e) => set('hora', e.target.value)} style={{ marginTop: 4 }} />
        </div>
      </div>

      {/* Lead opcional */}
      <div>
        <label style={labelStyle}>Lead relacionado (opcional)</label>
        <select className="select" value={form.leadId} onChange={(e) => set('leadId', e.target.value)} style={{ marginTop: 4, width: '100%' }}>
          <option value="">— Nenhum —</option>
          {leads.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
      </div>

      {/* Descrição */}
      <div>
        <label style={labelStyle}>Descrição</label>
        <textarea
          className="input"
          placeholder="Detalhes sobre a tarefa..."
          value={form.descricao}
          onChange={(e) => set('descricao', e.target.value)}
          rows={3}
          style={{ marginTop: 4, resize: 'vertical', minHeight: 72 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button type="button" onClick={onClose} className="btn btn-outline" style={{ padding: '9px 18px', fontSize: '0.85rem' }}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" style={{ padding: '9px 18px', fontSize: '0.85rem' }}>
          Adicionar tarefa
        </button>
      </div>
    </form>
  );
}

const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text3)' };

// ── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, toggleTask, goToLead, leads }) {
  const [expanded, setExpanded] = useState(false);
  const tt       = TIPO_TASK[task.tipo]   || TIPO_TASK.geral;
  const TipoIcon = TIPO_ICON[task.tipo]   || CheckSquare;
  const lead     = task.leadId ? leads.find((l) => l.id === task.leadId) : null;
  const prioColor = PRIORITY_COLORS[task.prioridade] || '#6B7280';

  return (
    <div
      className="card"
      style={{
        padding: '14px 18px',
        opacity: task.concluida ? 0.6 : 1,
        transition: 'opacity 0.25s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Checkbox */}
        <button
          onClick={() => toggleTask(task.id)}
          style={{
            width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 2,
            border: `2px solid ${task.concluida ? tt.color : 'var(--line2)'}`,
            background: task.concluida ? tt.color : 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s ease',
          }}
        >
          {task.concluida && <Check size={11} strokeWidth={3} color="white" />}
        </button>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span
              style={{
                fontWeight: 600, fontSize: '0.88rem', color: 'var(--navy)',
                textDecoration: task.concluida ? 'line-through' : 'none',
              }}
            >
              {task.titulo}
            </span>
            {/* Priority dot */}
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: prioColor, flexShrink: 0 }} />
          </div>

          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Tipo badge */}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: tt.bg, fontSize: '0.72rem', fontWeight: 600, color: tt.color }}>
              <TipoIcon size={10} />
              {tt.label}
            </span>

            {/* Hora */}
            <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{task.hora}</span>

            {/* Lead link */}
            {lead && (
              <button
                onClick={() => goToLead(lead.id)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.75rem', color: 'var(--navy)', fontWeight: 500, fontFamily: 'var(--font-body)', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}
              >
                {lead.nome.split(' ')[0]}
              </button>
            )}
          </div>
        </div>

        {/* Expand toggle (if has description) */}
        {task.descricao && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, flexShrink: 0, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}
          >
            <ChevronDown size={15} />
          </button>
        )}
      </div>

      {/* Description */}
      {expanded && task.descricao && (
        <p style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)', fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.6, paddingLeft: 32 }}>
          {task.descricao}
        </p>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Tarefas({ tasks, toggleTask, addTask, goToLead, leads }) {
  const [showForm,  setShowForm]  = useState(false);
  const [busca,     setBusca]     = useState('');
  const [tipoF,     setTipoF]     = useState('Todos');
  const [prioF,     setPrioF]     = useState('Todas');
  const [statusF,   setStatusF]   = useState('Todas');

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (tipoF   !== 'Todos'    && t.tipo             !== tipoF)            return false;
      if (prioF   !== 'Todas'    && t.prioridade        !== prioF)           return false;
      if (statusF === 'pendente'  && t.concluida)                            return false;
      if (statusF === 'concluida' && !t.concluida)                           return false;
      if (busca) {
        const q = busca.toLowerCase();
        const leadNome = t.leadId ? (leads.find(l => l.id === t.leadId)?.nome || '') : '';
        if (!`${t.titulo} ${t.descricao} ${leadNome}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tasks, tipoF, prioF, statusF, busca, leads]);

  const grouped  = groupByDate(filtered);
  const total    = tasks.length;
  const done     = tasks.filter((t) => t.concluida).length;
  const pending  = total - done;

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.4rem' }}>Tarefas</h2>
          <p style={{ color: 'var(--text3)', fontSize: '0.82rem', marginTop: 2 }}>
            {pending} pendente{pending !== 1 ? 's' : ''} · {done} concluída{done !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontSize: '0.88rem' }}
        >
          <Plus size={16} /> Nova tarefa
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>Progresso geral</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--navy)' }}>
            {total > 0 ? Math.round((done / total) * 100) : 0}%
          </span>
        </div>
        <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: total > 0 ? `${(done / total) * 100}%` : '0%',
            background: 'var(--green)',
            borderRadius: 6,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            className="input"
            placeholder="Buscar tarefa..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ paddingLeft: 36, height: 38 }}
          />
        </div>

        {/* Tipo */}
        <select className="select" value={tipoF} onChange={(e) => setTipoF(e.target.value)} style={{ height: 38, flex: '1 1 130px', maxWidth: 160 }}>
          {TIPOS_FILTER.map((t) => (
            <option key={t} value={t}>{t === 'Todos' ? 'Todos os tipos' : TIPO_TASK[t]?.label || t}</option>
          ))}
        </select>

        {/* Prioridade */}
        <select className="select" value={prioF} onChange={(e) => setPrioF(e.target.value)} style={{ height: 38, flex: '1 1 130px', maxWidth: 160 }}>
          {PRIO_FILTER.map((p) => (
            <option key={p} value={p}>{p === 'Todas' ? 'Todas as prioridades' : PRIORITY_LABELS[p]}</option>
          ))}
        </select>

        {/* Status */}
        <select className="select" value={statusF} onChange={(e) => setStatusF(e.target.value)} style={{ height: 38, flex: '1 1 130px', maxWidth: 160 }}>
          {STATUS_FILTER.map((s) => (
            <option key={s} value={s}>
              {s === 'Todas' ? 'Todas' : s === 'pendente' ? 'Pendentes' : 'Concluídas'}
            </option>
          ))}
        </select>
      </div>

      {/* New Task Modal */}
      {showForm && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: 520, padding: 28, animation: 'scaleUp 0.25s cubic-bezier(.22,1,.36,1)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.15rem' }}>Nova tarefa</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                <X size={18} />
              </button>
            </div>
            <NewTaskForm onAdd={addTask} onClose={() => setShowForm(false)} leads={leads} />
          </div>
        </div>
      )}

      {/* Task groups */}
      {grouped.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>
          <CheckSquare size={40} style={{ opacity: 0.25, margin: '0 auto 12px' }} />
          <p style={{ fontSize: '0.9rem' }}>Nenhuma tarefa encontrada.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {grouped.map(([date, dateTasks]) => {
            const sorted = [...dateTasks].sort((a, b) => a.hora.localeCompare(b.hora));
            const doneCount    = sorted.filter((t) => t.concluida).length;
            const isToday      = date === TODAY;

            return (
              <section key={date}>
                {/* Date header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isToday && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', animation: 'glow 2s ease-in-out infinite', flexShrink: 0 }} />
                    )}
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: isToday ? 'var(--navy)' : 'var(--text2)', fontSize: isToday ? '1rem' : '0.92rem' }}>
                      {formatDateLabel(date)}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text3)', background: 'var(--bg3)', padding: '2px 8px', borderRadius: 6 }}>
                    {doneCount}/{sorted.length}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                </div>

                {/* Tasks */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sorted.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      toggleTask={toggleTask}
                      goToLead={goToLead}
                      leads={leads}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
