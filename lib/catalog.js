import importedCatalog from "../data/catalog.json";
import { supabase } from "./supabase.js";

const fold = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const numeric = (value) =>
  value === null || value === "" || value === undefined
    ? null
    : Number.isFinite(Number(value))
      ? Number(value)
      : null;
export function normalizeProperty(row) {
  const photos = [
    ...new Set(
      [...(Array.isArray(row.fotos) ? row.fotos : []), row.img].filter(Boolean),
    ),
  ];
  const finalidade = fold(row.finalidade || row.transacao).includes("alug")
    ? "aluguel"
    : "venda";
  return {
    ...row,
    id: String(row.id),
    codigo: String(row.codigo || row.id),
    slug:
      row.slug ||
      `${fold(row.titulo)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}-${row.id}`,
    finalidade,
    transacao: finalidade === "aluguel" ? "Aluguel" : "Venda",
    preco: numeric(row.preco),
    area: numeric(row.area),
    quartos: numeric(row.quartos),
    suites: numeric(row.suites),
    banheiros: numeric(row.banheiros),
    vagas: numeric(row.vagas),
    fotos: photos,
    img: photos[0] || null,
    caracteristicas: row.caracteristicas || [],
    estado: row.estado || "ES",
    status: row.status === "ativo" ? "disponivel" : row.status,
  };
}

export const catalogSnapshot = importedCatalog.map(normalizeProperty);
let cached;
export function invalidateCatalog() {
  cached = undefined;
}
export async function getPublicCatalog({ refresh = false } = {}) {
  if (cached && !refresh) return cached;
  // The imported inventory is available independently of CRM authentication.
  const base = catalogSnapshot.filter((item) => item.status === "disponivel");
  if (!import.meta.env.VITE_SUPABASE_URL)
    return { data: base, error: null, source: "catalog-import" };
  try {
    const { data, error } = await supabase
      .from("imoveis")
      .select("*")
      .abortSignal(AbortSignal.timeout(6000));
    if (error)
      return {
        data: base,
        error: null,
        warning:
          "Atualizações do CRM indisponíveis; exibindo o catálogo importado.",
        source: "catalog-import",
      };
    const merged = new Map(base.map((item) => [item.codigo, item]));
    for (const row of data || []) {
      const item = normalizeProperty(row);
      if (item.status !== "disponivel") {
        merged.delete(item.codigo);
        continue;
      }
      merged.set(item.codigo, item);
    }
    cached = {
      data: [...merged.values()],
      error: null,
      source: "catalog-and-crm",
    };
    return cached;
  } catch {
    return { data: base, error: null, source: "catalog-import" };
  }
}
export async function getCatalogProperty(idOrSlug) {
  const result = await getPublicCatalog();
  const data = result.data.find((item) =>
    [item.id, item.slug, item.codigo].includes(String(idOrSlug)),
  );
  return {
    data: data || null,
    error: data
      ? null
      : { message: "Este imóvel não foi encontrado no catálogo." },
  };
}
export function filterCatalog(items, filters = {}) {
  const result = items.filter((item) => {
    if (
      filters.q &&
      !fold(
        [item.titulo, item.codigo, item.bairro, item.cidade, item.tipo].join(
          " ",
        ),
      ).includes(fold(filters.q))
    )
      return false;
    for (const key of ["finalidade", "tipo", "cidade", "bairro"])
      if (
        filters[key] &&
        filters[key] !== "todos" &&
        fold(item[key]) !== fold(filters[key])
      )
        return false;
    if (filters.quartos && (item.quartos ?? -1) < Number(filters.quartos))
      return false;
    if (
      filters.minPrice &&
      (item.preco === null || item.preco < Number(filters.minPrice))
    )
      return false;
    if (
      filters.maxPrice &&
      (item.preco === null || item.preco > Number(filters.maxPrice))
    )
      return false;
    return true;
  });
  if (["price-asc", "menor-preco", "price_asc"].includes(filters.order))
    result.sort((a, b) => (a.preco ?? Infinity) - (b.preco ?? Infinity));
  else if (["price-desc", "maior-preco", "price_desc"].includes(filters.order))
    result.sort((a, b) => (b.preco ?? -1) - (a.preco ?? -1));
  else if (filters.order === "area-desc")
    result.sort((a, b) => (b.area ?? 0) - (a.area ?? 0));
  else result.sort((a, b) => Number(b.destaque) - Number(a.destaque));
  return result;
}
export function getCatalogFacets(items) {
  const unique = (key) =>
    [...new Set(items.map((item) => item[key]).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  return {
    tipos: unique("tipo"),
    cidades: unique("cidade"),
    bairros: unique("bairro"),
    finalidades: unique("finalidade"),
    total: items.length,
  };
}
