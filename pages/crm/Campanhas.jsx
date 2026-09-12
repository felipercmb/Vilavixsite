import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Megaphone,
  RefreshCw,
  SlidersHorizontal,
  Shuffle,
  CheckCircle2,
  Plus,
  History,
  Users,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import {
  getCampaigns,
  saveCampaign,
  syncZernioCampaigns,
  getRoutingPreview,
  routeLead,
  getRoutingHistory,
} from "../../lib/campaigns.js";
import {
  PageHeader,
  SearchBox,
  Stat,
  Badge,
  Empty,
  Dialog,
  Field,
  Alert,
  Avatar,
  matches,
  stamp,
} from "./CRMUI.jsx";
const ACTIVE = (c) =>
  c.effective_status === "ACTIVE" &&
  (!c.start_time || new Date(c.start_time) <= new Date()) &&
  (!c.stop_time || new Date(c.stop_time) >= new Date());
const STATUS = {
  ACTIVE: "Ativa",
  PAUSED: "Pausada",
  ARCHIVED: "Arquivada",
  DELETED: "Excluída",
  COMPLETED: "Encerrada",
  CAMPAIGN_PAUSED: "Campanha pausada",
  ADSET_PAUSED: "Conjunto pausado",
  DISAPPROVED: "Reprovada",
  IN_PROCESS: "Em análise",
  WITH_ISSUES: "Com pendências",
};
function CampaignRules({
  campaign,
  brokers,
  onClose,
  onSave,
  demo,
  canManage,
}) {
  const [form, setForm] = useState({
      ...campaign,
      broker_ids: (campaign.broker_ids || []).map(String),
      weights: campaign.weights || {},
      daily_limit: campaign.daily_limit ?? "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const toggle = (id) =>
    setForm((p) => ({
      ...p,
      broker_ids: p.broker_ids.includes(String(id))
        ? p.broker_ids.filter((v) => v !== String(id))
        : [...p.broker_ids, String(id)],
    }));
  return (
    <Dialog
      title="Regras de distribuição"
      subtitle={campaign.name}
      onClose={onClose}
      wide
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setBusy(true);
          try {
            await onSave({
              ...form,
              daily_limit:
                form.daily_limit === "" ? null : Number(form.daily_limit),
            });
            onClose();
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="crm-dialog-body">
          <Alert>{error}</Alert>
          <Alert tone="info">
            {demo ? "Regras desta revisão são locais. " : ""}A campanha e seu
            status vêm da origem. Salvar estas regras não ativa, pausa nem
            altera anúncios.
          </Alert>
          {!ACTIVE(campaign) && (
            <Alert tone="warning">
              Esta campanha não está ativa no período atual. Você pode preparar
              a equipe, mas a roleta não distribuirá leads enquanto ela estiver
              inelegível.
            </Alert>
          )}
          <fieldset
            disabled={!canManage || busy}
            style={{ border: 0, padding: 0 }}
          >
            <label className="crm-checkbox">
              <input
                type="checkbox"
                checked={Boolean(form.routing_enabled)}
                onChange={(e) =>
                  setForm((p) => ({ ...p, routing_enabled: e.target.checked }))
                }
              />
              Habilitar distribuição de leads desta campanha
            </label>
            <h3 className="crm-section-title">Corretores participantes</h3>
            <p
              className="crm-text-muted"
              style={{ fontSize: 11, marginBottom: 12 }}
            >
              Pesos proporcionais equilibram a fila. Peso 2 recebe o dobro da
              participação de peso 1. Perfis inativos não recebem leads.
            </p>
            {brokers.length ? (
              brokers.map((b) => (
                <div className="crm-rule-row" key={b.id}>
                  <label className="crm-checkbox">
                    <input
                      type="checkbox"
                      disabled={b.ativo === false}
                      checked={form.broker_ids.includes(String(b.id))}
                      onChange={() => toggle(b.id)}
                    />
                    <Avatar name={b.nome} />
                    <span>
                      {b.nome}
                      {b.ativo === false && (
                        <small style={{ display: "block" }}>
                          Perfil inativo
                        </small>
                      )}
                    </span>
                  </label>
                  <label
                    className="crm-actions"
                    style={{ fontSize: 10, color: "#7b8e9b" }}
                  >
                    Peso
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      aria-label={`Peso de ${b.nome}`}
                      value={form.weights[b.id] ?? 1}
                      disabled={
                        !form.broker_ids.includes(String(b.id)) ||
                        b.ativo === false
                      }
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          weights: {
                            ...p.weights,
                            [b.id]: Number(e.target.value),
                          },
                        }))
                      }
                    />
                  </label>
                </div>
              ))
            ) : (
              <Empty
                title="Nenhum corretor cadastrado"
                text="Adicione os perfis da equipe para selecionar os participantes."
              />
            )}
            <div style={{ marginTop: 22, maxWidth: 320 }}>
              <Field label="Limite diário por corretor nesta campanha">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.daily_limit}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, daily_limit: e.target.value }))
                  }
                  placeholder="Sem limite"
                />
              </Field>
              <p
                className="crm-text-muted"
                style={{ fontSize: 10, marginTop: 6 }}
              >
                Deixe vazio para sem limite. Zero suspende a distribuição. Dia
                considerado: horário de São Paulo.
              </p>
            </div>
          </fieldset>
        </div>
        <footer className="crm-dialog-footer">
          <button type="button" className="crm-btn" onClick={onClose}>
            {canManage ? "Cancelar" : "Fechar"}
          </button>
          {canManage && (
            <button className="crm-btn crm-btn-primary" disabled={busy}>
              {busy ? "Salvando…" : "Salvar regras"}
            </button>
          )}
        </footer>
      </form>
    </Dialog>
  );
}
function TestCampaign({ onClose, onSave }) {
  const [name, setName] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Dialog
      title="Campanha de teste local"
      subtitle="Somente para validar o fluxo da roleta neste navegador."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await onSave({
              id: `test-${crypto.randomUUID()}`,
              name: `[TESTE LOCAL] ${name.trim()}`,
              status: "ACTIVE",
              effective_status: "ACTIVE",
              source: "manual",
              objective: "Teste local de distribuição",
              broker_ids: [],
              weights: {},
              routing_enabled: false,
              daily_limit: null,
              synced_at: new Date().toISOString(),
            });
            onClose();
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="crm-dialog-body">
          <Alert>{error}</Alert>
          <Alert tone="info">
            Este registro não existe no Meta Ads nem na Zernio. Nenhum anúncio
            será criado.
          </Alert>
          <Field label="Nome do teste *">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="Ex.: validação da equipe"
            />
          </Field>
        </div>
        <footer className="crm-dialog-footer">
          <button className="crm-btn" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="crm-btn crm-btn-primary"
            disabled={busy || !name.trim()}
          >
            {busy ? "Criando…" : "Criar teste local"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
export default function Campanhas({
  demo,
  corretoresList,
  leads,
  updateLead,
  currentProfile,
  refreshLeads,
  goToLead,
}) {
  const [campaigns, setCampaigns] = useState([]),
    [history, setHistory] = useState([]),
    [loading, setLoading] = useState(true),
    [syncing, setSyncing] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [lastSync, setLastSync] = useState(null),
    [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
    [editing, setEditing] = useState(null),
    [creating, setCreating] = useState(false),
    [tab, setTab] = useState("campaigns"),
    [selectedCampaign, setSelectedCampaign] = useState(""),
    [selectedLead, setSelectedLead] = useState(""),
    [preview, setPreview] = useState(null),
    [routing, setRouting] = useState(false),
    [previewing, setPreviewing] = useState(false);
  const canManage = demo || currentProfile?.role === "admin";
  const options = { demo, brokers: corretoresList, leads };
  const load = useCallback(
    async (sync = false) => {
      if (sync) setSyncing(true);
      else setLoading(true);
      setError("");
      try {
        const [result, audit] = await Promise.all([
          sync ? syncZernioCampaigns({ demo }) : getCampaigns({ demo }),
          getRoutingHistory({ demo }),
        ]);
        if (result.error) throw result.error;
        setCampaigns(result.data || []);
        setLastSync(result.syncedAt || result.data?.[0]?.synced_at);
        if (audit.error) {
          setError(
            `Campanhas carregadas. Histórico indisponível: ${audit.error.message}`,
          );
        } else setHistory(audit.data || []);
        if (sync)
          setNotice(
            "Consulta à Zernio concluída. Os status exibidos refletem o último retorno da origem.",
          );
      } catch (err) {
        setError(err.message || "Falha ao consultar as campanhas.");
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [demo],
  );
  useEffect(() => {
    load();
  }, [load]);
  const filtered = useMemo(
    () =>
      campaigns
        .filter(
          (c) =>
            matches([c.name, c.external_id, c.objective].join(" "), q) &&
            (!status ||
              (status === "active"
                ? ACTIVE(c)
                : status === "paused"
                  ? ["PAUSED", "CAMPAIGN_PAUSED", "ADSET_PAUSED"].includes(
                      c.effective_status,
                    )
                  : status === "manual"
                    ? c.source === "manual"
                    : !ACTIVE(c) &&
                      !["PAUSED", "CAMPAIGN_PAUSED", "ADSET_PAUSED"].includes(
                        c.effective_status,
                      ))),
        )
        .sort(
          (a, b) =>
            Number(ACTIVE(b)) - Number(ACTIVE(a)) ||
            a.name.localeCompare(b.name, "pt-BR"),
        ),
    [campaigns, q, status],
  );
  const active = campaigns.filter((c) => c.source !== "manual" && ACTIVE(c));
  const paused = campaigns.filter(
    (c) =>
      c.source !== "manual" &&
      ["PAUSED", "CAMPAIGN_PAUSED", "ADSET_PAUSED"].includes(
        c.effective_status,
      ),
  );
  const unassigned = leads.filter(
    (l) =>
      !l.corretor &&
      !l.corretorId &&
      !["fechado", "descartado"].includes(l.status),
  );
  const save = async (campaign) => {
    const result = await saveCampaign(campaign, options);
    if (result.error) throw result.error;
    if (!result.data)
      throw new Error("As regras não foram confirmadas pelo banco.");
    setCampaigns((prev) =>
      prev.some((c) => c.id === campaign.id)
        ? prev.map((c) => (c.id === campaign.id ? { ...c, ...result.data } : c))
        : [...prev, result.data],
    );
    setPreview(null);
    setNotice(
      demo
        ? "Regras salvas apenas nesta revisão local."
        : "Regras de distribuição salvas.",
    );
  };
  const check = async () => {
    setError("");
    setPreviewing(true);
    try {
      const result = await getRoutingPreview(selectedCampaign, options);
      if (result.error) throw result.error;
      setPreview(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setPreviewing(false);
    }
  };
  const distribute = async () => {
    setRouting(true);
    setError("");
    try {
      const result = await routeLead(selectedLead, selectedCampaign, options);
      if (result.error) throw result.error;
      const assignment = Array.isArray(result.data)
        ? result.data[0]
        : result.data;
      if (!assignment) throw new Error("A distribuição não foi confirmada.");
      if (demo) {
        await updateLead(selectedLead, {
          corretor: assignment.broker_name,
          corretorId: assignment.broker_id,
          campaignId: assignment.campaign_id,
        });
      }
      setNotice(
        `Lead atribuído a ${assignment.broker_name || "corretor elegível"}${demo ? " na revisão local" : ""}.`,
      );
      setSelectedLead("");
      setPreview(null);
      const warnings = [];
      const audit = await getRoutingHistory(options);
      if (audit.error)
        warnings.push(`Histórico indisponível: ${audit.error.message}`);
      else setHistory(audit.data || []);
      if (!demo) {
        try {
          await refreshLeads();
        } catch (err) {
          warnings.push(
            `Não foi possível atualizar os contatos: ${err.message}`,
          );
        }
      }
      if (warnings.length)
        setError(`A atribuição foi confirmada. ${warnings.join(" · ")}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setRouting(false);
    }
  };
  return (
    <>
      <PageHeader
        title="Campanhas certas. Contatos bem distribuídos."
        eyebrow="Campanhas e roleta"
        description="Consulte o Meta Ads pela Zernio e organize uma distribuição por campanha, disponibilidade e peso."
      >
        <button
          className="crm-btn crm-btn-primary"
          disabled={syncing || loading}
          onClick={() => load(true)}
        >
          <RefreshCw size={15} />
          {syncing ? "Consultando Zernio…" : "Sincronizar pela Zernio"}
        </button>
      </PageHeader>
      <Alert>{error}</Alert>
      <Alert tone="success">{notice}</Alert>
      <section className="crm-card crm-campaign-state">
        <Megaphone size={23} style={{ color: "#487895" }} />
        <div>
          <h3>Meta Ads · conexão pela API Zernio</h3>
          <p>
            {loading
              ? "Consultando campanhas da conta vinculada…"
              : `Última consulta: ${stamp(lastSync)}. Status dos anúncios não são alterados por este painel.`}
          </p>
        </div>
        {lastSync && <Badge status="ativo">Consulta disponível</Badge>}
      </section>
      <div className="crm-stats">
        <Stat
          label="Campanhas ativas na origem"
          value={active.length}
          detail="Meta Ads · dentro do período vigente"
          icon={Megaphone}
          tone="crm-stat-highlight"
        />
        <Stat
          label="Campanhas pausadas"
          value={paused.length}
          detail="Não participam da distribuição"
          icon={SlidersHorizontal}
        />
        <Stat
          label="Regras de roleta habilitadas"
          value={
            campaigns.filter((c) => c.source !== "manual" && c.routing_enabled)
              .length
          }
          detail="Também dependem do status ativo"
          icon={Shuffle}
        />
        <Stat
          label="Leads sem responsável"
          value={unassigned.length}
          detail={
            demo
              ? "Contatos fictícios desta revisão"
              : "Contatos abertos aguardando distribuição"
          }
          icon={Users}
        />
      </div>
      {!loading &&
        campaigns.some((c) => c.source !== "manual") &&
        !active.length && (
          <Alert tone="warning">
            Nenhuma campanha Meta Ads está ativa na conta retornada pela Zernio.
            A distribuição dessas campanhas permanece bloqueada. Confira a conta
            de anúncios e ative a campanha na origem quando apropriado.
          </Alert>
        )}
      <div className="crm-toolbar">
        <div className="crm-tabs">
          {[
            ["campaigns", "Campanhas"],
            ["routing", "Distribuição de leads"],
            ["history", "Histórico da roleta"],
          ].map(([v, l]) => (
            <button
              className={tab === v ? "active" : ""}
              onClick={() => setTab(v)}
              key={v}
            >
              {l}
            </button>
          ))}
        </div>
        {demo && (
          <button
            className="crm-btn crm-btn-small"
            style={{ marginLeft: "auto" }}
            onClick={() => setCreating(true)}
          >
            <Plus size={13} />
            Campanha de teste local
          </button>
        )}
      </div>
      {tab === "campaigns" && (
        <>
          <div className="crm-toolbar">
            <SearchBox
              value={q}
              onChange={setQ}
              placeholder="Buscar campanha ou ID do anúncio"
            />
            <select
              aria-label="Filtrar status de campanha"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="active">Ativas</option>
              <option value="paused">Pausadas</option>
              <option value="other">Outros status</option>
              {demo && <option value="manual">Testes locais</option>}
            </select>
            <span className="crm-result-count">
              {filtered.length} campanhas
            </span>
          </div>
          <section className="crm-card">
            {loading ? (
              <Empty title="Consultando suas campanhas…" />
            ) : filtered.length ? (
              <div className="crm-table-wrap">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Campanha</th>
                      <th>Status na origem</th>
                      <th>Objetivo</th>
                      <th>Participantes</th>
                      <th>Roleta</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div className="crm-campaign-name">
                            <strong>{c.name}</strong>
                          </div>
                          <small>
                            {c.source === "manual"
                              ? "TESTE LOCAL · não existe no Meta Ads"
                              : `Meta Ads · ${c.external_id || c.id}`}
                          </small>
                        </td>
                        <td>
                          <Badge status={c.effective_status}>
                            {STATUS[c.effective_status] ||
                              c.effective_status ||
                              "Não informado"}
                          </Badge>
                          {c.effective_status === "ACTIVE" && !ACTIVE(c) && (
                            <small>Fora do período</small>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: 10 }}>
                            {c.objective || "Não informado"}
                          </span>
                        </td>
                        <td>{(c.broker_ids || []).length} corretores</td>
                        <td>
                          <Badge
                            status={c.routing_enabled ? "ativo" : "descartado"}
                          >
                            {c.routing_enabled ? "Habilitada" : "Desabilitada"}
                          </Badge>
                        </td>
                        <td>
                          <button
                            className="crm-btn crm-btn-small"
                            onClick={() => setEditing(c)}
                          >
                            <SlidersHorizontal size={13} />
                            {canManage ? "Configurar" : "Ver regras"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title={
                  campaigns.length
                    ? "Nenhuma campanha nesta seleção"
                    : "As campanhas ainda não foram carregadas"
                }
                text={
                  campaigns.length
                    ? "Tente outro nome ou status."
                    : "Sincronize com a Zernio para consultar as campanhas disponíveis."
                }
              >
                <button
                  className="crm-btn"
                  onClick={() => load(true)}
                  disabled={syncing}
                >
                  Consultar Zernio
                </button>
              </Empty>
            )}
          </section>
        </>
      )}
      {tab === "routing" && (
        <div className="crm-grid-2 crm-grid-equal">
          <section className="crm-card">
            <div className="crm-card-heading">
              <div>
                <h2>Distribuir um lead</h2>
                <p>A atribuição é confirmada antes de alterar o contato</p>
              </div>
              <Shuffle size={18} />
            </div>
            <div className="crm-card-body">
              <div className="crm-form-grid">
                <Field label="Campanha de origem" wide>
                  <select
                    value={selectedCampaign}
                    onChange={(e) => {
                      setSelectedCampaign(e.target.value);
                      setPreview(null);
                    }}
                  >
                    <option value="">Selecione a campanha</option>
                    {campaigns.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.name} ·{" "}
                        {STATUS[c.effective_status] || c.effective_status}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Lead sem responsável" wide>
                  <select
                    value={selectedLead}
                    onChange={(e) => setSelectedLead(e.target.value)}
                  >
                    <option value="">Selecione um contato</option>
                    {unassigned.map((l) => (
                      <option value={l.id} key={l.id}>
                        {l.nome} · {l.origem || "Origem não informada"}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <button
                className="crm-btn"
                disabled={!selectedCampaign || previewing || routing}
                style={{ marginTop: 20 }}
                onClick={check}
              >
                <ShieldCheck size={15} />
                {previewing ? "Conferindo…" : "Conferir distribuição"}
              </button>
              {preview && (
                <div style={{ marginTop: 21 }}>
                  {preview.reason ? (
                    <Alert tone="warning">{preview.reason}</Alert>
                  ) : (
                    <Alert tone="success">
                      Próximo corretor elegível:{" "}
                      <strong>{preview.nextBroker?.nome}</strong>. A atribuição
                      final é recalculada ao distribuir.
                    </Alert>
                  )}
                  <button
                    className="crm-btn crm-btn-primary"
                    disabled={
                      !preview.nextBroker ||
                      !selectedLead ||
                      routing ||
                      !canManage
                    }
                    onClick={distribute}
                  >
                    <ArrowRight size={15} />
                    {routing
                      ? "Distribuindo…"
                      : demo
                        ? "Distribuir na revisão local"
                        : "Distribuir lead"}
                  </button>
                </div>
              )}
              {!canManage && (
                <p
                  className="crm-text-muted"
                  style={{ marginTop: 18, fontSize: 11 }}
                >
                  A distribuição manual é exclusiva dos administradores.
                </p>
              )}
            </div>
          </section>
          <section className="crm-card">
            <div className="crm-card-heading">
              <div>
                <h2>Fila elegível</h2>
                <p>Pesos, capacidade e disponibilidade em tempo real</p>
              </div>
            </div>
            {preview?.eligibleBrokers?.length ? (
              <div className="crm-table-wrap">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Corretor</th>
                      <th>Peso</th>
                      <th>Hoje</th>
                      <th>Capacidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.eligibleBrokers.map((b) => (
                      <tr key={b.id}>
                        <td>{b.nome}</td>
                        <td>{b.weight}</td>
                        <td>{b.assignedToday}</td>
                        <td>
                          {Number.isFinite(b.capacityRemaining)
                            ? b.capacityRemaining
                            : "Sem limite"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title="Confira uma campanha para ver a fila"
                text="Participam corretores ativos, com peso maior que zero e capacidade diária disponível."
              />
            )}
            <div className="crm-card-body">
              <p className="crm-text-muted" style={{ fontSize: 11 }}>
                Campanhas pausadas, encerradas, fora do período ou sem
                sincronização recente não distribuem leads. Contatos já
                atribuídos mantêm o responsável.
              </p>
            </div>
          </section>
        </div>
      )}
      {tab === "history" && (
        <section className="crm-card">
          <div className="crm-card-heading">
            <div>
              <h2>Histórico de atribuições</h2>
              <p>
                {demo
                  ? "Somente distribuições feitas neste ambiente local"
                  : "Últimas atribuições registradas pela roleta"}
              </p>
            </div>
            <History size={18} />
          </div>
          {history.length ? (
            <div className="crm-table-wrap">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Contato</th>
                    <th>Corretor</th>
                    <th>Campanha</th>
                    <th>Critério</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td>{stamp(h.assigned_at)}</td>
                      <td>
                        <button
                          className="crm-link"
                          onClick={() => goToLead(h.lead_id)}
                        >
                          {leads.find((l) => String(l.id) === String(h.lead_id))
                            ?.nome || `Lead ${h.lead_id}`}
                        </button>
                      </td>
                      <td>
                        {h.broker_name ||
                          corretoresList.find(
                            (c) => String(c.id) === String(h.broker_id),
                          )?.nome ||
                          "Corretor"}
                      </td>
                      <td>
                        <div className="crm-campaign-name">
                          {campaigns.find(
                            (c) => String(c.id) === String(h.campaign_id),
                          )?.name || h.campaign_id}
                        </div>
                      </td>
                      <td>
                        <div
                          className="crm-campaign-name"
                          style={{ maxWidth: 250, fontSize: 11 }}
                        >
                          {h.reason || "Distribuição ponderada por campanha"}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Nenhuma distribuição registrada"
              text="Cada atribuição confirmada aparecerá aqui com data, corretor, campanha e critério."
            />
          )}
        </section>
      )}
      {editing && (
        <CampaignRules
          campaign={editing}
          brokers={corretoresList}
          onClose={() => setEditing(null)}
          onSave={save}
          demo={demo}
          canManage={canManage}
        />
      )}{" "}
      {creating && (
        <TestCampaign onClose={() => setCreating(false)} onSave={save} />
      )}
    </>
  );
}
