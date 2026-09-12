import React, { useMemo, useState } from "react";
import { Plus, ExternalLink, Pencil, Download, Building2 } from "lucide-react";
import {
  PageHeader,
  SearchBox,
  Empty,
  Badge,
  Dialog,
  Alert,
  Field,
  money,
  matches,
  exportRows,
} from "./CRMUI.jsx";
import { PropertyForm } from "./AddImovel.jsx";
export default function ImoveisCRM({
  imoveis,
  leads,
  setMenu,
  updateImovel,
  navigate,
  demo,
}) {
  const [q, setQ] = useState(""),
    [type, setType] = useState(""),
    [status, setStatus] = useState(""),
    [purpose, setPurpose] = useState(""),
    [selected, setSelected] = useState(null),
    [editing, setEditing] = useState(false),
    [page, setPage] = useState(1);
  const filtered = useMemo(
    () =>
      imoveis.filter(
        (p) =>
          matches([p.codigo, p.titulo, p.bairro, p.cidade].join(" "), q) &&
          (!type || p.tipo === type) &&
          (!status || p.status === status) &&
          (!purpose || p.finalidade === purpose),
      ),
    [imoveis, q, type, status, purpose],
  );
  const property = imoveis.find((p) => String(p.id) === String(selected));
  const perPage = 12,
    maxPage = Math.max(1, Math.ceil(filtered.length / perPage)),
    currentPage = Math.min(page, maxPage),
    visible = filtered.slice(
      (currentPage - 1) * perPage,
      currentPage * perPage,
    );
  const apply = (setter, value) => {
    setter(value);
    setPage(1);
  };
  return (
    <>
      <PageHeader
        title="Um catálogo cheio de possibilidades."
        eyebrow="Imóveis"
        description={`${imoveis.length} imóveis reunidos em uma única operação. Catálogo importado do site VilaVix e registros do CRM.`}
      >
        <button
          className="crm-btn"
          onClick={() =>
            exportRows(
              "vilavix-imoveis.csv",
              [
                "Código",
                "Título",
                "Tipo",
                "Finalidade",
                "Cidade",
                "Bairro",
                "Valor",
                "Área",
                "Status",
                "Origem",
              ],
              filtered.map((p) => [
                p.codigo,
                p.titulo,
                p.tipo,
                p.finalidade,
                p.cidade,
                p.bairro,
                p.preco,
                p.area,
                p.status,
                p._imported ? "Site antigo" : "CRM",
              ]),
            )
          }
        >
          <Download size={14} />
          Exportar
        </button>
        <button
          className="crm-btn crm-btn-primary"
          onClick={() => setMenu("add-imovel")}
        >
          <Plus size={15} />
          Cadastrar imóvel
        </button>
      </PageHeader>
      <div className="crm-toolbar">
        <SearchBox
          value={q}
          onChange={(v) => apply(setQ, v)}
          placeholder="Buscar código, imóvel, bairro ou cidade"
        />
        <select
          aria-label="Filtrar tipo de imóvel"
          value={type}
          onChange={(e) => apply(setType, e.target.value)}
        >
          <option value="">Todos os tipos</option>
          {[...new Set(imoveis.map((p) => p.tipo).filter(Boolean))]
            .sort()
            .map((t) => (
              <option key={t}>{t}</option>
            ))}
        </select>
        <select
          aria-label="Filtrar finalidade"
          value={purpose}
          onChange={(e) => apply(setPurpose, e.target.value)}
        >
          <option value="">Venda e aluguel</option>
          <option value="venda">Venda</option>
          <option value="aluguel">Aluguel</option>
        </select>
        <select
          aria-label="Filtrar disponibilidade"
          value={status}
          onChange={(e) => apply(setStatus, e.target.value)}
        >
          <option value="">Todas as disponibilidades</option>
          <option value="disponivel">Disponíveis</option>
          <option value="reservado">Reservados</option>
          <option value="vendido">Vendidos</option>
          <option value="alugado">Alugados</option>
          <option value="rascunho">Rascunhos</option>
        </select>
        <span className="crm-result-count">{filtered.length} imóveis</span>
      </div>
      <section className="crm-card">
        {visible.length ? (
          <>
            <div className="crm-table-wrap">
              <table className="crm-table">
                <thead>
                  <tr>
                    {[
                      "Imóvel",
                      "Finalidade",
                      "Valor",
                      "Características",
                      "Disponibilidade",
                      "Contatos",
                      "",
                    ].map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="crm-person">
                          {p.img ? (
                            <img
                              className="crm-property-thumb"
                              src={p.img}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <div
                              className="crm-property-thumb"
                              style={{ display: "grid", placeItems: "center" }}
                            >
                              <Building2 size={20} />
                            </div>
                          )}
                          <div>
                            <button
                              className="crm-link crm-property-title"
                              onClick={() => {
                                setSelected(p.id);
                                setEditing(false);
                              }}
                            >
                              {p.titulo}
                            </button>
                            <small>
                              Ref. {p.codigo} · {p.bairro}, {p.cidade}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {p.transacao || "Venda"}
                        <small>{p.tipo}</small>
                      </td>
                      <td>
                        {money(p.preco)}
                        {p.finalidade === "aluguel" && <small>por mês</small>}
                      </td>
                      <td>
                        {p.area ?? "—"} m²
                        <small>
                          {p.quartos ?? "—"} quartos · {p.vagas ?? "—"} vagas
                        </small>
                      </td>
                      <td>
                        <Badge status={p.status}>
                          {{
                            disponivel: "Disponível",
                            reservado: "Reservado",
                            vendido: "Vendido",
                            alugado: "Alugado",
                            rascunho: "Rascunho",
                          }[p.status] || p.status}
                        </Badge>
                        <small>
                          {p._imported ? "Catálogo importado" : "Cadastro CRM"}
                        </small>
                      </td>
                      <td>
                        {
                          leads.filter(
                            (l) =>
                              String(l.imovelId || "") === String(p.id) ||
                              String(l.imovelRef || "") === String(p.codigo),
                          ).length
                        }
                      </td>
                      <td>
                        <button
                          className="crm-icon-btn"
                          aria-label={`Ver imóvel ${p.codigo}`}
                          onClick={() => {
                            setSelected(p.id);
                            setEditing(false);
                          }}
                        >
                          <ExternalLink size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="crm-pagination">
              <span>
                {(currentPage - 1) * perPage + 1}–
                {Math.min(currentPage * perPage, filtered.length)} de{" "}
                {filtered.length} imóveis
              </span>
              <div className="crm-actions">
                <button
                  className="crm-btn crm-btn-small"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Anterior
                </button>
                <span>
                  {currentPage} / {maxPage}
                </span>
                <button
                  className="crm-btn crm-btn-small"
                  disabled={currentPage === maxPage}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        ) : (
          <Empty
            title="Nenhum imóvel nesta seleção"
            text="Ajuste o código, a região ou os filtros para encontrar o imóvel."
          />
        )}
      </section>
      {property && (
        <Dialog
          title={editing ? "Editar imóvel" : property.titulo}
          subtitle={`Referência ${property.codigo} · ${property.tipo}`}
          wide
          onClose={() => setSelected(null)}
        >
          <div className="crm-dialog-body">
            {editing ? (
              <PropertyForm
                property={property}
                demo={demo}
                onCancel={() => setEditing(false)}
                onSave={async (data) => {
                  await updateImovel(property.id, data);
                  setEditing(false);
                }}
              />
            ) : (
              <>
                {property.img && (
                  <img
                    className="crm-property-preview"
                    src={property.img}
                    alt={property.titulo}
                  />
                )}
                <div
                  className="crm-actions"
                  style={{ marginTop: 20, justifyContent: "space-between" }}
                >
                  <strong style={{ fontSize: 24 }}>
                    {money(property.preco)}
                  </strong>
                  <Badge status={property.status}>
                    {property.status === "disponivel"
                      ? "Disponível"
                      : property.status}
                  </Badge>
                </div>
                <dl className="crm-details">
                  <div>
                    <dt>Localização</dt>
                    <dd>
                      {property.bairro}, {property.cidade}
                    </dd>
                  </div>
                  <div>
                    <dt>Finalidade</dt>
                    <dd>{property.transacao}</dd>
                  </div>
                  <div>
                    <dt>Área</dt>
                    <dd>
                      {property.area ?? "Não informada"}
                      {property.area ? " m²" : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Configuração</dt>
                    <dd>
                      {property.quartos ?? "—"} quartos ·{" "}
                      {property.suites ?? "—"} suítes · {property.vagas ?? "—"}{" "}
                      vagas
                    </dd>
                  </div>
                </dl>
                <p
                  className="crm-text-muted"
                  style={{ whiteSpace: "pre-wrap", lineHeight: 1.75 }}
                >
                  {property.descricao || "Descrição ainda não cadastrada."}
                </p>
                {property._imported && !demo && (
                  <div style={{ marginTop: 20 }}>
                    <Alert tone="info">
                      Este registro veio do catálogo importado. A edição neste
                      painel fica disponível após persistir o imóvel no banco do
                      CRM.
                    </Alert>
                  </div>
                )}
                <div className="crm-actions" style={{ marginTop: 22 }}>
                  {(!property._imported || demo) && (
                    <button
                      className="crm-btn"
                      onClick={() => setEditing(true)}
                    >
                      <Pencil size={14} />
                      Editar informações
                    </button>
                  )}
                  <button
                    className="crm-btn crm-btn-primary"
                    onClick={() =>
                      navigate("imovel-detail", { imovelId: property.id })
                    }
                  >
                    <ExternalLink size={14} />
                    Ver página pública
                  </button>
                  {property.source_url && (
                    <a
                      className="crm-btn"
                      href={property.source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver origem
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
