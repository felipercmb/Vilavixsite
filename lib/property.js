export const fold = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export const numeric = (value) =>
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

