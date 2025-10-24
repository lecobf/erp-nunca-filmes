// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
} from "@mui/material";
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
  const [loading, setLoading] = useState(true);
  const [dadosPeriodo, setDadosPeriodo] = useState([]);
  const [topClientes, setTopClientes] = useState([]);

  const anoAtual = dayjs().year();

  useEffect(() => {
    carregarDadosPeriodo();
    carregarTopClientes();
  }, []);

  const carregarDadosPeriodo = async () => {
    try {
      const response = await api.get(`/dashboard/periodo?ano=${anoAtual}`);
      const data = response?.data;
      // Usa os dados mensais de "geral"
      const mensal = data?.geral?.mensal || [];
      setDadosPeriodo(Array.isArray(mensal) ? mensal : []);
    } catch (error) {
      console.error("Erro ao carregar dados do período:", error);
      setDadosPeriodo([]);
    } finally {
      setLoading(false);
    }
  };

  const carregarTopClientes = async () => {
    try {
      const response = await api.get(`/dashboard/top-clientes-pagamentos?ano=${anoAtual}`);
      const data = response?.data;
      setTopClientes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar top clientes:", error);
      setTopClientes([]);
    }
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#FF6666"];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3} width="100%" sx={{ backgroundColor: "#f9f9f9", minHeight: "100vh" }}>
      <Typography variant="h4" gutterBottom fontWeight="bold" textAlign="center">
        Dashboard Financeiro {anoAtual}
      </Typography>

      {/* === Gráfico 1: Receita Prevista === */}
      <Paper sx={{ p: 3, mb: 4, width: "100%" }} elevation={3}>
        <Typography variant="h6" gutterBottom>
          Receita Prevista (Valor Final dos Serviços)
        </Typography>
        <Box sx={{ width: "100%", height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosPeriodo}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip formatter={(v) => `R$ ${v?.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="valor" fill="#1976d2" name="Receita Prevista" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* === Gráfico 2: Receita Recebida === */}
      <Paper sx={{ p: 3, mb: 4, width: "100%" }} elevation={3}>
        <Typography variant="h6" gutterBottom>
          Receita Recebida (Pagamentos por Mês)
        </Typography>
        <Box sx={{ width: "100%", height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dadosPeriodo}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip formatter={(v) => `R$ ${v?.toLocaleString()}`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="valor"
                stroke="#ff7300"
                name="Receita Recebida"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* === Gráfico 3: Top 5 Clientes === */}
      <Paper sx={{ p: 3, width: "100%", mb: 6 }} elevation={3}>
        <Typography variant="h6" gutterBottom>
          Top 5 Clientes com Maior Volume de Pagamentos ({anoAtual})
        </Typography>
        <Box sx={{ width: "100%", height: 450 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={topClientes}
                dataKey="total_pago"
                nameKey="cliente_nome"
                cx="50%"
                cy="50%"
                outerRadius={150}
                label={({ cliente_nome, total_pago }) =>
                  `${cliente_nome}: R$${total_pago?.toLocaleString() ?? 0}`
                }
              >
                {topClientes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `R$${value?.toLocaleString() ?? 0}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </Box>
  );
}
