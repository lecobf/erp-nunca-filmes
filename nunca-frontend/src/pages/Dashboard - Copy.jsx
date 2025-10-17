import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import { api } from "../api/config";

export default function Dashboard() {
  const [dados, setDados] = useState(null);

  const anoAtual = new Date().getFullYear();
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [ano, setAno] = useState(anoAtual);
  const [mes, setMes] = useState("");

  // gráfico de barras (12 meses)
  const [mensalPrevistaRecebida, setMensalPrevistaRecebida] = useState([]);

  // gráficos de linha (12 meses)
  const [serieGeral, setSerieGeral] = useState([]);
  const [serieJobs, setSerieJobs] = useState([]);
  const [serieAluguel, setSerieAluguel] = useState([]);

  const formatBRL = (n) =>
    (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // ====== carregar KPIs/cards do período (mantido) ======
  const carregar = async (qs) => {
    try {
      const endpoint = `/dashboard/periodo${qs ? "?" + qs : ""}`;
      const res = await api.get(endpoint);
      setDados(res.data);
    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
    }
  };

  useEffect(() => {
    carregar(`ano=${anoAtual}`);
  }, []);

  const aplicarFiltro = async () => {
    const params = [];
    let anoRef = ano || anoAtual;

    if (dataInicio && dataFim) {
      params.push(`data_inicio=${dataInicio}`);
      params.push(`data_fim=${dataFim}`);
      if (!ano) anoRef = new Date(`${dataInicio}T00:00:00`).getFullYear();
    } else if (ano && mes) {
      params.push(`ano=${ano}`);
      params.push(`mes=${mes}`);
    } else if (ano) {
      params.push(`ano=${ano}`);
    }

    await carregar(params.join("&"));
    await carregarGraficoBarras(anoRef, dataInicio, dataFim);
    await carregarSeriesLinhas(anoRef, dataInicio, dataFim);
  };

  const limparFiltro = async () => {
    setDataInicio("");
    setDataFim("");
    setAno(anoAtual);
    setMes("");
    await carregar("");
    await carregarGraficoBarras(anoAtual);
    await carregarSeriesLinhas(anoAtual);
  };

  const periodLabel = useMemo(() => {
    if (dataInicio && dataFim) {
      const di = new Date(`${dataInicio}T00:00:00`).toLocaleDateString("pt-BR");
      const df = new Date(`${dataFim}T00:00:00`).toLocaleDateString("pt-BR");
      return `Filtrando de ${di} até ${df}`;
    }
    if (ano && mes) {
      const d = new Date(`${ano}-${String(mes).padStart(2, "0")}-01T00:00:00`);
      return `Filtrando: ${d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`;
    }
    if (ano) {
      return `Filtrando de 01/01/${ano} até 31/12/${ano}`;
    }
    return "Sem filtro aplicado (todos os dados)";
  }, [dataInicio, dataFim, ano, mes]);

  // ====== gráfico de barras Prevista x Recebida (mês a mês) ======
  const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  function montarSeriesMensaisBarras(servicos = [], pagamentos = [], anoRef) {
    const base = Array.from({ length: 12 }, (_, i) => ({
      idx: i,
      mes: MESES[i],
      Prevista: 0,
      Recebida: 0,
    }));

    // Prevista: soma valor_total dos serviços criados no mês
    for (const s of servicos) {
      const d = s?.data_contratacao ? new Date(s.data_contratacao) : null;
      if (!d || d.getFullYear() !== Number(anoRef)) continue;
      base[d.getMonth()].Prevista += Number(s.valor_total || 0);
    }

    // Recebida: soma dos pagamentos por mês (data_pagamento)
    for (const p of pagamentos) {
      const d = p?.data_pagamento ? new Date(p.data_pagamento) : null;
      if (!d || d.getFullYear() !== Number(anoRef)) continue;
      const vp = Number(p.valor_pago ?? p.valor_pagamento ?? 0) || 0;
      base[d.getMonth()].Recebida += vp;
    }

    return base;
  }

  async function carregarGraficoBarras(anoRef, di = "", df = "") {
    try {
      const srvReq = api.get("/servicos", { params: { ano: anoRef } });
      const pagReq = di && df
        ? api.get("/pagamentos", { params: { data_inicio: di, data_fim: df } })
        : api.get("/pagamentos", { params: { ano: anoRef } });

      const [srvRes, pagRes] = await Promise.all([srvReq, pagReq]);
      const series = montarSeriesMensaisBarras(srvRes.data || [], pagRes.data || [], anoRef);
      setMensalPrevistaRecebida(series);
    } catch (err) {
      console.error("Erro ao montar gráfico Prevista×Recebida:", err);
      setMensalPrevistaRecebida([]);
    }
  }

  // ====== gráficos de linha (APENAS pagamentos; tipo via pagamento.servico.tipo_servico) ======
  function base12Meses() {
    return Array.from({ length: 12 }, (_, i) => ({ mes: MESES[i], valor: 0 }));
  }

  function agruparPagamentosMensalPorTipo(pagamentos, { anoRef, di, df, tipoAlvo }) {
    const out = base12Meses();
    const hasRange = !!(di && df);
    const diDate = hasRange ? new Date(`${di}T00:00:00`) : null;
    const dfDate = hasRange ? new Date(`${df}T23:59:59`) : null;

    for (const p of pagamentos) {
      const d = p?.data_pagamento ? new Date(p.data_pagamento) : null;
      if (!d) continue;

      // aplica ano ou range
      if (hasRange) {
        if (d < diDate || d > dfDate) continue;
      } else {
        if (d.getFullYear() !== Number(anoRef)) continue;
      }

      // tipo direto do relacionamento serializado
      const tipo =
        p?.tipo_servico ??
        p?.servico?.tipo_servico ??
        p?.servico_tipo ??
        "";

      const idx = d.getMonth();
      const vp = Number(p.valor_pago ?? p.valor_pagamento ?? 0) || 0;

      if (!tipoAlvo) {
        out[idx].valor += vp; // Geral
      } else if (String(tipo).toLowerCase() === String(tipoAlvo).toLowerCase()) {
        out[idx].valor += vp; // Filtro por tipo
      }
    }
    return out;
  }

  async function carregarSeriesLinhas(anoRef, di = "", df = "") {
    try {
      const pagRes = di && df
        ? await api.get("/pagamentos", { params: { data_inicio: di, data_fim: df } })
        : await api.get("/pagamentos", { params: { ano: anoRef } });

      const pagamentos = pagRes.data || [];

      const geral = agruparPagamentosMensalPorTipo(pagamentos, { anoRef, di, df, tipoAlvo: null });
      const jobs = agruparPagamentosMensalPorTipo(pagamentos, { anoRef, di, df, tipoAlvo: "Job" });
      const aluguel = agruparPagamentosMensalPorTipo(pagamentos, { anoRef, di, df, tipoAlvo: "Aluguel" });

      setSerieGeral(geral);
      setSerieJobs(jobs);
      setSerieAluguel(aluguel);
    } catch (err) {
      console.error("Erro ao montar séries de linha por pagamentos:", err);
      const zeros = base12Meses();
      setSerieGeral(zeros);
      setSerieJobs(zeros);
      setSerieAluguel(zeros);
    }
  }

  // carrega barras + linhas com ano atual ao abrir
  useEffect(() => {
    carregarGraficoBarras(anoAtual);
    carregarSeriesLinhas(anoAtual);
  }, []);

  // ao mudar o ano: zera mês, recarrega barras + linhas nesse ano
  useEffect(() => {
    const anoRef = ano || anoAtual;
    setMes(""); // reset do mês ao trocar o ano
    carregarGraficoBarras(anoRef);
    carregarSeriesLinhas(anoRef);
  }, [ano]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!dados) return <div className="p-4">Carregando...</div>;

  // ====== componentes/kpis (fonte menor) ======
  const Card = ({ titulo, valor, destaque }) => (
    <div className="bg-white shadow rounded-lg p-3 text-center">
      <h3 className="text-xs text-gray-500">{titulo}</h3>
      <p className={`text-xl font-semibold ${destaque ? "text-green-600" : "text-gray-800"}`}>
        {formatBRL(valor)}
      </p>
    </div>
  );

  const GraficoLinha = ({ data, titulo, cor }) => (
    <div className="bg-white shadow rounded-lg p-4">
      <h3 className="text-base font-semibold mb-4">{titulo}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => formatBRL(v)} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => formatBRL(v)} />
          <Line type="monotone" dataKey="valor" stroke={cor} strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      {/* Filtros superiores */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex gap-2">
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="border p-2 rounded"
          />
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="border p-2 rounded"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Ano"
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            className="border p-2 rounded w-24"
          />
          <select
            value={mes || ""} // zera quando ano muda
            onChange={(e) => setMes(Number(e.target.value))}
            className="border p-2 rounded w-36"
          >
            <option value="">Mês</option>
            {MESES.map((m, i) => (
              <option key={i + 1} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={aplicarFiltro} className="bg-blue-600 text-white px-4 py-2 rounded">
            Filtrar
          </button>
          <button onClick={limparFiltro} className="bg-gray-400 text-white px-4 py-2 rounded">
            Limpar
          </button>
        </div>
      </div>

      <div className="mb-3 bg-blue-50 text-blue-800 px-4 py-2 rounded text-sm">
        {periodLabel}
      </div>

      {/* KPIs */}
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-semibold mb-3">Jobs</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card titulo="Receita Prevista" valor={dados.job.receita_prevista_periodo} />
            <Card titulo="Receita Recebida (no período)" valor={dados.job.receita_recebida_periodo} />
            <Card titulo="Recebida Retroativa" valor={dados.job.receita_retroativa} />
            <Card titulo="A Receber (período)" valor={dados.job.a_receber_periodo} />
            <Card titulo="A Receber Retroativo" valor={dados.job.a_receber_retroativo} />
            <Card titulo="Lucro Líquido" valor={dados.job.lucro_liquido} destaque />
          </div>
        </div>

        <div>
          <h3 className="text-base font-semibold mb-3">Aluguéis</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card titulo="Receita Prevista" valor={dados.aluguel.receita_prevista_periodo} />
            <Card titulo="Receita Recebida (no período)" valor={dados.aluguel.receita_recebida_periodo} />
            <Card titulo="Recebida Retroativa" valor={dados.aluguel.receita_retroativa} />
            <Card titulo="A Receber (período)" valor={dados.aluguel.a_receber_periodo} />
            <Card titulo="A Receber Retroativo" valor={dados.aluguel.a_receber_retroativo} />
            <Card titulo="Lucro Líquido" valor={dados.aluguel.lucro_liquido} destaque />
          </div>
        </div>

        <div>
          <h3 className="text-base font-semibold mb-3">Geral</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card titulo="Receita Prevista" valor={dados.geral.receita_prevista_periodo} />
            <Card titulo="Receita Recebida (no período)" valor={dados.geral.receita_recebida_periodo} />
            <Card titulo="Recebida Retroativa" valor={dados.geral.receita_retroativa} />
            <Card titulo="A Receber (período)" valor={dados.geral.a_receber_periodo} />
            <Card titulo="A Receber Retroativo" valor={dados.geral.a_receber_retroativo} />
            <Card titulo="Lucro Líquido" valor={dados.geral.lucro_liquido} destaque />
          </div>
        </div>
      </div>

      {/* ======= GRÁFICO MAIOR: Prevista × Recebida ======= */}
      <div className="bg-white shadow rounded-lg p-4 mt-8">
        <h3 className="text-lg font-semibold mb-4">
          Receita Prevista × Receita Recebida (mês a mês)
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={mensalPrevistaRecebida}
            margin={{ top: 10, right: 24, left: 92, bottom: 40 }}  // ⬅️ mais espaço à esquerda
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis
              width={92}                                  // ⬅️ largura fixa para os ticks em BRL
              tickFormatter={(v) => formatBRL(v)}
              tick={{ fontSize: 12 }}
            />
            <Tooltip formatter={(value) => formatBRL(value)} />
            <Legend
              verticalAlign="bottom"
              align="center"
              height={24}
              wrapperStyle={{ fontSize: 12 }}
            />
            {/* Azul = Prevista; Laranja = Recebida */}
            <Bar dataKey="Prevista" name="Receita Prevista" fill="#3b82f6" />
            <Bar dataKey="Recebida" name="Receita Recebida" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
        <div className="text-xs text-gray-500 mt-2">
          Prevista: soma de <code>valor_total</code> dos serviços criados em cada mês (data de contratação). Recebida:
          soma de <code>valor_pago</code> (ou <code>valor_pagamento</code>) com <strong>data de pagamento</strong> no mês.
        </div>
      </div>

      {/* Gráficos menores de linha — 12 pontos, PAGAMENTOS e tipo direto do relacionamento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <GraficoLinha data={serieGeral}   titulo="Receita por Mês (Geral)"    cor="#3b82f6" />
        <GraficoLinha data={serieJobs}    titulo="Receita por Mês (Jobs)"     cor="#10b981" />
        <GraficoLinha data={serieAluguel} titulo="Receita por Mês (Aluguéis)" cor="#f59e0b" />
      </div>
    </div>
  );
}
