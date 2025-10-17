// ============================================================
// 🌐 ERP NUNCA FILMES - Configuração central de API (Axios)
// ============================================================
// - Lê IP e porta do backend a partir do arquivo .env
// - Configura interceptadores para tratar erros e logs
// - Pode ser importado em qualquer página (Clientes, Serviços, etc.)
// ============================================================

import axios from "axios";

// ============================================================
// 🔧 Base URL vinda do .env (configurado no vite.config.js)
// ============================================================
// O Vite injeta variáveis prefixadas com "VITE_"
// Exemplo: VITE_API_URL=http://localhost:8000
// ============================================================
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

console.log(`🌍 API_BASE_URL carregada: ${API_BASE_URL}`);

// ============================================================
// 🔧 Instância principal do Axios
// ============================================================
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 segundos
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================
// 🧠 Interceptador de Requisições (antes de enviar)
// ============================================================
api.interceptors.request.use(
  (config) => {
    console.log(`➡️  [${config.method?.toUpperCase()}] ${config.url}`);
    return config;
  },
  (error) => {
    console.error("❌ Erro ao preparar requisição:", error);
    return Promise.reject(error);
  }
);

// ============================================================
// ⚠️ Interceptador de Respostas (erros e logs)
// ============================================================
api.interceptors.response.use(
  (response) => {
    // sucesso → retorna normalmente
    return response;
  },
  (error) => {
    if (error.code === "ECONNABORTED") {
      console.error("⏱️ Tempo limite atingido ao tentar se conectar ao servidor.");
    } else if (error.message.includes("Network Error")) {
      console.error("🌐 Erro de rede: não foi possível conectar ao backend.");
      console.error(`Verifique se o backend FastAPI está rodando em ${API_BASE_URL}`);
    } else if (error.response) {
      console.error(
        `⚠️ Erro ${error.response.status}: ${error.response.data?.detail || "Falha na requisição."}`
      );
    } else {
      console.error("❌ Erro desconhecido:", error.message);
    }
    return Promise.reject(error);
  }
);

// ============================================================
// 📦 Função auxiliar para requisições genéricas (opcional)
// ============================================================
// Uso: await apiRequest("clientes", "get")
//      await apiRequest("servicos", "post", { nome: "Novo" })
export async function apiRequest(endpoint, method = "get", data = null, params = null) {
  try {
    const response = await api.request({ url: `/${endpoint}`, method, data, params });
    return response.data;
  } catch (error) {
    console.error(`❌ Falha ao acessar /${endpoint}:`, error);
    throw error;
  }
}
