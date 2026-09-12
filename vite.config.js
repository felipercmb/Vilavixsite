import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { campaignsMiddleware } from "./server/campaigns-handler.js";

export default defineConfig(({ mode }) => {
  const env = {
    ...loadEnv(mode, "..", ""),
    ...loadEnv(mode, process.cwd(), ""),
    ...process.env,
  };
  return {
    plugins: [
      react(),
      {
        name: "vilavix-campaigns-api",
        configureServer(server) {
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
