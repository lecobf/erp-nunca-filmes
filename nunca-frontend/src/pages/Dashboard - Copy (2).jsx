import { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer
} from "recharts";
import { api } from "../api/config";

export default function Dashboard() {
  const [dados, setDados] = useState(null);
  const [mensalPrevistaRecebida, setMensalPrevistaRecebida] = useState([]);
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const formatBRL = (n) =>
    (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const carregar = async (qs) => {
    try {
      const endpoint = `/dashboard/periodo${qs ? "?" + qs : ""}`;
      const res = await api.get(endpoint);
      setDados(res.data);
    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
    }
  };

  const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  function montarSeriesMensais(servicos = [], pagamentos = [], anoRef) {
    const base = Array.from({ length: 12 }, (_, i) => ({
      mes: MESES[i],
      Prevista: 0,
      Recebida: 0,
    }));

    for (const s of servicos) {
      const d = s?.data_contratacao ? new Date(s.data_contratacao) : null;
      if (!d || d.getFullYear() !== Number(anoRef)) continue;
      base[d.getMonth()].Prevista += Number(s.valor_final || 0);
    }

    for (const p of pagamentos) {
      const d = p?.data_pagamento ? new Date(p.data_pagamento) : null;
      if (!d || d.getFullYear() !== Number(anoRef)) continue;
      base[d.getMonth()].Recebida += Number(p.valor_pago || 0);
    }

    return base;
  }

  async function carregarGrafico(anoRef, di = "", df = "") {
    try {
      const srvReq = api.get("/servicos", { params: { ano: anoRef } });
      const pagReq = di && df
        ? api.get("/pagamentos", { params: { data_inicio: di, data_fim: df } })
        : api.get("/pagamentos", { params: { ano: anoRef } });

      const [srvRes, pagRes] = await Promise.all([srvReq, pagReq]);
      const series = montarSeriesMensais(srvRes.data || [], pagRes.data || [], anoRef);
      setMensalPrevistaRecebida(series);
    } catch (err) {
      console.error("Erro ao montar gráfico:", err);
      setMensalPrevistaRecebida([]);
    }
  }

  useEffect(() => {
    carregar(`ano=${anoAtual}`);
    carregarGrafico(anoAtual);
  }, []);

  const aplicarFiltro = async () => {
    const params = [];
    if (dataInicio && dataFim) {
      params.push(`data_inicio=${dataInicio}`);
      params.push(`data_fim=${dataFim}`);
    } else if (ano) {
      params.push(`ano=${ano}`);
    }
    await carregar(params.join("&"));
    await carregarGrafico(ano, dataInicio, dataFim);
  };

  const limparFiltro = async () => {
    setDataInicio("");
    setDataFim("");
    setAno(anoAtual);
    await carregar("");
    await carregarGrafico(anoAtual);
  };

  const periodLabel = useMemo(() => {
    if (dataInicio && dataFim) {
      const di = new Date(`${dataInicio}T00:00:00`).toLocaleDateString("pt-BR");
      const df = new Date(`${dataFim}T00:00:00`).toLocaleDateString("pt-BR");
      return `Filtrando de ${di} até ${df}`;
    }
    if (ano) return `Filtrando de 01/01/${ano} até 31/12/${ano}`;
    return "Sem filtro aplicado";
  }, [dataInicio, dataFim, ano]);

  if (!dados) return <div className="p-4">Carregando...</div>;

  const Card = ({ titulo, valor, destaque }) => (
    <div className="bg-white shadow rounded-lg p-3 text-center">
      <h3 className="text-xs text-gray-500">{titulo}</h3>
      <p className={`text-xl font-semibold ${destaque ? "text-green-600" : "text-gray-800"}`}>
        {formatBRL(valor)}
      </p>
    </div>
  );

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex gap-2">
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="border p-2 rounded" />
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="border p-2 rounded" />
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Ano"
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            className="border p-2 rounded w-24"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={aplicarFiltro} className="bg-blue-600 text-white px-4 py-2 rounded">Filtrar</button>
          <button onClick={limparFiltro} className="bg-gray-400 text-white px-4 py-2 rounded">Limpar</button>
        </div>
      </div>

      <div className="mb-3 bg-blue-50 text-blue-800 px-4 py-2 rounded text-sm">
        {periodLabel}
      </div>

      {/* KPIs */}
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-semibold mb-3">Geral</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card titulo="Receita Prevista" valor={dados.geral.receita_prevista_periodo} />
            <Card titulo="Receita Recebida (período)" valor={dados.geral.receita_recebida_periodo} />
            <Card titulo="Recebida Retroativa" valor={dados.geral.receita_retroativa} />
            <Card titulo="A Receber (período)" valor={dados.geral.a_receber_periodo} />
            <Card titulo="A Receber Retroativo" valor={dados.geral.a_receber_retroativo} />
            <Card titulo="Lucro Líquido" valor={dados.geral.lucro_liquido} destaque />
          </div>
        </div>
      </div>

      {/* ===== ÚNICO GRÁFICO: Receita Prevista × Recebida ===== */}
      <div className="bg-white shadow rounded-lg p-6 mt-8">
        <h3 className="text-lg font-semibold mb-4">
          Receita Prevista × Receita Recebida (mês a mês)
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={mensalPrevistaRecebida}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis
              tickFormatter={(v) => formatBRL(v)}
              tick={{ fontSize: 12 }}
              width={100}
            />
            <Tooltip formatter={(value) => formatBRL(value)} />
            <Legend verticalAlign="bottom" align="center" height={36} wrapperStyle={{ fontSize: 13 }} />
            <Line type="monotone" dataKey="Prevista" name="Receita Prevista" stroke="#3b82f6" strokeWidth={3} dot />
            <Line type="monotone" dataKey="Recebida" name="Receita Recebida" stroke="#f59e0b" strokeWidth={3} dot />
          </LineChart>
        </ResponsiveContainer>
        <div className="text-xs text-gray-500 mt-2">
          Azul: soma de <code>valor_final</code> dos serviços criados em cada mês. Laranja: soma de <code>valor_pago</code> com <strong>data_pagamento</strong> no mês.
        </div>
      </div>
    </div>
  );
}
