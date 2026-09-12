export function requireSupabaseConfig(env) {
  const url = String(env.VITE_SUPABASE_URL || "").trim();
  const anonKey = String(env.VITE_SUPABASE_ANON_KEY || "").trim();
  const missing = [
    !url && "VITE_SUPABASE_URL",
    !anonKey && "VITE_SUPABASE_ANON_KEY",
  ].filter(Boolean);

  if (missing.length)
    throw new Error(
      `Configuração do Supabase incompleta. Defina ${missing.join(" e ")} no ambiente desta publicação antes de gerar o build.`,
    );

  try {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol)) throw new Error();
  } catch {
    throw new Error(
      "VITE_SUPABASE_URL deve ser uma URL HTTP ou HTTPS válida para esta publicação.",
    );
  }

  return { url, anonKey };
}
