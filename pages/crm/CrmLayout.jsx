import React, { useState, useEffect } from 'react';
import Logo from '../../components/Logo.jsx';
import Dashboard from './Dashboard.jsx';
import Leads from './Leads.jsx';
import Pipeline from './Pipeline.jsx';
import Tarefas from './Tarefas.jsx';
import ImoveisCRM from './ImoveisCRM.jsx';
import Corretores from './Corretores.jsx';
import AddImovel from './AddImovel.jsx';
import { leads as initialLeads } from '../../data/leads.js';
import { initialTasks } from '../../data/tasks.js';
import { initialComments } from '../../data/comments.js';
import { imoveis as initialImoveis } from '../../data/imoveis.js';
import { corretores as initialCorretores } from '../../data/corretores.js';
import * as db from '../../lib/db.js';
import { supabase } from '../../lib/supabase.js';
import { dbToLead, leadToDb, dbToTask, taskToDb, dbToComments, commentToDb, dbToCorretor } from '../../lib/mappers.js';
import { runAutomation, generateTasksForLead } from '../../lib/automation.js';
import {
  LayoutDashboard, Users, Kanban, CheckSquare, Building2,
  UserCheck, PlusSquare, LogOut, Globe, ChevronRight,
} from 'lucide-react';

const MENU = [
  { id: 'dashboard',  label: 'Dashboard',        Icon: LayoutDashboard },
  { id: 'leads',      label: 'Leads',            Icon: Users           },
  { id: 'pipeline',   label: 'Pipeline',         Icon: Kanban          },
  { id: 'tarefas',    label: 'Tarefas',          Icon: CheckSquare     },
  { id: 'imoveis',    label: 'Imóveis',          Icon: Building2       },
  { id: 'corretores', label: 'Corretores',       Icon: UserCheck       },
  { id: 'add-imovel', label: 'Cadastrar Imóvel', Icon: PlusSquare      },
];

