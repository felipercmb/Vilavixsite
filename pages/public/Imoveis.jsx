import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import useCatalog, { useFavorites } from "../../components/useCatalog.js";
import ImovelCard from "../../components/ImovelCard.jsx";
import { filterCatalog, getCatalogFacets } from "../../lib/catalog.js";
import { goLink, money, whatsappLink } from "../../components/publicUtils.js";
const EMPTY = {
  q: "",
  finalidade: "",
  tipo: "",
  cidade: "",
  bairro: "",
  quartos: "",
  minPrice: "",
  maxPrice: "",
  favorites: false,
  order: "relevance",
};
const labels = {
  q: "Busca",
  tipo: "Tipo",
  cidade: "Cidade",
  bairro: "Bairro",
  quartos: "Quartos",
  minPrice: "A partir de",
  maxPrice: "Até",
  finalidade: "Finalidade",
  favorites: "Favoritos",
};
const SIZE = 12;
export default function ImoveisPage({ navigate, filters = {} }) {
  const key = JSON.stringify(filters);
  const active = useMemo(() => ({ ...EMPTY, ...filters }), [key]);
  const [draft, setDraft] = useState(active);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const { items, loading } = useCatalog();
  const { favorites } = useFavorites();
  useEffect(() => {
    setDraft(active);
    setError("");
  }, [key]);
  const facets = useMemo(() => getCatalogFacets(items), [items]);
  const neighborhoods = useMemo(
    () =>
      getCatalogFacets(
        items.filter((i) => !draft.cidade || i.cidade === draft.cidade),
      ).bairros,
    [items, draft.cidade],
  );
  const results = useMemo(
    () =>
      filterCatalog(
        active.favorites
          ? items.filter((i) => favorites.includes(String(i.id)))
          : items,
        active,
      ),
    [items, active, favorites],
  );
  const pages = Math.max(1, Math.ceil(results.length / SIZE));
  const current = Math.min(pages, Math.max(1, Number(active.page) || 1));
  const visible = results.slice((current - 1) * SIZE, current * SIZE);
  const update = (field, value) =>
    setDraft((d) => ({
      ...d,
      [field]: value,
      ...(field === "cidade" ? { bairro: "" } : {}),
    }));
  const apply = (e) => {
    e.preventDefault();
    if (
      draft.minPrice &&
      draft.maxPrice &&
      Number(draft.minPrice) > Number(draft.maxPrice)
    ) {
      setError("O valor mínimo deve ser menor que o valor máximo.");
      return;
    }
    setError("");
    setOpen(false);
    navigate("imoveis", { filters: { ...draft, page: 1 } });
  };
  const change = (changes) =>
    navigate("imoveis", {
      filters: { ...active, ...changes, page: changes.page || 1 },
    });
  const reset = () => {
    setDraft(EMPTY);
    navigate("imoveis");
  };
  const chips = Object.keys(labels).filter(
    (k) => active[k] && active[k] !== "todos",
  );
  const pageNumbers = [
    ...new Set(
      [1, current - 1, current, current + 1, pages].filter(
        (n) => n > 0 && n <= pages,
      ),
    ),
  ].sort((a, b) => a - b);
  const displayChip = (k) =>
    k === "favorites"
      ? "Meus favoritos"
      : k === "finalidade"
        ? active[k] === "aluguel"
          ? "Para alugar"
          : "À venda"
        : k === "quartos"
          ? `${active[k]}+ quartos`
          : ["minPrice", "maxPrice"].includes(k)
            ? `${labels[k]} ${money(Number(active[k]))}`
            : `${labels[k]}: ${active[k]}`;
  return (
    <main className="public-site">
      <section className="public-page-heading">
        <div className="public-shell">
          <nav className="public-breadcrumbs" aria-label="Caminho de navegação">
            <a href="/" onClick={(e) => goLink(e, navigate, "home")}>
              Início
            </a>
            <ChevronRight size={12} />
            <span>Imóveis</span>
          </nav>
          <h1>
            {active.favorites
              ? "Seus imóveis favoritos."
              : "O próximo endereço é seu."}
          </h1>
          <p>
            {active.favorites
              ? "Reúna suas escolhas e converse com a VilaVix para agendar uma visita."
              : "Explore o catálogo. Compare as opções. Encontre o espaço para a sua próxima história."}
          </p>
        </div>
      </section>
      <div className="public-shell public-catalog-layout">
        <button
          className="public-mobile-filter-toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="catalog-filters"
        >
          <SlidersHorizontal size={16} />
          {open ? "Fechar filtros" : "Filtrar imóveis"}
          {chips.length > 0 && ` (${chips.length})`}
        </button>
        <aside
          id="catalog-filters"
          className={`public-filters${open ? " is-open" : ""}`}
          aria-label="Filtros de imóveis"
        >
          <form onSubmit={apply}>
            <div className="public-filter-heading">
              <h2>Encontre seu imóvel</h2>
              <button type="button" onClick={reset}>
                Limpar filtros
              </button>
            </div>
            <div className="public-filter-purposes">
              {[
                ["", "Todos"],
                ["venda", "Comprar"],
                ["aluguel", "Alugar"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={draft.finalidade === value ? "is-active" : ""}
                  aria-pressed={draft.finalidade === value}
                  onClick={() => update("finalidade", value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="public-field">
              Bairro, título ou código
              <input
                type="search"
                value={draft.q}
                onChange={(e) => update("q", e.target.value)}
                placeholder="Ex.: Itapuã ou 1234"
              />
            </label>
            <label className="public-field">
              Cidade
              <select
                value={draft.cidade}
                onChange={(e) => update("cidade", e.target.value)}
              >
                <option value="">Todas as cidades</option>
                {facets.cidades.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </label>
            <label className="public-field">
              Bairro
              <select
                value={draft.bairro}
                onChange={(e) => update("bairro", e.target.value)}
              >
                <option value="">Todos os bairros</option>
                {neighborhoods.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </label>
            <label className="public-field">
              Tipo de imóvel
              <select
                value={draft.tipo}
                onChange={(e) => update("tipo", e.target.value)}
              >
                <option value="">Todos os tipos</option>
                {facets.tipos.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </label>
            <label className="public-field">
              Quartos
              <select
                value={draft.quartos}
                onChange={(e) => update("quartos", e.target.value)}
              >
                <option value="">Qualquer quantidade</option>
                {[1, 2, 3, 4, 5].map((i) => (
                  <option key={i} value={i}>
                    {i} ou mais
                  </option>
                ))}
              </select>
            </label>
            <div className="public-field-row">
              <label className="public-field">
                Preço mínimo
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={draft.minPrice}
                  onChange={(e) => update("minPrice", e.target.value)}
                  placeholder="R$"
                />
              </label>
              <label className="public-field">
                Preço máximo
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={draft.maxPrice}
                  onChange={(e) => update("maxPrice", e.target.value)}
                  placeholder="R$"
                />
              </label>
            </div>
            <label className="public-favorite-toggle">
              <input
                type="checkbox"
                checked={Boolean(draft.favorites)}
                onChange={(e) => update("favorites", e.target.checked)}
              />
              <Heart size={15} /> Apenas favoritos ({favorites.length})
            </label>
            {error && (
              <p className="public-filter-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="public-button public-button-wine public-button-full"
              type="submit"
            >
              <Search size={16} /> Aplicar filtros
            </button>
            <p className="public-filter-note">
              Use os filtros para refinar sua busca.
            </p>
          </form>
        </aside>
        <div className="public-catalog-results">
          <div className="public-catalog-toolbar">
            <p role="status" aria-live="polite">
              <strong>
                {results.length}{" "}
                {results.length === 1
                  ? "imóvel encontrado"
                  : "imóveis encontrados"}
              </strong>
              {results.length > 0 && (
                <span>
                  {" "}
                  · {(current - 1) * SIZE + 1}–
                  {Math.min(current * SIZE, results.length)}
                </span>
              )}
            </p>
            <label className="public-sort">
              Ordenar por
              <select
                value={active.order}
                onChange={(e) => change({ order: e.target.value })}
              >
                <option value="relevance">Destaques</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
                <option value="area-desc">Maior área</option>
              </select>
            </label>
          </div>
          {chips.length > 0 && (
            <div
              className="public-active-filters"
              aria-label="Filtros aplicados"
            >
              {chips.map((k) => (
                <button
                  key={k}
                  className="public-filter-chip"
                  onClick={() => change({ [k]: EMPTY[k] })}
                  aria-label={`Remover filtro ${displayChip(k)}`}
                >
                  {displayChip(k)}
                  <X size={12} />
                </button>
              ))}
            </div>
          )}
          {loading ? (
            <div className="public-loading" role="status">
              Carregando catálogo…
            </div>
          ) : visible.length ? (
            <>
              <div className="public-property-grid">
                {visible.map((item) => (
                  <ImovelCard key={item.id} item={item} navigate={navigate} />
                ))}
              </div>
              {pages > 1 && (
                <nav
                  className="public-pagination"
                  aria-label="Páginas do catálogo"
                >
                  <button
                    disabled={current === 1}
                    onClick={() => change({ page: current - 1 })}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {pageNumbers.map((n, i) => (
                    <React.Fragment key={n}>
                      {i > 0 && n - pageNumbers[i - 1] > 1 && (
                        <span aria-hidden="true">…</span>
                      )}
                      <button
                        onClick={() => change({ page: n })}
                        aria-current={current === n ? "page" : undefined}
                        aria-label={`Página ${n}`}
                      >
                        {n}
                      </button>
                    </React.Fragment>
                  ))}
                  <button
                    disabled={current === pages}
                    onClick={() => change({ page: current + 1 })}
                    aria-label="Próxima página"
                  >
                    <ChevronRight size={16} />
                  </button>
                </nav>
              )}
              <p className="public-results-end">
                Página {current} de {pages}
              </p>
            </>
          ) : (
            <div className="public-empty">
              {active.favorites ? <Heart size={32} /> : <Search size={32} />}
              <h3>
                {active.favorites
                  ? "Suas próximas escolhas ficam aqui."
                  : "Nenhum imóvel com esses filtros."}
              </h3>
              <p>
                {active.favorites
                  ? "Toque no coração dos imóveis que você gostar para encontrá-los aqui. Se já salvou imóveis, revise os filtros da busca."
                  : "Tente outro bairro ou amplie a faixa de preço. Nossa equipe também pode ajudar a encontrar o que você procura."}
              </p>
              <button className="public-button" onClick={reset}>
                Ver todos os imóveis
              </button>
              <p>
                <a
                  className="public-text-link"
                  href={whatsappLink()}
                  target="_blank"
                  rel="noreferrer"
                >
                  Pedir ajuda à VilaVix
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
