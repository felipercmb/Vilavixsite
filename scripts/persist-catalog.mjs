import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)
  throw new Error(
    "Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no servidor.",
  );
const rows = JSON.parse(
  await readFile(new URL("../data/catalog.json", import.meta.url), "utf8"),
);
const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let count = 0;
for (let i = 0; i < rows.length; i += 100) {
  const { data, error } = await client.rpc("import_legacy_catalog", {
    p_rows: rows.slice(i, i + 100),
  });
  if (error)
    throw new Error(
      `Importação parou após ${count} registros: ${error.message}`,
    );
  count += data;
}
console.log(
  `${count} imóveis importados. Códigos deduplicados; status operacionais existentes preservados.`,
);
