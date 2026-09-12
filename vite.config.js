import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { requireSupabaseConfig } from "./lib/supabase-config.js";

export default defineConfig(({ command, mode }) => {
  // Validate the same public environment Vite exposes to the browser. A parent
  // directory's development secrets must not satisfy a deployment's config.
  if (command === "build")
    requireSupabaseConfig(loadEnv(mode, process.cwd(), "VITE_"));

  return {
    plugins: [
      react(),
      {
        name: "vilavix-campaigns-api",
        async configureServer(server) {
          const { campaignsMiddleware } = await import(
            "./server/campaigns-handler.js"
          );
          const env = {
            ...loadEnv(mode, "..", ""),
            ...loadEnv(mode, process.cwd(), ""),
            ...process.env,
          };
          server.middlewares.use(
            "/api/campaigns",
            campaignsMiddleware(env, { local: true }),
          );
        },
      },
    ],
    base: "/",
    server: { host: "127.0.0.1" },
  };
});
