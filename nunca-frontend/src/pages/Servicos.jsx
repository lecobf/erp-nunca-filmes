import { useEffect, useMemo, useState } from "react";
import { api } from "../api/config"; // ✅ substitui axios direto
import Modal from "../components/Modal";
import CurrencyInput from "../components/CurrencyInput";
import DateInput from "../components/DateInput";
import { fmtBRL, fmtDateBR } from "../utils/formatters";
import { Pencil, Trash2 } from "lucide-react";
import IconButton from "../components/IconButton";
// import Pagination from "../components/Pagination"; // ❌ não usamos mais
import CampoEquipamentos from "../components/servicos/CampoEquipamentos";




export default function Servicos() {
  const [servicos, setServicos] = useState([]);
  const [clientes, setClientes] = useState([]);

  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear());
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  // 🔄 paginação (novo: pageSize é editável)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const dataHoje = new Date().toISOString().split("T")[0];

  const meses = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
  ];

  const [formData, setFormData] = useState({
    data_contratacao: dataHoje,
    tipo_servico: "Job",
    cliente_id: "",
    descricao: "",
    numero_diarias: 1,
    valor_diaria_cache: 0,
    valor_diaria_equipamentos: 0,
    valor_total: 0,
    valor_desconto: 0,
    valor_final: 0,
    data_previsao_pagamento: null,
    status: "pendente",
    equipamentos: [],
    is_pacote: false,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [servicoEditando, setServicoEditando] = useState(null);
  const [equipKey, setEquipKey] = useState(0); // força limpar CampoEquipamentos no pós-criação

  useEffect(() => {
    carregarServicos();
    carregarClientes();
  }, []);

  useEffect(() => {
    const total =
      (Number(formData.valor_diaria_cache) + Number(formData.valor_diaria_equipamentos)) *
      Number(formData.numero_diarias || 1);
    setFormData((prev) => ({
      ...prev,
      valor_total: total,
      valor_final: total - Number(prev.valor_desconto || 0),
    }));
  }, [
    formData.valor_diaria_cache,
    formData.valor_diaria_equipamentos,
    formData.numero_diarias,
    formData.valor_desconto,
  ]);

  async function carregarServicos() {
    const resp = await api.get("/servicos");
    setServicos(resp.data || []);
  }

  async function carregarClientes() {
    const resp = await api.get("/clientes");
    setClientes(resp.data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      // 1) Normaliza números (garante mínimo de 1 diária)
      const nDiarias = Math.max(1, Number(formData.numero_diarias) || 1);
      const vCache   = Number(formData.valor_diaria_cache) || 0;
      const vEqp     = Number(formData.valor_diaria_equipamentos) || 0;
      const vDesc    = Number(formData.valor_desconto) || 0;

      // 2) Datas no formato YYYY-MM-DD
      const fmtDate = (d) => (typeof d === "string" ? d.slice(0, 10) : d || null);
      const data_contratacao        = fmtDate(formData.data_contratacao);
      const data_previsao_pagamento = fmtDate(formData.data_previsao_pagamento);

      // 3) Derivados
      const valor_total = (vCache + vEqp) * nDiarias;
      const valor_final = Math.max(0, valor_total - vDesc);

      // 4) Equipamentos
      const mappedEquipamentos = (formData.equipamentos || [])
        .map((e) => ({
          equipamento_id: e.equipamento_id ?? e.id ?? e?.equipamento?.id,
          quantidade: Number(e.quantidade ?? e.qtd ?? 1) || 1,
        }))
        .filter((e) => e.equipamento_id != null);

      // 5) Payload limpo
      const payload = {
        data_contratacao,
        tipo_servico: formData.tipo_servico,
        cliente_id: formData.cliente_id ? Number(formData.cliente_id) : null,
        descricao: formData.descricao,
        numero_diarias: nDiarias,
        valor_diaria_cache: vCache,
        valor_diaria_equipamentos: vEqp,
        valor_total,
        valor_desconto: vDesc,
        valor_final,
        data_previsao_pagamento,
        status: formData.status || "pendente",
        is_pacote: !!formData.is_pacote,
        equipamentos: formData.is_pacote ? [] : mappedEquipamentos,
      };

      // (Opcional) regra: não-pacote precisa ter itens
      if (!payload.is_pacote && payload.equipamentos.length === 0) {
        alert("Selecione ao menos um equipamento ou marque 'É pacote'.");
        return;
      }

      await api.post("/servicos", payload);

      // reset form
      setFormData({
        data_contratacao: dataHoje,
        tipo_servico: "Job",
        cliente_id: "",
        descricao: "",
        numero_diarias: 1,
        valor_diaria_cache: 0,
        valor_diaria_equipamentos: 0,
        valor_total: 0,
        valor_desconto: 0,
        valor_final: 0,
        data_previsao_pagamento: null,
        status: "pendente",
        equipamentos: [],
        is_pacote: false,
      });
      setEquipKey((k) => k + 1);
      await carregarServicos();
    } catch (err) {
      const data = err?.response?.data;
      let msg = err?.message || "Erro desconhecido";
      if (data?.detail) { try { msg = JSON.stringify(data.detail, null, 2); } catch { msg = String(data.detail); } }
      else if (data?.errors) { try { msg = JSON.stringify(data.errors, null, 2); } catch { msg = String(data.errors); } }
      console.error("Erro ao criar serviço (422):", data || err);
      alert(`Erro ao criar serviço (422):\n${msg}`);
    }
  }

  async function abrirEdicao(servicoId) {
    const resp = await api.get(`/servicos/${servicoId}`);
    const s = resp.data?.servico || resp.data;

    setServicoEditando({
      ...s,
      data_contratacao: s.data_contratacao?.split("T")?.[0] || s.data_contratacao || dataHoje,
      cliente_id: s.cliente_id?.toString?.() ?? "",
      numero_diarias: s.numero_diarias ?? 1,
      valor_diaria_cache: s.valor_diaria_cache ?? 0,
      valor_diaria_equipamentos: s.valor_diaria_equipamentos ?? 0,
      valor_desconto: s.valor_desconto ?? 0,
      valor_total: s.valor_total ?? 0,
      valor_final: s.valor_final ?? 0,
      data_previsao_pagamento: s.data_previsao_pagamento?.split?.("T")?.[0] || s.data_previsao_pagamento || null,
      equipamentos: Array.isArray(s.equipamentos) ? s.equipamentos : [],
      status: s.status || "pendente",
      is_pacote: !!s.is_pacote,
    });

    setModalOpen(true);
  }

  async function salvarServico() {
    if (!servicoEditando) return;

    try {
      const nDiarias = Number(servicoEditando.numero_diarias) || 0;
      const vCache   = Number(servicoEditando.valor_diaria_cache) || 0;
      const vEqp     = Number(servicoEditando.valor_diaria_equipamentos) || 0;
      const vDesc    = Number(servicoEditando.valor_desconto) || 0;

      const fmtDate = (d) => (typeof d === "string" ? d.slice(0, 10) : d);
      const data_contratacao        = fmtDate(servicoEditando.data_contratacao);
      const data_previsao_pagamento = fmtDate(servicoEditando.data_previsao_pagamento);

      const valor_total = (vCache + vEqp) * nDiarias;
      const valor_final = Math.max(0, valor_total - vDesc);

      const mappedEquipamentos = (servicoEditando.equipamentos || [])
        .map((e) => ({
          equipamento_id: e.equipamento_id ?? e.id ?? e?.equipamento?.id,
          quantidade: Number(e.quantidade ?? e.qtd ?? 1) || 1,
        }))
        .filter((e) => e.equipamento_id != null);

      const payload = {
        id: servicoEditando.id,
        data_contratacao,
        tipo_servico: servicoEditando.tipo_servico,
        cliente_id: Number(servicoEditando.cliente_id) || servicoEditando.cliente_id,
        descricao: servicoEditando.descricao,
        numero_diarias: nDiarias,
        valor_diaria_cache: vCache,
        valor_diaria_equipamentos: vEqp,
        valor_total,
        valor_desconto: vDesc,
        valor_final,
        data_previsao_pagamento,
        status: servicoEditando.status,
        is_pacote: !!servicoEditando.is_pacote,
        equipamentos: servicoEditando.is_pacote ? [] : mappedEquipamentos,
      };

      await api.put(`/servicos/${servicoEditando.id}`, payload);
      setModalOpen(false);
      setServicoEditando(null);
      await carregarServicos();
    } catch (err) {
      const data = err?.response?.data;
      let msg = err.message;
      if (data?.detail) { try { msg = JSON.stringify(data.detail, null, 2); } catch { msg = String(data.detail); } }
      else if (data?.errors) { try { msg = JSON.stringify(data.errors, null, 2); } catch { msg = String(data.errors); } }
      console.error("Erro ao salvar (422):", data || err);
      alert(`Erro ao salvar serviço (422):\n${msg}`);
    }
  }

  async function deletarServico(id) {
    if (!window.confirm("Tem certeza que deseja excluir este serviço?")) return;
    await api.delete(`/servicos/${id}`);
    await carregarServicos();
  }

  // 📋 filtros + ordenação
  const servicosFiltrados = useMemo(() => {
    let lista = [...servicos];

    if (filtroAno) {
      lista = lista.filter((s) => {
        const y = new Date(s.data_contratacao).getFullYear();
        return y === Number(filtroAno);
      });
    }
    if (filtroMes) {
      lista = lista.filter((s) => {
        const m = new Date(s.data_contratacao).getMonth() + 1;
        return m === Number(filtroMes);
      });
    }
    if (filtroStatus) {
      lista = lista.filter((s) => s.status === filtroStatus);
    }
    if (filtroCliente) {
      lista = lista.filter((s) => String(s.cliente_id) === String(filtroCliente));
    }
    if (filtroTipo) {
      lista = lista.filter((s) => s.tipo_servico === filtroTipo);
    }
    return lista.sort((a, b) => new Date(b.data_contratacao) - new Date(a.data_contratacao));
  }, [servicos, filtroAno, filtroMes, filtroStatus, filtroCliente, filtroTipo]);

  // 📄 paginação (novo – robusto)
  const totalRecords = servicosFiltrados.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / Math.max(1, pageSize)));

  // corrige página fora do limite ao trocar filtros/tamanho
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return servicosFiltrados.slice(start, start + pageSize);
  }, [servicosFiltrados, page, pageSize]);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Serviços</h2>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-12 gap-3 bg-white p-5 rounded-xl shadow"
      >
        {/* Data */}
        <label className="col-span-12 md:col-span-3 text-sm">
          <span className="block mb-1 font-medium">Data</span>
          <DateInput
            className="w-full"
            value={formData.data_contratacao}
            onChange={(d) => setFormData({ ...formData, data_contratacao: d })}
          />
        </label>

        {/* Tipo */}
        <label className="col-span-12 md:col-span-3 text-sm">
          <span className="block mb-1 font-medium">Tipo</span>
          <select
            name="tipo_servico"
            value={formData.tipo_servico}
            onChange={(e) => setFormData({ ...formData, tipo_servico: e.target.value })}
            className="border p-2 rounded w-full"
          >
            <option value="Job">Job</option>
            <option value="Aluguel">Aluguel</option>
          </select>
        </label>

        {/* Cliente */}
        <label className="col-span-12 md:col-span-4 text-sm">
          <span className="block mb-1 font-medium">Cliente</span>
          <select
            value={formData.cliente_id}
            onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
            className="border p-2 rounded w-full"
          >
            <option value="">Selecione...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </label>

        {/* Nº Diárias */}
        <label className="col-span-6 md:col-span-2 text-sm">
          <span className="block mb-1 font-medium">Nº Diárias</span>
          <input
            type="number"
            value={formData.numero_diarias}
            min="1"
            onChange={(e) => setFormData({ ...formData, numero_diarias: e.target.value })}
            className="border p-2 rounded w-full"
          />
        </label>

        {/* Descrição */}
        <label className="col-span-12 md:col-span-12 text-sm">
          <span className="block mb-1 font-medium">Descrição</span>
          <input
            type="text"
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            className="border p-2 rounded w-full"
            placeholder="Ex: Job Coca-Cola SP"
          />
        </label>

        {/* Valor Diária Cachê */}
        {formData.tipo_servico === "Job" && (
          <label className="col-span-12 md:col-span-3 text-sm">
            <span className="block mb-1 font-medium">Valor Diária Cachê</span>
            <CurrencyInput
              value={formData.valor_diaria_cache}
              onChange={(val) => setFormData({ ...formData, valor_diaria_cache: val })}
              className="h-10"
            />
          </label>
        )}

        {/* Valor Diária Equipamentos */}
        <div className="col-span-12 md:col-span-5 md:col-start-4 text-sm">
          <CampoEquipamentos
            key={equipKey}
            showLabel={true}
            valor={Number(formData.valor_diaria_equipamentos) || 0}
            pacoteInicial={formData.is_pacote}
            onValorChange={(val) =>
              setFormData((prev) =>
                prev.valor_diaria_equipamentos === val ? prev : { ...prev, valor_diaria_equipamentos: val }
              )
            }
            onSelecionar={(lista) =>
              setFormData((prev) => {
                const igual = JSON.stringify(prev.equipamentos) === JSON.stringify(lista);
                return igual ? prev : { ...prev, equipamentos: lista };
              })
            }
            onPacoteChange={(checked) =>
              setFormData((prev) => ({
                ...prev,
                is_pacote: !!checked,
                valor_diaria_equipamentos: checked ? prev.valor_diaria_equipamentos : 0,
                equipamentos: checked ? [] : prev.equipamentos,
              }))
            }
          />
        </div>

        {/* Valor Total */}
        <label className="col-span-12 sm:col-span-4 md:col-span-4 text-sm">
          <span className="block mb-1 font-medium">Valor Total</span>
          <input
            type="text"
            value={fmtBRL(formData.valor_total)}
            readOnly
            className="border p-2 rounded bg-gray-100 w-full h-10"
          />
        </label>

        {/* Desconto */}
        <label className="col-span-12 sm:col-span-4 md:col-span-3 text-sm">
          <span className="block mb-1 font-medium">Desconto</span>
          <CurrencyInput
            value={formData.valor_desconto}
            onChange={(val) => setFormData({ ...formData, valor_desconto: val })}
            className="h-10"
          />
        </label>

        {/* Valor Final */}
        <label className="col-span-12 sm:col-span-4 md:col-span-3 text-sm">
          <span className="block mb-1 font-medium">Valor Final</span>
          <input
            type="text"
            value={fmtBRL(formData.valor_final)}
            readOnly
            className="border p-2 rounded bg-gray-100 w-full h-10"
          />
        </label>

        {/* Previsão Pgto */}
        <label className="col-span-12 sm:col-span-6 md:col-span-3 text-sm">
          <span className="block mb-1 font-medium">Previsão Pgto</span>
          <DateInput
            className="w-full h-10"
            value={formData.data_previsao_pagamento || ""}
            onChange={(d) => setFormData((prev) => ({ ...prev, data_previsao_pagamento: d }))}
          />
        </label>

        {/* Botão salvar */}
        <div className="col-span-12 sm:col-span-6 md:col-span-3 flex items-end justify-end">
          <button
            type="submit"
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Salvar
          </button>
        </div>
      </form>

      {/* FILTROS E TABELA */}
      <div className="mt-6 bg-white p-4 rounded shadow">
        {/* filtros */}
        <div className="flex flex-wrap gap-3 items-center mb-4 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-gray-700">Ano:</span>
            <input
              type="number"
              value={filtroAno}
              onChange={(e) => { setFiltroAno(e.target.value); setPage(1); }}
              className="border rounded px-2 h-9 w-24"
            />
          </label>

          <label className="flex items-center gap-2">
            <span className="text-gray-700">Mês:</span>
            <select className="h-9 px-2 py-1.5 border rounded text-sm"
              value={filtroMes}
              onChange={(e) => { setFiltroMes(e.target.value); setPage(1); }}
              className="border rounded px-2 h-9"
            >
              <option value="">Todos</option>
              {meses.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="text-gray-700">Status:</span>
            <select className="h-9 px-2 py-1.5 border rounded text-sm"
              value={filtroStatus}
              onChange={(e) => { setFiltroStatus(e.target.value); setPage(1); }}
              className="border rounded px-2 h-9"
            >
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="parcial">Parcial</option>
              <option value="pago">Pago</option>
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="text-gray-700">Cliente:</span>
            <select className="h-9 px-2 py-1.5 border rounded text-sm"
              value={filtroCliente}
              onChange={(e) => { setFiltroCliente(e.target.value); setPage(1); }}
              className="border rounded px-2 h-9"
            >
              <option value="">Todos</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="text-gray-700">Tipo:</span>
            <select className="h-9 px-2 py-1.5 border rounded text-sm"
              value={filtroTipo}
              onChange={(e) => { setFiltroTipo(e.target.value); setPage(1); }}
              className="border rounded px-2 h-9"
            >
              <option value="">Todos</option>
              <option value="Job">Job</option>
              <option value="Aluguel">Aluguel</option>
            </select>
          </label>
        </div>

        {/* tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-sm">
              <tr className="bg-gray-100">
                <th className="text-left p-2">Data</th>
                <th className="text-left p-2">Tipo</th>
                <th className="text-left p-2">Cliente</th>
                <th className="text-left p-2">Descrição</th>
                <th className="text-right p-2">Total</th>
                <th className="text-right p-2">Desconto</th>
                <th className="text-right p-2">Final</th>
				<th className="p-2 text-right whitespace-nowrap min-w-[100px]">A Receber</th>
                <th className="p-2 text-center w-28">Status</th>
                <th className="p-2 text-center w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageSlice.map((s) => (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{fmtDateBR(s.data_contratacao)}</td>
                  <td className="p-2">{s.tipo_servico}</td>
                  <td className="p-2">
                    {clientes.find((c) => c.id === s.cliente_id)?.nome || "-"}
                  </td>
                  <td className="p-2">{s.descricao}</td>
                  <td className="p-2 text-right">{fmtBRL(s.valor_total)}</td>
                  <td className="p-2 text-right">{fmtBRL(s.valor_desconto)}</td>
                  <td className="p-2 text-right">{fmtBRL(s.valor_final)}</td>
				  <td className="p-2 text-right">{fmtBRL(s.valor_pendente_atual ?? 0)}</td>
                  <td className="p-2 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        s.status === "pendente"
                          ? "bg-red-100 text-red-700"
                          : s.status === "parcial"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {s.status?.charAt(0).toUpperCase() + s.status?.slice(1)}
                    </span>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center justify-center gap-2">
                      <IconButton
                        icon={Pencil}
                        color="blue"
                        onClick={() => abrirEdicao(s.id)}
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </IconButton>
                      <IconButton
                        icon={Trash2}
                        color="red"
                        onClick={() => deletarServico(s.id)}
                        title="Excluir"
                        variant="danger"
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
              {pageSlice.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-gray-500">
                    Nenhum serviço encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* paginação discreta nova */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 mt-3">
          {/* info */}
          <div className="text-xs text-gray-600">
            Mostrando{" "}
            <strong>{totalRecords === 0 ? 0 : (page - 1) * pageSize + 1}</strong> –{" "}
            <strong>{Math.min(page * pageSize, totalRecords)}</strong> de{" "}
            <strong>{totalRecords}</strong>
          </div>

          {/* controles */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2 py-1 text-sm rounded border disabled:opacity-50"
              title="Anterior"
            >
              Anterior
            </button>
            <div className="text-xs text-gray-700">
              Página <strong>{page}</strong> de <strong>{totalPages}</strong>
            </div>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2 py-1 text-sm rounded border disabled:opacity-50"
              title="Próxima"
            >
              Próxima
            </button>
          </div>

          {/* page size */}
          <div className="flex items-center gap-2 text-xs">
            <label className="text-gray-700">Registros por página</label>
            <input
              type="number"
              min={1}
              step={1}
              value={pageSize}
              onChange={(e) => {
                const v = Math.max(1, Number(e.target.value) || 10);
                setPageSize(v);
                setPage(1);
              }}
              className="w-16 h-8 border rounded px-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* MODAL DE EDIÇÃO */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Editar Serviço">
        {servicoEditando && (
          <div className="grid grid-cols-12 gap-3">
            {/* Data */}
            <label className="col-span-12 md:col-span-3 text-sm">
              <span className="block mb-1 font-medium">Data</span>
              <DateInput
                value={servicoEditando.data_contratacao || dataHoje}
                onChange={(d) =>
                  setServicoEditando({ ...servicoEditando, data_contratacao: d })
                }
                className="w-full h-10"
              />
            </label>

            {/* Tipo */}
            <label className="col-span-12 md:col-span-3 text-sm">
              <span className="block mb-1 font-medium">Tipo</span>
              <select
                value={servicoEditando.tipo_servico || "Job"}
                onChange={(e) =>
                  setServicoEditando({ ...servicoEditando, tipo_servico: e.target.value })
                }
                className="border p-2 rounded w-full h-10"
              >
                <option value="Job">Job</option>
                <option value="Aluguel">Aluguel</option>
              </select>
            </label>

            {/* Cliente */}
            <label className="col-span-12 md:col-span-4 text-sm">
              <span className="block mb-1 font-medium">Cliente</span>
              <select
                value={servicoEditando.cliente_id || ""}
                onChange={(e) =>
                  setServicoEditando({ ...servicoEditando, cliente_id: e.target.value })
                }
                className="border p-2 rounded w-full h-10"
              >
                <option value="">Selecione...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>

            {/* Nº de Diárias */}
            <label className="col-span-12 md:col-span-2 text-sm">
              <span className="block mb-1 font-medium">Nº de Diárias</span>
              <input
                type="number"
                min="1"
                value={servicoEditando.numero_diarias || 1}
                onChange={(e) =>
                  setServicoEditando({ ...servicoEditando, numero_diarias: e.target.value })
                }
                className="border p-2 rounded w-full h-10"
              />
            </label>

            {/* Descrição */}
            <label className="col-span-12 text-sm">
              <span className="block mb-1 font-medium">Descrição</span>
              <input
                type="text"
                value={servicoEditando.descricao || ""}
                onChange={(e) =>
                  setServicoEditando({ ...servicoEditando, descricao: e.target.value })
                }
                className="border p-2 rounded w-full h-10"
                placeholder="Ex: Job Coca-Cola SP"
              />
            </label>

            {/* Valor Diária Cachê */}
            {servicoEditando?.tipo_servico === "Job" && (
              <label className="col-span-12 md:col-span-3 text-sm">
                <span className="block mb-1 font-medium">Valor Diária Cachê</span>
                <CurrencyInput
                  value={Number(servicoEditando?.valor_diaria_cache) || 0}
                  onChange={(val) =>
                    setServicoEditando({ ...servicoEditando, valor_diaria_cache: val })
                  }
                  className="h-10 w-full"
                />
              </label>
            )}

            {/* Valor Diária Equipamentos */}
            <div className="col-span-12 md:col-span-5 md:col-start-4 text-sm">
              <CampoEquipamentos
                showLabel={true}
                valor={Number(servicoEditando?.valor_diaria_equipamentos) || 0}
                equipamentosIniciais={
                  servicoEditando?.is_pacote ? [] : (servicoEditando?.equipamentos || [])
                }
                pacoteInicial={!!servicoEditando?.is_pacote}
                onValorChange={(val) =>
                  setServicoEditando((prev) =>
                    Number(prev.valor_diaria_equipamentos) === Number(val)
                      ? prev
                      : { ...prev, valor_diaria_equipamentos: val }
                  )
                }
                onSelecionar={(lista) =>
                  setServicoEditando((prev) => {
                    const igual =
                      JSON.stringify(prev.equipamentos) === JSON.stringify(lista);
                    return igual ? prev : { ...prev, equipamentos: lista };
                  })
                }
                onPacoteChange={(checked) =>
                  setServicoEditando((prev) => ({
                    ...prev,
                    is_pacote: !!checked,
                    equipamentos: checked ? [] : prev.equipamentos,
                  }))
                }
              />
            </div>

            {/* Valor Total */}
            <label className="col-span-12 md:col-span-4 text-sm">
              <span className="block mb-1 font-medium">Valor Total</span>
              <input
                type="text"
                value={fmtBRL(
                  ((Number(servicoEditando?.valor_diaria_cache) || 0) +
                    (Number(servicoEditando?.valor_diaria_equipamentos) || 0)) *
                    (Number(servicoEditando?.numero_diarias) || 1)
                )}
                readOnly
                className="border p-2 rounded w-full bg-gray-100 h-10"
              />
            </label>

            {/* Desconto */}
            <label className="col-span-12 md:col-span-3 text-sm">
              <span className="block mb-1 font-medium">Desconto</span>
              <CurrencyInput
                value={Number(servicoEditando?.valor_desconto) || 0}
                onChange={(val) =>
                  setServicoEditando({ ...servicoEditando, valor_desconto: val })
                }
                className="h-10 w-full"
              />
            </label>

            {/* Valor Final */}
            <label className="col-span-12 md:col-span-5 text-sm">
              <span className="block mb-1 font-medium">Valor Final</span>
              <input
                type="text"
                value={fmtBRL(
                  (((Number(servicoEditando?.valor_diaria_cache) || 0) +
                    (Number(servicoEditando?.valor_diaria_equipamentos) || 0)) *
                    (Number(servicoEditando?.numero_diarias) || 1)) -
                    (Number(servicoEditando?.valor_desconto) || 0)
                )}
                readOnly
                className="border p-2 rounded w-full bg-gray-100 h-10"
              />
            </label>

            {/* Status */}
            <label className="col-span-12 md:col-span-4 text-sm">
              <span className="block mb-1 font-medium">Status</span>
              <select
                value={servicoEditando?.status || "pendente"}
                onChange={(e) =>
                  setServicoEditando({ ...servicoEditando, status: e.target.value })
                }
                className="border p-2 rounded w-full h-10"
              >
                <option value="pendente">Pendente</option>
                <option value="parcial">Parcial</option>
                <option value="pago">Pago</option>
              </select>
            </label>

            {/* Footer */}
            <div className="col-span-12 flex justify-end pt-1">
              <button
                onClick={salvarServico}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
