const failure = (code, message) => ({
  data: null,
  error: Object.assign(new Error(message), { code }),
});

/**
 * Read a complete, ordered Supabase selection without relying on its row limit.
 * createQuery must return a fresh select builder, including filters and ordering.
 */
export async function readAllRows(
  createQuery,
  { pageSize = 1000, maxRequests = 500, idColumn = "id" } = {},
) {
  if (
    typeof createQuery !== "function" ||
    !Number.isSafeInteger(pageSize) || pageSize < 1 ||
    !Number.isSafeInteger(maxRequests) || maxRequests < 1 ||
    typeof idColumn !== "string" || !idColumn
  ) {
    return failure("PAGINATION_CONFIG", "Configuração de leitura paginada inválida.");
  }

  const rows = [];
  const seen = new Set();
  let offset = 0;
  let total = null;

  try {
    for (let request = 0; request < maxRequests; request += 1) {
      const result = await createQuery({ count: "exact" })
        .order(idColumn, { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (result?.error) return { data: null, error: result.error };
      if (!Array.isArray(result?.data)) {
        return failure("PAGINATION_RESPONSE", "O banco retornou uma página inválida.");
      }

      // Supabase can parse an unknown Content-Range total (*) as NaN.
      if (result.count != null && !Number.isNaN(result.count)) {
        if (!Number.isSafeInteger(result.count) || result.count < 0) {
          return failure("PAGINATION_RESPONSE", "O banco retornou um total inválido.");
        }
        if (total !== null && total !== result.count) {
          return failure("PAGINATION_CHANGED", "Os registros mudaram durante a leitura. Atualize para tentar novamente.");
        }
        total = result.count;
      }

      if (result.data.length === 0) {
        if (total !== null && rows.length !== total) {
          return failure("PAGINATION_INCOMPLETE", "A leitura terminou antes de carregar todos os registros. Atualize para tentar novamente.");
        }
        return { data: rows, error: null };
      }

      const previousSize = rows.length;
      for (const row of result.data) {
        if (row?.[idColumn] == null) {
          return failure("PAGINATION_RESPONSE", "O banco retornou um registro sem identificador.");
        }
        const id = String(row[idColumn]);
        if (!seen.has(id)) {
          seen.add(id);
          rows.push(row);
        }
      }

      // The server may return fewer rows than requested even before the last page.
      offset += result.data.length;
      if (total !== null && offset >= total) {
        if (rows.length !== total || offset !== total) {
          return failure("PAGINATION_CHANGED", "Os registros mudaram durante a leitura. Atualize para tentar novamente.");
        }
        return { data: rows, error: null };
      }
      if (rows.length === previousSize) {
        return failure("PAGINATION_STALLED", "A leitura do banco não avançou. Atualize para tentar novamente.");
      }
    }
    return failure("PAGINATION_LIMIT", "O limite de consultas foi atingido antes de carregar todos os registros. Tente novamente ou contate o suporte.");
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error("Falha ao carregar os registros do banco.") };
  }
}
