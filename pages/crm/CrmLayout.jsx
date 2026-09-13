import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import Logo from "../../components/Logo.jsx";
const Dashboard = lazy(() => import("./Dashboard.jsx"));
const Leads = lazy(() => import("./Leads.jsx"));
const Pipeline = lazy(() => import("./Pipeline.jsx"));
const Tarefas = lazy(() => import("./Tarefas.jsx"));
const ImoveisCRM = lazy(() => import("./ImoveisCRM.jsx"));
const Corretores = lazy(() => import("./Corretores.jsx"));
const AddImovel = lazy(() => import("./AddImovel.jsx"));
const Campanhas = lazy(() => import("./Campanhas.jsx"));
const AlugueisCRM = lazy(() => import("./AlugueisCRM.jsx"));
import { createRentalRepository } from "../../lib/rentals.js";
import * as db from "../../lib/db.js";
import { filterPortfolio } from "../../lib/broker-workflow.js";
import { normalizeProperty } from "../../lib/property.js";
import { createCrmResourceLoader, crmResourcePlan, CRM_RESOURCE_LABELS } from "../../lib/crm-resources.js";
import { createCrmTaskCache } from "../../lib/crm-task-cache.js";
const invalidateCatalog = () => { void import("../../lib/catalog.js").then(module => module.invalidateCatalog()); };
import {
  dbToLead,
  leadToDb,
  dbToTask,
  taskToDb,
  taskChangesToDb,
  dbToComments,
  commentToDb,
  dbToCorretor,
} from "../../lib/mappers.js";
import { today, Alert, Avatar } from "./CRMUI.jsx";
import {
  LayoutDashboard,
  Plus,
  Users,
  Kanban,
  CheckSquare,
  Building2,
  UserCheck,
  LogOut,
  Globe,
  Megaphone,
  CalendarDays,
  KeyRound,
  Menu,
  RefreshCw,
} from "lucide-react";
import "../../styles/crm.css";
const MENU_GROUPS = [
  { label: "Atendimento", items: [
    { id: "dashboard", label: "Meu dia", Icon: LayoutDashboard },
    { id: "leads", label: "Contatos", Icon: Users },
    { id: "funil", label: "Funil completo", Icon: Kanban },
    { id: "tarefas", label: "Agenda e retornos", Icon: CheckSquare },
    { id: "visitas", label: "Visitas", Icon: CalendarDays },
  ] },
  { label: "Imóveis", items: [
    { id: "imoveis", label: "Catálogo", Icon: Building2 },
    { id: "add-imovel", label: "Cadastrar imóvel", Icon: Plus },
  ] },
  { label: "Locação", rentalOnly: true, items: [
    { id: "alugueis", label: "Carteira de aluguel", Icon: KeyRound },
  ] },
  { label: "Gestão", adminOnly: true, items: [
    { id: "campanhas", label: "Campanhas e roleta", Icon: Megaphone },
    { id: "corretores", label: "Equipe", Icon: UserCheck },
  ] },
];
const MENU = MENU_GROUPS.flatMap(group => group.items);
const REVIEW_KEY = "vilavix:crm:review:v3";
function demoSeed() {
  const day = today();
  return {
    leads: [
      {
        id: "demo-1",
        nome: "Contato Exemplo 01",
        email: "exemplo01@example.com",
        telefone: "",
        interesse: "Apartamento para a família",
        status: "novo",
        data: day,
        corretor: "",
        origem: "Site",
        prioridade: "alta",
        orcamento: "Até R$ 800 mil",
        notas: "Registro fictício para testar o atendimento.",
      },
      {
        id: "demo-2",
        nome: "Contato Exemplo 02",
        email: "exemplo02@example.com",
        telefone: "",
        interesse: "Imóvel próximo à praia",
        status: "atendimento",
        data: day,
        corretor: "Corretor Exemplo A",
        origem: "WhatsApp",
        prioridade: "media",
      },
      {
        id: "demo-3",
        nome: "Contato Exemplo 03",
        telefone: "",
        interesse: "Apartamento de 3 quartos",
        status: "visita",
        data: day,
        corretor: "Corretor Exemplo B",
        origem: "Indicação",
        prioridade: "alta",
      },
      {
        id: "demo-4",
        nome: "Contato Exemplo 04",
        telefone: "",
        interesse: "Casa com área externa",
        status: "proposta",
        data: day,
        corretor: "Corretor Exemplo A",
        origem: "Site",
        prioridade: "media",
      },
      {
        id: "demo-5",
        nome: "Contato Exemplo 05",
        telefone: "",
        interesse: "Apartamento compacto",
        status: "fechado",
        data: day,
        corretor: "Corretor Exemplo B",
        origem: "Site",
        prioridade: "baixa",
      },
      {
        id: "demo-6",
        nome: "Contato Exemplo 06",
        telefone: "",
        interesse: "Sala comercial",
        status: "novo",
        data: day,
        corretor: "",
        origem: "Manual",
        prioridade: "media",
      },
    ],
    tasks: [
      {
        id: "task-demo-1",
        titulo: "Preparar atendimento de exemplo",
        tipo: "ligacao",
        leadId: "demo-1",
        data: day,
        hora: "10:00",
        prioridade: "alta",
        concluida: false,
      },
      {
        id: "task-demo-2",
        titulo: "Visita de exemplo — confirmar detalhes",
        tipo: "visita",
        leadId: "demo-3",
        data: day,
        hora: "15:30",
        prioridade: "media",
        concluida: false,
      },
      {
        id: "task-demo-3",
        titulo: "Revisar proposta de exemplo",
        tipo: "geral",
        leadId: "demo-4",
        data: day,
        hora: "16:00",
        prioridade: "media",
        concluida: false,
      },
    ],
    comments: {},
    brokers: [
      {
        id: "broker-demo-a",
        nome: "Corretor Exemplo A",
        email: "corretora@example.com",
        ativo: true,
        role: "corretor",
        esp: "Residencial",
      },
      {
        id: "broker-demo-b",
        nome: "Corretor Exemplo B",
        email: "corretorb@example.com",
        ativo: true,
        role: "corretor",
        esp: "Residencial",
      },
    ],
    properties: [],
  };
}
function readDemo() {
  try {
    const saved = JSON.parse(localStorage.getItem(REVIEW_KEY) || "null");
    if (
      saved &&
      Array.isArray(saved.leads) &&
      Array.isArray(saved.tasks) &&
      Array.isArray(saved.brokers)
    )
      return saved;
  } catch {}
  return demoSeed();
}
const mapLead = (row) => ({
  ...dbToLead(row),
  imovelId: row.imovel_id || null,
  status: row.status === "contato" ? "atendimento" : row.status,
  corretorId: row.corretor_id,
  campaignId: row.campaign_id,
  imovelRef: row.imovel_ref,
});
const localId = () => crypto.randomUUID();
const leadPayload = (lead) => {
  const payload = leadToDb(lead);
  return {
    ...payload,
    corretor_id: lead.corretorId || null,
    campaign_id: lead.campaignId || null,
    imovel_ref: lead.imovelRef || payload.imovel_ref || null,
  };
};
const propertyPayload = (form) =>
  Object.fromEntries(
    [
      "titulo",
      "codigo",
      "slug",
      "tipo",
      "finalidade",
      "status",
      "preco",
      "cidade",
      "bairro",
      "estado",
      "endereco",
      "quartos",
      "suites",
      "banheiros",
      "vagas",
      "area",
      "andar",
      "ano",
      "condominio",
      "descricao",
      "caracteristicas",
      "destaque",
      "fotos",
    ]
      .filter((k) => k in form)
      .map((k) => [k, form[k]]),
  );