export default function CrmLayout({ menu, setMenu, onLogout, navigate, user }) {
  // ── Shared state ──────────────────────────────────────────
  const [leads, setLeads]       = useState(initialLeads);
  const [tasks, setTasks]       = useState(initialTasks);
  const [comments, setComments] = useState(initialComments);
  const [imoveis, setImoveis]       = useState(initialImoveis);
  const [corretoresList, setCorretoresList] = useState(
    initialCorretores.map((c, i) => ({ ...c, role: i === 0 ? 'admin' : 'corretor', ativo: true }))
  );
  const [currentProfile, setCurrentProfile] = useState(null);
  const [dbReady, setDbReady] = useState(false);

  // ── Carregar dados do Supabase (se disponível) ────────────
  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      // Tenta carregar imoveis (tabela pública, não precisa de auth)
      const { data: imData } = await db.getImoveis();
      if (!cancelled && imData?.length) setImoveis(imData);

      // Dados que precisam de auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [leadsRes, tasksRes, commentsRes, profilesRes, profileRes] = await Promise.all([
        db.getLeads(),
        db.getTasks(),
        db.getComments(),
        db.getProfiles(),
        db.getProfile(session.user.id),
      ]);

      if (cancelled) return;
      const mappedLeads = leadsRes.data?.length ? leadsRes.data.map(dbToLead) : null;
      const mappedTasks = tasksRes.data?.length ? tasksRes.data.map(dbToTask) : null;

      if (mappedLeads)              setLeads(mappedLeads);
      if (mappedTasks)              setTasks(mappedTasks);
      if (commentsRes.data?.length) setComments(dbToComments(commentsRes.data));
      if (profilesRes.data?.length) setCorretoresList(profilesRes.data.map(dbToCorretor));
      if (profileRes.data)          setCurrentProfile(profileRes.data);
      setDbReady(true);

      // Roda automação após carregar dados do banco
      if (mappedLeads && mappedTasks) {
        const autoTasks = runAutomation(mappedLeads, mappedTasks);
        if (autoTasks.length > 0) {
          setTasks(prev => {
            const existingIds = new Set(prev.map(t => t.titulo + '|' + t.leadId));
            const novos = autoTasks.filter(t => !existingIds.has(t.titulo + '|' + t.leadId));
            if (!novos.length) return prev;
            // Persiste no Supabase
            novos.forEach(t => db.insertTask(taskToDb(t)));
            return [...prev, ...novos.map((t, i) => ({ ...t, id: Date.now() + i }))];
          });
        }
      }
    }
    loadAll();
    return () => { cancelled = true; };
  }, []);

  // Selected lead (para navegar de Tarefas → Leads abrindo um lead específico)
  const [focusLeadId, setFocusLeadId] = useState(null);

  // ── Helpers (otimista: atualiza UI imediatamente + persiste no banco) ─
  const toggleTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    const next = !task?.concluida;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, concluida: next } : t));
    if (dbReady) db.toggleTask(taskId, next);
  };

  const addTask = async (task) => {
    const localId = Date.now();
    const newTask = { ...task, id: localId, concluida: false };
    setTasks(prev => [...prev, newTask]);
    if (dbReady) {
      const { data } = await db.insertTask(taskToDb(newTask));
      if (data) setTasks(prev => prev.map(t => t.id === localId ? dbToTask(data) : t));
    }
  };

  const addComment = async (leadId, texto) => {
    const autor = currentProfile?.nome?.split(' ')[0] || 'Corretor';
    const newComment = { id: Date.now(), texto, data: new Date().toISOString().split('T')[0], autor };
    setComments(prev => ({ ...prev, [leadId]: [...(prev[leadId] || []), newComment] }));
    if (dbReady) db.insertComment(commentToDb(leadId, texto, autor));
  };

  const updateLead = async (leadId, changes) => {
    setLeads(prev => {
      const oldLead = prev.find(l => l.id === leadId);
      const newLead = { ...oldLead, ...changes };

      // Se mudou de status → registra data da mudança + dispara automação
      if (changes.status && changes.status !== oldLead?.status) {
        newLead.statusChangedAt = new Date().toISOString().split('T')[0];

        // Gera tasks automáticas para o novo status
        setTasks(prevTasks => {
          const autoTasks = generateTasksForLead(newLead, prevTasks);
          const existingKeys = new Set(prevTasks.map(t => t.titulo + '|' + t.leadId));
          const novos = autoTasks.filter(t => !existingKeys.has(t.titulo + '|' + t.leadId));
          if (!novos.length) return prevTasks;
          novos.forEach(t => db.insertTask(taskToDb(t)));
          return [...prevTasks, ...novos.map((t, i) => ({ ...t, id: Date.now() + i }))];
        });
      }

      return prev.map(l => l.id === leadId ? newLead : l);
    });

    if (dbReady) {
      const dbChanges = { ...changes };
      if ('imovelId' in changes) { dbChanges.imovel_id = changes.imovelId; delete dbChanges.imovelId; }
      if (changes.status) dbChanges.status_changed_at = new Date().toISOString().split('T')[0];
      db.updateLead(leadId, dbChanges);
    }
  };

  const addLead = async (lead) => {
    const localId = Date.now();
    const newLead = { ...lead, id: localId };
    setLeads(prev => [...prev, newLead]);
    if (dbReady) {
      const { data } = await db.insertLead(leadToDb(lead));
      if (data) setLeads(prev => prev.map(l => l.id === localId ? dbToLead(data) : l));
    }
  };

  const deleteLead = async (leadId) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
    setComments(prev => { const next = { ...prev }; delete next[leadId]; return next; });
    if (dbReady) db.deleteLead(leadId);
  };

  const updateImovel = async (imovelId, changes) => {
    setImoveis(prev => prev.map(im => im.id === imovelId ? { ...im, ...changes } : im));
    if (dbReady) db.updateImovel(imovelId, changes);
  };

  const addImovel = async (imovel) => {
    const localId = Date.now();
    setImoveis(prev => [...prev, { ...imovel, id: localId }]);
    if (dbReady) {
      const { data } = await db.insertImovel(imovel);
      if (data) setImoveis(prev => prev.map(im => im.id === localId ? { ...im, id: data.id } : im));
    }
  };

  const deleteImovel = async (imovelId) => {
    setImoveis(prev => prev.filter(im => im.id !== imovelId));
    if (dbReady) db.deleteImovel(imovelId);
  };

  const updateCorretor = async (id, changes) => {
    setCorretoresList(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c));
    if (dbReady) db.updateProfile(id, changes);
  };

  const addCorretor = (corretor) =>
    setCorretoresList(prev => [...prev, { ...corretor, id: Date.now(), ativo: true }]);

  const deleteCorretor = (id) =>
    setCorretoresList(prev => prev.filter(c => c.id !== id));

  // Navega para a aba Leads e abre um lead específico
  const goToLead = (leadId) => {
    setFocusLeadId(leadId);
    setMenu('leads');
  };

  // ── Shared props ──────────────────────────────────────────
  const shared = {
    leads, setLeads, updateLead, addLead, deleteLead,
    tasks, toggleTask, addTask,
    comments, addComment,
    imoveis, setImoveis, updateImovel, addImovel, deleteImovel,
    corretoresList, updateCorretor, addCorretor, deleteCorretor,
    goToLead,
    focusLeadId, setFocusLeadId,
    navigate,
  };

  const pages = {
    dashboard:    <Dashboard   {...shared} setMenu={setMenu} />,
    leads:        <Leads       {...shared} />,
    pipeline:     <Pipeline    {...shared} />,
    tarefas:      <Tarefas     {...shared} />,
    imoveis:      <ImoveisCRM  {...shared} setMenu={setMenu} />,
    corretores:   <Corretores  {...shared} />,
    'add-imovel': <AddImovel   {...shared} setMenu={setMenu} />,
  };

  const pendingToday = tasks.filter(t =>
    !t.concluida && t.data === '2026-03-20'
  ).length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 'var(--sidebar-w)', background: 'var(--navy-deep)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <Logo light />
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', animation: 'glow 2s ease-in-out infinite' }} />
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem' }}>Sistema CRM v2.0</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0 8px', marginBottom: 8 }}>
            Menu principal
          </p>
          {MENU.map(({ id, label, Icon }) => {
            const active = menu === id;
            const showBadge = id === 'tarefas' && pendingToday > 0;
            return (
              <button
                key={id}
                onClick={() => setMenu(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '11px 12px', borderRadius: 10,
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: active ? 600 : 400,
                  marginBottom: 2,
                  background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: active ? 'white' : 'rgba(255,255,255,0.50)',
                  borderLeft: `3px solid ${active ? 'var(--red)' : 'transparent'}`,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.80)'; } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.50)'; } }}
              >
                <Icon size={17} />
                <span style={{ flex: 1 }}>{label}</span>
                {showBadge && (
                  <span style={{ background: 'var(--red)', color: 'white', fontSize: '0.65rem', fontWeight: 700, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {pendingToday}
                  </span>
                )}
                {active && !showBadge && <ChevronRight size={14} style={{ opacity: 0.6 }} />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={() => navigate('home')} style={sideBtn}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}>
            <Globe size={17} /> Ver site
          </button>
          <button onClick={onLogout} style={sideBtn}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(198,40,40,0.15)'; e.currentTarget.style.color = '#EF9A9A'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}>
            <LogOut size={17} /> Sair
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 8px 0', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 4 }}>
            <div className="avatar" style={{ width: 34, height: 34, fontSize: '0.75rem', background: currentProfile?.role === 'admin' ? '#7C3AED' : 'var(--red)', flexShrink: 0 }}>
              {currentProfile?.foto || (user?.email?.slice(0,2).toUpperCase() || 'VX')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'white', fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentProfile?.nome?.split(' ')[0] || user?.email?.split('@')[0] || 'Corretor'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem' }}>
                {currentProfile?.role === 'admin' ? 'Administrador' : 'Corretor'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: 'var(--sidebar-w)', flex: 1, minHeight: '100vh' }}>
        {pages[menu] || pages.dashboard}
      </main>
    </div>
  );
}

const sideBtn = {
  display: 'flex', alignItems: 'center', gap: 12,
  width: '100%', padding: '11px 12px', borderRadius: 10,
  border: 'none', cursor: 'pointer',
  background: 'transparent', color: 'rgba(255,255,255,0.45)',
  fontFamily: 'var(--font-body)', fontSize: '0.88rem',
  transition: 'all 0.2s ease',
};
