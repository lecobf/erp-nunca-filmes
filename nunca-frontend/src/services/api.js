import axios from 'axios';

// Cria instância global do Axios
const api = axios.create({
  baseURL: '/api', // ajuste conforme seu backend local
  timeout: 30000, // 30 segundos
});

// Interceptor para requisições (antes de enviar)
api.interceptors.request.use(
  (config) => {
    // Pode exibir um "carregando..." aqui se quiser
    console.log('🔄 Enviando requisição para:', config.url);
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para respostas
api.interceptors.response.use(
  (response) => {
    // Tudo certo → retorna resposta normalmente
    console.log('✅ Resposta recebida:', response.status);
    return response;
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Timeout: o servidor demorou demais pra responder.');
      alert('O servidor demorou demais para responder. Tente novamente.');
    } else if (error.response) {
      console.error('❌ Erro da API:', error.response.status, error.response.data);
      alert(`Erro ${error.response.status}: ${error.response.data?.detail || 'Falha na requisição.'}`);
    } else {
      console.error('⚠️ Erro inesperado:', error.message);
      alert('Falha de conexão com o servidor.');
    }
    return Promise.reject(error);
  }
);

export default api;