export default function CrmLayout({
  menu = "dashboard",
  setMenu,
  onLogout,
  navigate,
  user,
  demo = false,
}) {
  const [leads, setLeads] = useState([]),
    [tasks, setTasks] = useState([]),
    [visitTasks, setVisitTasks] = useState([]),
    [comments, setComments] = useState({}),
    [imoveis, setImoveis] = useState([]),
    [corretoresList, setCorretoresList] = useState([]),
    [currentProfile, setCurrentProfile] = useState(null),
    [rentalAccess, setRentalAccess] = useState(false),
    [rentalAccessError, setRentalAccessError] = useState(""),
    [resourceStatus, setResourceStatus] = useState({}),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [focusLeadId, setFocusLeadId] = useState(null),
    [mobileOpen, setMobileOpen] = useState(false),
    [portfolioScope, setPortfolioScope] = useState(() => {
      try { return localStorage.getItem(`vilavix:portfolio:${demo ? "review" : user?.id}`) || (demo ? "all" : "mine"); }
      catch { return demo ? "all" : "mine"; }
    }),
    [taskDraft, setTaskDraft] = useState(null),
    [agendaFilter, setAgendaFilter] = useState("all"),
    [leadQueueFilter, setLeadQueueFilter] = useState(null);
  useEffect(() => {
    try { localStorage.setItem(`vilavix:portfolio:${demo ? "review" : user?.id}`, portfolioScope); }
    catch { /* Scope is a viewing preference, not business data. */ }
  }, [demo, user?.id, portfolioScope]);
  const resourceLoader = useRef(null);
  const taskCache = useRef(null);
  if (!taskCache.current) taskCache.current = createCrmTaskCache();
  const syncTaskState = (snapshot) => { setTasks(snapshot.tasks); setVisitTasks(snapshot.visits); };
  const currentMenu = menu === "pipeline" ? "funil" : menu;
  const plan = crmResourcePlan(currentMenu);
  const profileReady = demo ? loaded : resourceStatus.profile?.state === "ready";
  const resourceReady = (name) => demo ? loaded : resourceStatus[name]?.state === "ready";
  const profileLoading = !demo && !["ready", "error"].includes(resourceStatus.profile?.state);
  const requiredLoading = !demo && plan.required.some(name => !["ready", "error"].includes(resourceStatus[name]?.state));
  const loading = demo ? !loaded : profileLoading || (resourceStatus.profile?.state !== "error" && requiredLoading);
  const visibleResources = new Set(["profile", "rentalAccess", ...plan.required, ...plan.background]);
  const loadErrors = Object.entries(resourceStatus).filter(([name, value]) => visibleResources.has(name) && value.state === "error")
    .map(([name, value]) => `${CRM_RESOURCE_LABELS[name]}: ${value.error}`);
  const requiredError = !demo && (resourceStatus.profile?.state === "error" || plan.required.some(name => resourceStatus[name]?.state === "error"));
  useEffect(() => {
    let live = true;
    setLoaded(false);
    setCurrentProfile(null);
    setRentalAccess(false);
    setRentalAccessError("");
    setResourceStatus({});
    taskCache.current.reset();
    if (demo) {
      void import("../../lib/catalog.js").then(({ catalogSnapshot }) => {
        if (!live) return;
        const data = readDemo();
        setLeads(data.leads);
        syncTaskState(taskCache.current.applyRead("tasks", data.tasks, taskCache.current.beginRead()));
        setComments(data.comments || {}); setCorretoresList(data.brokers);
        const merged = new Map(catalogSnapshot.map(p => [String(p.id), { ...p, _imported: true }]));
        (data.properties || []).forEach(p => merged.set(String(p.id), p));
        setImoveis([...merged.values()]);
        setCurrentProfile({ id: "broker-demo-a", nome: "Corretor Exemplo A", role: "admin" });
        setRentalAccess(import.meta.env.DEV); setLoaded(true);
      }).catch(() => { if (live) setError("Não foi possível carregar a revisão local."); });
      return () => { live = false; };
    }
    setLeads([]); setTasks([]); setVisitTasks([]); setComments({}); setImoveis([]); setCorretoresList([]);
    const readTasks = async (kind, signal) => {
      const token = taskCache.current.beginRead();
      const result = await db.getTasks({ ...(kind === "visits" ? { tipo: "visita" } : {}), signal });
      return { ...result, data: { token, rows: (result.data || []).map(dbToTask) } };
    };
    const loader = createCrmResourceLoader({
      profile: () => db.getProfile(user?.id),
      leads: db.getLeads,
      tasks: signal => readTasks("tasks", signal),
      visits: signal => readTasks("visits", signal),
      comments: db.getComments,
      profiles: db.getProfiles,
      properties: db.getImoveis,
      rentalAccess: async () => ({ data: await createRentalRepository({ userId: user?.id }).getAccess() }),
    }, {
      onStatus: (name, status) => {
        setResourceStatus(previous => ({ ...previous, [name]: status }));
        if (name === "rentalAccess") setRentalAccessError(status.error || "");
      },
      onData: (name, data) => {
        if (name === "profile") setCurrentProfile(data);
        if (name === "leads") setLeads((data || []).map(mapLead));
        if (name === "tasks" || name === "visits") syncTaskState(taskCache.current.applyRead(name, data.rows, data.token));
        if (name === "comments") setComments(dbToComments(data || []));
        if (name === "profiles") setCorretoresList((data || []).map(dbToCorretor));
        if (name === "properties") setImoveis((data || []).map(row => ({ ...normalizeProperty(row), _imported: false })));
        if (name === "rentalAccess") setRentalAccess(data === true);
      },
    });
    resourceLoader.current = loader;
    void loader.load("profile");
    return () => { live = false; loader.dispose(); resourceLoader.current = null; };
  }, [demo, user?.id]);
  useEffect(() => {
    if (demo || !profileReady || !currentProfile?.ativo) return;
    const next = crmResourcePlan(currentMenu);
    void resourceLoader.current?.ensure([...next.required, ...next.background, "rentalAccess"]);
  }, [demo, currentMenu, profileReady, currentProfile?.ativo]);
  const loadData = useCallback(() => {
    if (demo) return;
    const next = crmResourcePlan(currentMenu);
    return resourceLoader.current?.ensure(["profile", ...next.required, ...next.background, "rentalAccess"], { refresh: true });
  }, [demo, currentMenu]);
  useEffect(() => {
    if (!demo || !loaded) return;
    try {
      localStorage.setItem(
        REVIEW_KEY,
        JSON.stringify({
          leads,
          tasks,
          comments,
          brokers: corretoresList,
          properties: imoveis.filter((p) => p._localChanged || !p._imported),
        }),
      );
    } catch {
      setError(
        "Não foi possível salvar a revisão neste navegador. Confira o armazenamento local.",
      );
    }
  }, [demo, loaded, leads, tasks, comments, corretoresList, imoveis]);
  const persist = async (fn) => {
    setError("");
    try {
      if (!demo && !user?.id)
        throw new Error("Sua sessão expirou. Entre novamente para salvar.");
      const result = await fn();
      if (result?.error) throw result.error;
      if (result?.data == null)
        throw new Error(
          "A operação não foi confirmada pelo banco. Tente atualizar os dados.",
        );
      return result.data;
    } catch (err) {
      setError(err.message || "Não foi possível salvar. Tente novamente.");
      throw err;
    }
  };
  const addComment = async (leadId, texto) => {
    if (!texto.trim()) throw new Error("Escreva uma anotação.");
    const autor = currentProfile?.nome || "Corretor";
    const data = await persist(() =>
      demo
        ? { data: { id: localId(), texto: texto.trim(), autor, data: today() } }
        : db.insertComment(commentToDb(leadId, texto.trim(), autor)),
    );
    const row = demo
      ? data
      : {
          id: data.id,
          texto: data.texto,
          autor: data.autor,
          data: data.created_at,
        };
    setComments((prev) => ({
      ...prev,
      [leadId]: [...(prev[leadId] || []), row],
    }));
    return row;
  };
  const updateLead = async (id, changes) => {
    const old = leads.find((l) => String(l.id) === String(id));
    if (!old) throw new Error("Lead não encontrado.");
    const next = {
      ...old,
      ...changes,
      ...(changes.status && changes.status !== old.status
        ? { statusChangedAt: today() }
        : {}),
    };
    const payload = leadPayload(next);
    const data = await persist(() =>
      demo ? { data: next } : db.updateLead(id, payload),
    );
    const row = demo ? data : mapLead(data);
    setLeads((prev) =>
      prev.map((l) => (String(l.id) === String(id) ? row : l)),
    );
    if (changes.status && changes.status !== old.status) {
      try {
        await addComment(
          id,
          `Etapa atualizada: ${old.status} → ${changes.status}.`,
        );
      } catch {
        setError("Etapa salva, mas o histórico não pôde ser registrado.");
      }
    }
    return row;
  };
  const addLead = async (lead) => {
    const next = {
      ...lead,
      status: lead.status || "novo",
      data: lead.data || today(),
      prioridade: lead.prioridade || "media",
    };
    const data = await persist(() =>
      demo
        ? { data: { ...next, id: localId() } }
        : db.insertLead(leadPayload(next)),
    );
    const row = demo ? data : mapLead(data);
    setLeads((prev) => [row, ...prev]);
    return row;
  };
  const deleteLead = async (id) => {
    await persist(() => (demo ? { data: true } : db.deleteLead(id)));
    setLeads((prev) => prev.filter((l) => String(l.id) !== String(id)));
    setComments((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    syncTaskState(taskCache.current.unlinkLead(id));
  };
  const addTask = async (task) => {
    const lead = leads.find((item) => String(item.id) === String(task.leadId));
    const corretor = currentProfile?.role === "admin"
      ? task.corretor || lead?.corretor || currentProfile?.nome
      : currentProfile?.nome;
    const next = { ...task, corretor, concluida: false };
    const data = await persist(() =>
      demo
        ? { data: { ...next, id: localId() } }
        : db.insertTask(taskToDb(next)),
    );
    const row = demo ? data : dbToTask(data);
    syncTaskState(taskCache.current.upsert(row));
    return row;
  };
  const updateTask = async (id, changes) => {
    const old = taskCache.current.snapshot().tasks.find((t) => String(t.id) === String(id));
    if (!old) throw new Error("Atividade não encontrada. Atualize a agenda.");
    const next = { ...old, ...changes };
    const data = await persist(() =>
      demo ? { data: next } : db.updateTask(id, taskChangesToDb(changes)),
    );
    const row = demo ? data : dbToTask(data);
    syncTaskState(taskCache.current.upsert(row));
    return row;
  };
  const toggleTask = (id) => {
    const task = taskCache.current.snapshot().tasks.find((t) => String(t.id) === String(id));
    return updateTask(id, { concluida: !task?.concluida });
  };
  const deleteTask = async (id) => {
    await persist(() => (demo ? { data: true } : db.deleteTask(id)));
    syncTaskState(taskCache.current.remove(id));
  };
  const addImovel = async (imovel) => {
    const data = await persist(() =>
      demo
        ? { data: { ...imovel, id: localId(), _localChanged: true } }
        : db.insertImovel(propertyPayload(imovel)),
    );
    const row = {
      ...normalizeProperty(data),
      _imported: false,
      _localChanged: demo,
    };
    setImoveis((prev) => [row, ...prev]);
    if (!demo) invalidateCatalog();
    return row;
  };
  const updateImovel = async (id, changes) => {
    const old = imoveis.find((p) => String(p.id) === String(id));
    if (old?._imported && !demo)
      throw new Error(
        "Este imóvel está no catálogo importado. A edição persistente estará disponível após a importação no banco.",
      );
    const data = await persist(() =>
      demo
        ? { data: { ...old, ...changes, _localChanged: true } }
        : db.updateImovel(id, propertyPayload(changes)),
    );
    const row = demo ? data : { ...normalizeProperty(data), _imported: false };
    setImoveis((prev) =>
      prev.map((p) => (String(p.id) === String(id) ? row : p)),
    );
    if (!demo) invalidateCatalog();
    return row;
  };
  const updateCorretor = async (id, changes) => {
    if (currentProfile?.role !== "admin")
      throw new Error("Somente administradores podem editar a equipe.");
    const payload = { ...changes };
    if ("esp" in payload) {
      payload.especialidade = payload.esp;
      delete payload.esp;
    }
    const old = corretoresList.find((c) => c.id === id);
    const data = await persist(() =>
      demo ? { data: { ...old, ...changes } } : db.updateProfile(id, payload),
    );
    const row = demo ? data : dbToCorretor(data);
    setCorretoresList((prev) => prev.map((c) => (c.id === id ? row : c)));
    return row;
  };
  const addCorretor = async (c) => {
    if (!demo)
      throw new Error(
        "Novos corretores precisam de uma conta autenticada. Solicite o acesso ao administrador.",
      );
    const row = { ...c, id: localId(), ativo: true, role: "corretor" };
    setCorretoresList((prev) => [...prev, row]);
    return row;
  };
  const refreshLeads = async () => {
    if (demo) return;
    const result = await db.getLeads();
    if (result.error) throw result.error;
    setLeads((result.data || []).map(mapLead));
  };
  const goToLead = (id) => {
    setFocusLeadId(id);
    setMenu("leads");
  };
  const openTaskDraft = (leadId = "", tipo = "ligacao", taskId = null) => {
    setTaskDraft({ leadId, tipo, taskId });
    setMenu(tipo === "visita" ? "visitas" : "tarefas");
    setMobileOpen(false);
  };
  const shared = {
    portfolioScope,
    setPortfolioScope,
    taskDraft,
    setTaskDraft,
    openTaskDraft,
    agendaFilter,
    setAgendaFilter,
    leadQueueFilter,
    setLeadQueueFilter,
    demo,
    leads,
    tasks: currentMenu === "visitas" ? visitTasks : tasks,
    tasksLoading: !resourceReady("tasks") && resourceStatus.tasks?.state !== "error",
    tasksError: resourceStatus.tasks?.error || "",
    comments,
    imoveis,
    corretoresList,
    currentProfile,
    loading,
    updateLead,
    addLead,
    deleteLead,
    toggleTask,
    addTask,
    updateTask,
    deleteTask,
    addComment,
    updateImovel,
    addImovel,
    updateCorretor,
    addCorretor,
    goToLead,
    focusLeadId,
    setFocusLeadId,
    navigate,
    setMenu,
    refreshData: loadData,
    refreshLeads,
    setNotice,
  };
  const pages = {
    dashboard: <Dashboard {...shared} />,
    leads: <Leads {...shared} />,
    funil: <Pipeline {...shared} />,
    pipeline: <Pipeline {...shared} />,
    tarefas: <Tarefas key="tarefas" {...shared} />,
    visitas: <Tarefas key="visitas" {...shared} visitsOnly />,
    campanhas: <Campanhas {...shared} />,
    alugueis: rentalAccess && (demo || currentProfile?.id === user?.id) ? (
      <AlugueisCRM {...shared} />
    ) : (
      <section className="crm-panel crm-empty">
        <KeyRound size={28} />
        <h2>{rentalAccessError ? "Permissão não verificada" : "Carteira de aluguel restrita"}</h2>
        <p>{rentalAccessError || "Contratos e movimentações financeiras ficam disponíveis somente para as contas autorizadas pela VilaVix."}</p>
        {rentalAccessError && <button className="crm-btn" onClick={loadData}>Verificar novamente</button>}
        <button className="crm-btn crm-btn-ghost" onClick={() => setMenu("dashboard")}>Voltar para Meu dia</button>
      </section>
    ),
    imoveis: <ImoveisCRM {...shared} />,
    corretores: <Corretores {...shared} />,
    "add-imovel": <AddImovel {...shared} />,
  };
  if (!demo && profileReady && currentProfile?.ativo !== true)
    return (
      <div className="crm-root">
        <div className="crm-login-form" style={{ minHeight: "100vh" }}>
          <div>
            <Logo />
            <h2>Acesso aguardando ativação</h2>
            <p>
              Seu cadastro foi recebido. Um administrador da VilaVix precisa
              ativar seu perfil para liberar o CRM.
            </p>
            <button className="crm-btn" onClick={onLogout}>
              Voltar para o site
            </button>
          </div>
        </div>
      </div>
    );
  const scopedLeadIds = new Set(filterPortfolio(leads, portfolioScope, currentProfile).map(lead => String(lead.id)));
  const pending = resourceReady("tasks") ? tasks.filter(task => !task.concluida && task.data && task.data <= today() && (portfolioScope === "all" || !task.leadId || scopedLeadIds.has(String(task.leadId)))).length : 0;
  const changeMenu = (id) => {
    setMenu(id);
    setMobileOpen(false);
    setNotice("");
  };
  return (
    <div className="crm-root">
      {mobileOpen && (
        <button
          className="crm-sidebar-scrim"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`crm-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="crm-brand">
          <Logo />
          <div className="crm-brand-label">Área da equipe</div>
        </div>
        <nav aria-label="Navegação do CRM">
          {MENU_GROUPS.filter(group => (!group.adminOnly || currentProfile?.role === "admin") && (!group.rentalOnly || rentalAccess)).map(group => (
            <div className="crm-nav-group" key={group.label}>
              <p className="crm-nav-caption">{group.label}</p>
              {group.items.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  className={currentMenu === id ? "active" : ""}
                  aria-current={currentMenu === id ? "page" : undefined}
                  onClick={() => changeMenu(id)}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                  {id === "tarefas" && pending > 0 && <b>{pending}</b>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="crm-sidebar-footer">
          <button onClick={() => navigate("home")}>
            <Globe size={16} />
            Abrir site público
          </button>
          <button onClick={onLogout}>
            <LogOut size={16} />
            {demo ? "Sair da revisão" : "Sair da conta"}
          </button>
          <div className="crm-sidebar-person">
            <Avatar name={currentProfile?.nome || user?.email} />
            <div>
              <strong>
                {currentProfile?.nome ||
                  user?.email?.split("@")[0] ||
                  "Corretor"}
              </strong>
              <small>
                {demo
                  ? "Revisão local"
                  : currentProfile?.role === "admin"
                    ? "Administrador"
                    : "Corretor"}
              </small>
            </div>
          </div>
        </div>
      </aside>
      <main className="crm-main">
        <header className="crm-topbar">
          <div>
            <button
              className="crm-icon-btn crm-mobile-toggle"
              aria-label="Abrir menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={19} />
            </button>
            <div className="crm-topbar-label">
              <span>VilaVix</span>
              {MENU.find((item) => item.id === currentMenu)?.label || "Novo imóvel"}
            </div>
          </div>
          <div>
            {["dashboard", "leads", "tarefas", "visitas"].includes(currentMenu) && (
              <label className="crm-portfolio-select">
                <span className="crm-sr-only">Carteira em exibição</span>
                <select value={portfolioScope} onChange={event => setPortfolioScope(event.target.value)}>
                  <option value="mine">Minha carteira</option>
                  <option value="all">Todos os contatos</option>
                  <option value="unassigned">Sem corretor</option>
                </select>
              </label>
            )}
            <span className="crm-topbar-date">
              {new Date().toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <button
              className="crm-icon-btn"
              title="Atualizar dados"
              aria-label="Atualizar dados"
              disabled={loading}
              onClick={loadData}
            >
              <RefreshCw size={14} />
            </button>
            <Avatar name={currentProfile?.nome || "VX"} />
          </div>
        </header>
        {demo && (
          <div className="crm-demo-banner">
            <strong>Revisão local</strong>
            <span>Contatos e equipe de exemplo. Alterações ficam neste navegador; imóveis e campanhas vêm das fontes reais.</span>
          </div>
        )}
        {loadErrors.length > 0 && (
          <div className="crm-load-error">
            <Alert>
              Não foi possível carregar todos os dados. {loadErrors.join(" · ")}{" "}
              <button className="crm-link" onClick={loadData}>
                Tentar novamente
              </button>
            </Alert>
          </div>
        )}
        <div className="crm-content">
          <Alert>{error}</Alert>
          <Alert tone="success">{notice}</Alert>
          {loading ? (
            <div className="crm-empty" role="status">
              {profileLoading ? "Verificando sua conta…" : `Carregando ${MENU.find(item => item.id === currentMenu)?.label.toLowerCase() || "esta aba"}…`}
            </div>
          ) : requiredError ? (
            <div className="crm-empty" role="status"><p>Esta aba não pôde ser carregada por completo.</p><button className="crm-btn" onClick={loadData}>Tentar novamente</button></div>
          ) : (
            <Suspense fallback={<div className="crm-empty" role="status">Abrindo {MENU.find(item => item.id === currentMenu)?.label.toLowerCase() || "esta aba"}…</div>}>
              {pages[currentMenu] || pages.dashboard}
            </Suspense>
          )}
        </div>
      </main>
    </div>
  );
}
