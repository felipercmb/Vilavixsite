import React, { useCallback, useEffect, useState } from "react";
import Logo from "../../components/Logo.jsx";
import Dashboard from "./Dashboard.jsx";
import Leads from "./Leads.jsx";
import Pipeline from "./Pipeline.jsx";
import Tarefas from "./Tarefas.jsx";
import ImoveisCRM from "./ImoveisCRM.jsx";
import Corretores from "./Corretores.jsx";
import AddImovel from "./AddImovel.jsx";
import Campanhas from "./Campanhas.jsx";
import AlugueisCRM from "./AlugueisCRM.jsx";
import { createRentalRepository } from "../../lib/rentals.js";
import * as db from "../../lib/db.js";
import { filterPortfolio } from "../../lib/broker-workflow.js";
import {
  catalogSnapshot,
  normalizeProperty,
  invalidateCatalog,
} from "../../lib/catalog.js";
import {
  dbToLead,
  leadToDb,
  dbToTask,
  taskToDb,
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
    { id: "pipeline", label: "Negociações", Icon: Kanban },
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
    [comments, setComments] = useState({}),
    [imoveis, setImoveis] = useState(
      catalogSnapshot.map((p) => ({ ...p, _imported: true })),
    ),
    [corretoresList, setCorretoresList] = useState([]),
    [currentProfile, setCurrentProfile] = useState(null),
    [rentalAccess, setRentalAccess] = useState(false),
    [rentalAccessError, setRentalAccessError] = useState(""),
    [loading, setLoading] = useState(true),
    [loaded, setLoaded] = useState(false),
    [loadErrors, setLoadErrors] = useState([]),
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
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadErrors([]);
    setRentalAccess(false);
    setRentalAccessError("");
    if (demo) {
      const data = readDemo();
      setLeads(data.leads);
      setTasks(data.tasks);
      setComments(data.comments || {});
      setCorretoresList(data.brokers);
      const merged = new Map(
        catalogSnapshot.map((p) => [String(p.id), { ...p, _imported: true }]),
      );
      (data.properties || []).forEach((p) => merged.set(String(p.id), p));
      setImoveis([...merged.values()]);
      setCurrentProfile({ id: "broker-demo-a", nome: "Corretor Exemplo A", role: "admin" });
      setRentalAccess(import.meta.env.DEV);
      setLoaded(true);
      setLoading(false);
      return;
    }
    const calls = [
      ["Leads", db.getLeads],
      ["Tarefas", db.getTasks],
      ["Histórico", db.getComments],
      ["Equipe", db.getProfiles],
      ["Perfil", () => db.getProfile(user?.id)],
      ["Imóveis", db.getImoveis],
      ["Acesso à locação", async () => ({ data: await createRentalRepository({ userId: user?.id }).getAccess() })],
    ];
    const results = await Promise.allSettled(calls.map(async ([, fn]) => fn()));
    const failures = [];
    results.forEach((result, i) => {
      const value =
        result.status === "fulfilled" ? result.value : { error: result.reason };
      if (value.error) {
        if (i === 6) setRentalAccessError("Não foi possível verificar sua permissão de acesso à carteira de aluguel.");
        failures.push(
          `${calls[i][0]}: ${value.error.message || "Não foi possível carregar."}`,
        );
        return;
      }
      const data = value.data;
      if (i === 0) setLeads((data || []).map(mapLead));
      if (i === 1) setTasks((data || []).map(dbToTask));
      if (i === 2) setComments(dbToComments(data || []));
      if (i === 3) setCorretoresList((data || []).map(dbToCorretor));
      if (i === 4) setCurrentProfile(data);
      if (i === 6) setRentalAccess(data === true);
      if (i === 5) {
        const map = new Map(
          catalogSnapshot.map((p) => [p.codigo, { ...p, _imported: true }]),
        );
        (data || []).forEach((row) => {
          const p = normalizeProperty(row);
          map.set(p.codigo, { ...p, _imported: false });
        });
        setImoveis([...map.values()]);
      }
    });
    setLoadErrors(failures);
    setLoaded(true);
    setLoading(false);
  }, [demo, user?.id]);
  useEffect(() => {
    loadData();
  }, [loadData]);
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
    setTasks((prev) =>
      prev.map((t) =>
        String(t.leadId) === String(id) ? { ...t, leadId: null } : t,
      ),
    );
  };
  const addTask = async (task) => {
    const next = { ...task, concluida: false };
    const data = await persist(() =>
      demo
        ? { data: { ...next, id: localId() } }
        : db.insertTask(taskToDb(next)),
    );
    const row = demo ? data : dbToTask(data);
    setTasks((prev) => [...prev, row]);
    return row;
  };
  const updateTask = async (id, changes) => {
    const old = tasks.find((t) => String(t.id) === String(id));
    const next = { ...old, ...changes };
    const data = await persist(() =>
      demo ? { data: next } : db.updateTask(id, taskToDb(next)),
    );
    const row = demo ? data : dbToTask(data);
    setTasks((prev) =>
      prev.map((t) => (String(t.id) === String(id) ? row : t)),
    );
    return row;
  };
  const toggleTask = (id) => {
    const task = tasks.find((t) => t.id === id);
    return updateTask(id, { concluida: !task?.concluida });
  };
  const deleteTask = async (id) => {
    await persist(() => (demo ? { data: true } : db.deleteTask(id)));
    setTasks((prev) => prev.filter((t) => t.id !== id));
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
    tasks,
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
  if (!demo && !loading && currentProfile?.ativo === false)
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
  const pending = tasks.filter(task => !task.concluida && task.data && task.data <= today() && (portfolioScope === "all" || !task.leadId || scopedLeadIds.has(String(task.leadId)))).length;
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
                  className={menu === id ? "active" : ""}
                  aria-current={menu === id ? "page" : undefined}
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
              {MENU.find((item) => item.id === menu)?.label || "Novo imóvel"}
            </div>
          </div>
          <div>
            {["dashboard", "leads", "pipeline", "tarefas", "visitas"].includes(menu) && (
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
              Carregando contatos e agenda…
            </div>
          ) : (
            pages[menu] || pages.dashboard
          )}
        </div>
      </main>
    </div>
  );
}
