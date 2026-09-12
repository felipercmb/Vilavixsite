import React, { useState } from "react";
import {
  Plus,
  UserCheck,
  PauseCircle,
  PlayCircle,
  Pencil,
  Mail,
  Phone,
} from "lucide-react";
import {
  PageHeader,
  SearchBox,
  Empty,
  Avatar,
  Badge,
  Field,
  Dialog,
  Alert,
  matches,
} from "./CRMUI.jsx";
export default function Corretores({
  corretoresList,
  leads,
  currentProfile,
  demo,
  updateCorretor,
  addCorretor,
  setMenu,
}) {
  const [q, setQ] = useState(""),
    [filter, setFilter] = useState(""),
    [editing, setEditing] = useState(null),
    [creating, setCreating] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(null);
  const admin = currentProfile?.role === "admin";
  const filtered = corretoresList.filter(
    (c) =>
      matches([c.nome, c.email, c.creci, c.esp].join(" "), q) &&
      (!filter ||
        (filter === "active" ? c.ativo !== false : c.ativo === false)),
  );
  const toggle = async (c) => {
    setBusy(c.id);
    setError("");
    try {
      await updateCorretor(c.id, { ativo: !c.ativo });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      <PageHeader
        title="Uma equipe, mais possibilidades."
        eyebrow="Equipe e corretores"
        description="Gerencie os responsáveis, acompanhe a carteira e a disponibilidade para receber leads."
      >
        <button className="crm-btn" onClick={() => setMenu("campanhas")}>
          <UserCheck size={15} />
          Participantes da roleta
        </button>
        {demo && (
          <button
            className="crm-btn crm-btn-primary"
            onClick={() => setCreating(true)}
          >
            <Plus size={15} />
            Corretor de teste
          </button>
        )}
      </PageHeader>
      <Alert>{error}</Alert>
      {!demo && (
        <Alert tone="info">
          Novos integrantes precisam de uma conta de acesso. Depois do cadastro
          autenticado, o administrador pode ativar o perfil nesta tela.
        </Alert>
      )}
      <div className="crm-toolbar">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Buscar nome, especialidade ou CRECI"
        />
        <select
          aria-label="Filtrar disponibilidade da equipe"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">Toda a equipe</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
        <span className="crm-result-count">{filtered.length} integrantes</span>
      </div>
      <div className="crm-broker-grid">
        {filtered.map((c) => {
          const assigned = leads.filter(
            (l) =>
              String(l.corretorId || "") === String(c.id) ||
              l.corretor === c.nome,
          );
          const open = assigned.filter(
            (l) => !["fechado", "descartado"].includes(l.status),
          );
          return (
            <article key={c.id} className="crm-card crm-broker-card">
              <div className="crm-person">
                <Avatar name={c.nome} />
                <div style={{ flex: 1 }}>
                  <h3>{c.nome}</h3>
                  <p>{c.esp || "Especialidade não informada"}</p>
                </div>
              </div>
              <div className="crm-actions" style={{ marginTop: 18 }}>
                <Badge status={c.ativo === false ? "descartado" : "ativo"}>
                  {c.ativo === false ? "Inativo" : "Ativo"}
                </Badge>
                <span className="crm-text-muted" style={{ fontSize: 10 }}>
                  {c.role === "admin" ? "Administrador" : "Corretor"}
                  {c.creci && ` · CRECI ${c.creci}`}
                </span>
              </div>
              <div className="crm-broker-metrics">
                <div>
                  <strong>{open.length}</strong>
                  <small>oportunidades em aberto</small>
                </div>
                <div>
                  <strong>
                    {assigned.filter((l) => l.status === "fechado").length}
                  </strong>
                  <small>contatos na etapa fechado</small>
                </div>
              </div>
              <p style={{ marginBottom: 8, overflowWrap: "anywhere" }}>
                {c.email ? (
                  <a href={`mailto:${c.email}`}>
                    <Mail
                      size={12}
                      style={{ verticalAlign: "middle", marginRight: 6 }}
                    />
                    {c.email}
                  </a>
                ) : (
                  "E-mail não informado"
                )}
              </p>
              <p style={{ marginBottom: 19 }}>
                {c.telefone ? (
                  <a href={`tel:${c.telefone.replace(/\D/g, "")}`}>
                    <Phone
                      size={12}
                      style={{ verticalAlign: "middle", marginRight: 6 }}
                    />
                    {c.telefone}
                  </a>
                ) : (
                  "Telefone não informado"
                )}
              </p>
              {admin && (
                <div className="crm-actions">
                  <button
                    className="crm-btn crm-btn-small"
                    onClick={() => setEditing(c)}
                  >
                    <Pencil size={12} />
                    Editar perfil
                  </button>
                  <button
                    className="crm-btn crm-btn-small"
                    disabled={
                      busy === c.id ||
                      String(c.id) === String(currentProfile?.id)
                    }
                    onClick={() => toggle(c)}
                  >
                    {c.ativo === false ? (
                      <PlayCircle size={12} />
                    ) : (
                      <PauseCircle size={12} />
                    )}{" "}
                    {c.ativo === false ? "Ativar" : "Desativar"}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {!filtered.length && (
        <div className="crm-card">
          <Empty
            title="Nenhum corretor nesta seleção"
            text={
              q
                ? "Ajuste os filtros de busca."
                : "Os perfis autenticados da equipe aparecerão aqui."
            }
          />
        </div>
      )}
      {(editing || creating) && (
        <BrokerForm
          broker={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={(data) =>
            editing ? updateCorretor(editing.id, data) : addCorretor(data)
          }
          demo={demo}
        />
      )}
    </>
  );
}
function BrokerForm({ broker, onClose, onSave, demo }) {
  const [form, setForm] = useState(
      broker || { nome: "", email: "", telefone: "", creci: "", esp: "" },
    ),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog
      title={broker ? "Editar perfil" : "Novo corretor de teste"}
      subtitle={
        demo
          ? "Perfil fictício salvo apenas neste navegador."
          : "Atualize as informações do integrante da equipe."
      }
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError("");
          try {
            await onSave(
              Object.fromEntries(
                ["nome", "email", "telefone", "creci", "esp"].map((k) => [
                  k,
                  form[k] || "",
                ]),
              ),
            );
            onClose();
          } catch (err) {
            setError(err.message);
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="crm-dialog-body">
          <Alert>{error}</Alert>
          <div className="crm-form-grid">
            {[
              ["nome", "Nome completo *"],
              ["email", "E-mail"],
              ["telefone", "Telefone"],
              ["creci", "CRECI"],
              ["esp", "Especialidade"],
            ].map(([k, label]) => (
              <Field key={k} label={label} wide={k === "esp"}>
                <input
                  type={
                    k === "email" ? "email" : k === "telefone" ? "tel" : "text"
                  }
                  value={form[k] || ""}
                  required={k === "nome"}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, [k]: e.target.value }))
                  }
                />
              </Field>
            ))}
          </div>
        </div>
        <footer className="crm-dialog-footer">
          <button type="button" className="crm-btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="crm-btn crm-btn-primary" disabled={saving}>
            {saving ? "Salvando…" : "Salvar perfil"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
