import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * ⚙️ Configuração principal do Vite para o ERP NUNCA FILMES
 * - Suporte a múltiplos ambientes (.env.devlocal / .env.devremote / .env.production)
 * - Proxy automático de API local
 * - Compatível com domínio DuckDNS e Render
 */
export default defineConfig(({ mode }) => {
  // Carrega variáveis do .env correto (baseado no modo)
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    base: "./", // mantém compatibilidade entre build local e Render

    server: {
      host: "0.0.0.0",
      port: 5173,

      /**
       * 🔹 Permite acesso via:
       * - localhost
       * - 127.0.0.1
       * - nuncafilmes.duckdns.org (seu domínio público)
       */
      allowedHosts: [
        "localhost",
        "127.0.0.1",
        "nuncafilmes.duckdns.org",
      ],

      /**
       * 🔹 Proxy de API:
       * Redireciona chamadas locais de `/api/...` para o backend FastAPI
       * automaticamente, usando a variável VITE_API_BASE definida nos .env.
       */
      proxy: {
        "/api": {
          target: env.VITE_API_BASE || "http://localhost:8000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },

    /**
     * 🔹 Define variáveis globais disponíveis no frontend
     *   (útil se quiser logar o ambiente no console, por exemplo)
     */
    define: {
      __APP_ENV__: JSON.stringify(env.VITE_ENV || mode),
    },

    /**
     * 🔹 Build otimizado
     *   (Render faz o deploy a partir de /dist)
     */
    build: {
      outDir: "dist",
      sourcemap: mode !== "production", // gera mapa de código apenas fora da produção
      chunkSizeWarningLimit: 800,
    },
  };
});
