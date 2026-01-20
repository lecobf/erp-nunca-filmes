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
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

console.log(`🌍 API_BASE_URL carregada: ${API_BASE_URL}`);

// ============================================================
// 🔧 Instância principal do Axios
// ============================================================
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 🆕 Aumentado de 10s → 30s
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
    // 🆕 Exibe loading opcional global
    document.body.style.cursor = "wait";
    return config;
  },
  (error) => {
    console.error("❌ Erro ao preparar requisição:", error);
    document.body.style.cursor = "default";
    return Promise.reject(error);
  }
);

// ============================================================
// ⚠️ Interceptador de Respostas (erros e logs)
// ============================================================
api.interceptors.response.use(
  (response) => {
    // sucesso → retorna normalmente
    document.body.style.cursor = "default"; // 🆕 reseta cursor
    return response;
  },
  (error) => {
    document.body.style.cursor = "default"; // 🆕 sempre reseta o cursor

    if (error.code === "ECONNABORTED") {
      console.error("⏱️ Tempo limite atingido ao tentar se conectar ao servidor.");
      alert("O servidor demorou demais para responder. Tente novamente.");
    } else if (error.message.includes("Network Error")) {
      console.error("🌐 Erro de rede: não foi possível conectar ao backend.");
      alert(`Não foi possível conectar ao servidor em ${API_BASE_URL}`);
    } else if (error.response) {
      console.error(
        `⚠️ Erro ${error.response.status}: ${error.response.data?.detail || "Falha na requisição."}`
      );
      alert(`Erro ${error.response.status}: ${error.response.data?.detail || "Falha na requisição."}`);
    } else {
      console.error("❌ Erro desconhecido:", error.message);
      alert("Erro inesperado. Verifique o console para mais detalhes.");
    }
    return Promise.reject(error);
  }
);

// ============================================================
// 📦 Função auxiliar para requisições genéricas (opcional)
// ============================================================
export async function apiRequest(endpoint, method = "get", data = null, params = null) {
  try {
    const response = await api.request({ url: `/${endpoint}`, method, data, params });
    return response.data;
  } catch (error) {
    console.error(`❌ Falha ao acessar /${endpoint}:`, error);
    throw error;
  }
}
