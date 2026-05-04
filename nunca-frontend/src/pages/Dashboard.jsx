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
  const totalAReceber = (
    (dados?.geral?.a_receber_periodo || 0) + (dados?.geral?.a_receber_retroativo || 0)
  ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-full">
      <h1 className="text-xl md:text-2xl font-bold text-center mb-4">Dashboard Financeiro</h1>

      {/* Filtro de ano */}
      <div className="flex justify-center mb-5">
        <label className="flex items-center gap-2 text-sm font-medium">
          <span>Ano:</span>
          <select
            value={anoSelecionado}
            onChange={(e) => setAnoSelecionado(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          >
            {[2023, 2024, 2025, 2026].map((ano) => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-8">
        <Card titulo="Receita Prevista" valor={totalPrevista} cor="#007bff" />
        <Card titulo="Receita Recebida" valor={totalRecebida} cor="#28a745" />
        <Card titulo="Lucro Líquido" valor={totalLucro} cor="#17a2b8" />
        <Card titulo="A Receber" valor={totalAReceber} cor="#ffc107" />
      </div>

      {/* Gráfico 1 - Barras */}
      <div className="w-full mb-10">
        <h3 className="text-center text-sm md:text-base font-semibold mb-2">
          Receita Prevista × Receita Recebida (Barras)
        </h3>
        <div style={{ height: "300px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={70} />
              <Tooltip />
              <Legend />
              <Bar dataKey="receita_prevista" fill="#007bff" name="Prevista" />
              <Bar dataKey="receita_recebida" fill="#ff7300" name="Recebida" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 2 - Linhas */}
      <div className="w-full mb-10">
        <h3 className="text-center text-sm md:text-base font-semibold mb-2">
          Receita Prevista × Receita Recebida (Linhas)
        </h3>
        <div style={{ height: "300px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={70} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="receita_prevista" stroke="#007bff" name="Prevista" />
              <Line type="monotone" dataKey="receita_recebida" stroke="#ff7300" name="Recebida" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 3 - Pizza */}
      <div className="w-full mb-10">
        <h3 className="text-center text-sm md:text-base font-semibold mb-2">
          Top 5 Clientes por Pagamentos
        </h3>
        <div style={{ height: "320px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataPie}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={false}
                outerRadius="60%"
                fill="#8884d8"
                dataKey="value"
              >
                {dataPie.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) =>
                  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                }
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Card({ titulo, valor, cor }) {
  return (
    <div
      style={{ backgroundColor: cor }}
      className="text-white rounded-xl p-4 text-center font-bold shadow"
    >
      <p className="text-xs md:text-sm mb-1 opacity-90">{titulo}</p>
      <p className="text-base md:text-xl leading-tight">{valor}</p>
    </div>
  );
}
