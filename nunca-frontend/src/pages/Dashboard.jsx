import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { api } from "../api/config";
import dayjs from "dayjs";

export default function Dashboard() {
  const [anoSelecionado, setAnoSelecionado] = useState(dayjs().year());
  const [dados, setDados] = useState(null);
  const [topClientes, setTopClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  const cores = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA336A", "#999999"];

  // 🔹 Carrega os dados do dashboard (receita prevista/recebida)
  const carregarDashboard = async () => {
    try {
      const response = await api.get(`/dashboard/periodo?ano=${anoSelecionado}`);
      setDados(response.data);
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
    }
  };

  // 🔹 Carrega os dados dos top 5 clientes
  const carregarTopClientes = async () => {
    try {
      const response = await api.get(`/dashboard/top-clientes-pagamentos?ano=${anoSelecionado}`);
      setTopClientes(response.data);
    } catch (error) {
      console.error("Erro ao carregar top clientes:", error);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([carregarDashboard(), carregarTopClientes()]).then(() => setLoading(false));
  }, [anoSelecionado]);

  if (loading || !dados) {
    return <p style={{ textAlign: "center", marginTop: "50px" }}>Carregando dados...</p>;
  }

  // 🔹 Dados para os gráficos mensais
  const dadosMensais = dados?.geral?.mensal || [];
  const dataGrafico = dadosMensais.map((item) => ({
    mes: item.mes,
    receita_prevista: item.valor, // total de serviços criados
    receita_recebida: item.receita_recebida || 0,
  }));

  // 🔹 Dados para o gráfico de pizza
  const dataPie = topClientes.map((item, index) => ({
    name: item.cliente_nome,
    value: item.total_pago,
    color: cores[index % cores.length],
  }));

  const totalPrevista = dados?.geral?.receita_prevista_periodo?.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const totalRecebida = dados?.geral?.receita_recebida_periodo?.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const totalLucro = dados?.geral?.lucro_liquido?.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const totalAReceber = dados?.geral?.a_receber_periodo?.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div style={{ padding: "30px", width: "100%", height: "100%", background: "#f7f9fc" }}>
      <h1 style={{ textAlign: "center", marginBottom: "20px" }}>Dashboard Financeiro</h1>

      {/* 🔹 Filtro de ano */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <label>
          <strong>Selecione o ano:</strong>{" "}
          <select
            value={anoSelecionado}
            onChange={(e) => setAnoSelecionado(e.target.value)}
            style={{ padding: "5px 10px", fontSize: "16px" }}
          >
            {[2023, 2024, 2025, 2026].map((ano) => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* 🔹 Cards de resumo */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "20px",
          marginBottom: "40px",
        }}
      >
        <Card titulo="Receita Prevista" valor={totalPrevista} cor="#007bff" />
        <Card titulo="Receita Recebida" valor={totalRecebida} cor="#28a745" />
        <Card titulo="Lucro Líquido" valor={totalLucro} cor="#17a2b8" />
        <Card titulo="A Receber" valor={totalAReceber} cor="#ffc107" />
      </div>

      {/* 🔹 Gráfico 1 - Barras */}
      <div style={{ width: "100%", height: "400px", marginBottom: "50px" }}>
        <h3 style={{ textAlign: "center", marginBottom: "10px" }}>
          Receita Prevista × Receita Recebida (Barras)
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dataGrafico}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="receita_prevista" fill="#007bff" name="Prevista" />
            <Bar dataKey="receita_recebida" fill="#ff7300" name="Recebida" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 🔹 Gráfico 2 - Linhas */}
      <div style={{ width: "100%", height: "400px", marginBottom: "50px" }}>
        <h3 style={{ textAlign: "center", marginBottom: "10px" }}>
          Receita Prevista × Receita Recebida (Linhas)
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dataGrafico}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="receita_prevista" stroke="#007bff" name="Prevista" />
            <Line type="monotone" dataKey="receita_recebida" stroke="#ff7300" name="Recebida" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 🔹 Gráfico 3 - Pizza */}
      <div style={{ width: "100%", height: "400px", marginBottom: "50px" }}>
        <h3 style={{ textAlign: "center", marginBottom: "10px" }}>
          Top 5 Clientes por Pagamentos
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dataPie}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}`}
              outerRadius={150}
              fill="#8884d8"
              dataKey="value"
            >
              {dataPie.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// 🔹 Componente de Card
function Card({ titulo, valor, cor }) {
  return (
    <div
      style={{
        backgroundColor: cor,
        color: "white",
        borderRadius: "10px",
        padding: "20px",
        textAlign: "center",
        fontWeight: "bold",
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
      }}
    >
      <h4 style={{ marginBottom: "10px" }}>{titulo}</h4>
      <h2>{valor}</h2>
    </div>
  );
}
