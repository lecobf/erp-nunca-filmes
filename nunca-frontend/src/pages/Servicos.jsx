import { useEffect, useMemo, useState, useRef } from "react";
import { api } from "../api/config";
import Modal from "../components/Modal";
import CurrencyInput from "../components/CurrencyInput";
import DateInput from "../components/DateInput";
import { fmtBRL, fmtDateBR } from "../utils/formatters";
import { Pencil, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, X } from "lucide-react";
import IconButton from "../components/IconButton";
import SortTh from "../components/SortTh";
import { useSortTable } from "../hooks/useSortTable";
import CampoEquipamentos from "../components/servicos/CampoEquipamentos";
import { useNavigate, useSearchParams } from "react-router-dom";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function StatusBadge({ status }) {
  const map = { pendente: "badge-red", parcial: "badge-yellow", pago: "badge-green" };
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "—";
  return <span className={map[status] ?? "badge-gray"}>{label}</span>;
}

function DateChip({ date, onRemove }) {
  return (
    <span className="inline-flex items-center gap-0.5 pl-2 pr-1 py-0.5 bg-primary-50 border border-primary-200 rounded text-xs text-primary-700 font-medium whitespace-nowrap">
      {fmtDateBR(date)}
      <button type="button" tabIndex={-1}
        className="ml-0.5 text-primary-400 hover:text-primary-700 leading-none"
        onClick={() => onRemove(date)}>
        <X size={10} />
      </button>
    </span>
  );
}

const dataHoje = new Date().toISOString().split("T")[0];

const emptyForm = () => ({
  tipo_servico: "Job",
  cliente_id: "",
  descricao: "",
  datas: [dataHoje],
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

export default function Servicos() {
  const [servicos, setServicos] = useState([]);
  const [clientes, setClientes] = useState([]);

  const [filtroAno, setFiltroAno] = useState(String(new Date().getFullYear()));
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formData, setFormData] = useState(emptyForm());
  const [novaData, setNovaData] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [servicoEditando, setServicoEditando] = useState(null);
  const [novaDataEdit, setNovaDataEdit] = useState("");
  const [equipKey, setEquipKey] = useState(0);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const veioDoCalendario = searchParams.get("from") === "calendario";
  const calendarioAno = searchParams.get("ano");
  const calendarioMes = searchParams.get("mes");

  function voltarParaCalendarioSePreciso() {
    if (!veioDoCalendario) return false;
    const a = calendarioAno ? Number(calendarioAno) : new Date().getFullYear();
    const m = calendarioMes ? Number(calendarioMes) : (new Date().getMonth() + 1);
    navigate(`/calendario?ano=${a}&mes=${m}`);
    return true;
  }

  useEffect(() => { carregarServicos(); carregarClientes(); }, []);

  useEffect(() => {
    const dataParam = searchParams.get("data");
    if (dataParam) setFormData((prev) => ({ ...prev, datas: [dataParam] }));
  }, [searchParams]);

  const lastEditRef = useRef(null);
  useEffect(() => {
    const editParam = searchParams.get("edit");
    if (editParam) {
      const idNum = Number(editParam);
      if (Number.isFinite(idNum) && String(lastEditRef.current) !== String(idNum)) {
        lastEditRef.current = idNum;
        abrirEdicao(idNum);
      }
    }
  }, [searchParams]);

  // Recalcula totais sempre que mudar cachê, equipamentos, datas ou desconto
  useEffect(() => {
    const nDiarias = formData.datas.length || 1;
    const total = (Number(formData.valor_diaria_cache) + Number(formData.valor_diaria_equipamentos)) * nDiarias;
    setFormData((prev) => ({
      ...prev,
      valor_total: total,
      valor_final: Math.max(0, total - Number(prev.valor_desconto || 0)),
    }));
  }, [formData.valor_diaria_cache, formData.valor_diaria_equipamentos, formData.datas.length, formData.valor_desconto]);

  async function carregarServicos() {
    const resp = await api.get("/servicos");
    setServicos(resp.data || []);
  }

  async function carregarClientes() {
    const resp = await api.get("/clientes");
    setClientes(resp.data || []);
  }

  // ---------- helpers datas (form novo) ----------
  function adicionarDataForm(d) {
    if (!d) return;
    setFormData((prev) => {
      if (prev.datas.includes(d)) return prev;
      return { ...prev, datas: [...prev.datas, d].sort() };
    });
    setNovaData("");
  }

  function removerDataForm(d) {
    setFormData((prev) => ({ ...prev, datas: prev.datas.filter((x) => x !== d) }));
  }

  // ---------- helpers datas (modal edição) ----------
  function adicionarDataEdit(d) {
    if (!d) return;
    setServicoEditando((prev) => {
      const datas = prev.datas || [];
      if (datas.includes(d)) return prev;
      return { ...prev, datas: [...datas, d].sort() };
    });
    setNovaDataEdit("");
  }

  function removerDataEdit(d) {
    setServicoEditando((prev) => ({
      ...prev,
      datas: (prev.datas || []).filter((x) => x !== d),
    }));
  }

  // ---------- submit ----------
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const datas = formData.datas.sort();
      if (datas.length === 0) { alert("Adicione ao menos uma data de trabalho."); return; }
      if (!formData.cliente_id) { alert("Selecione um cliente."); return; }
      const nDiarias = datas.length;
      const vCache = Number(formData.valor_diaria_cache) || 0;
      const vEqp   = Number(formData.valor_diaria_equipamentos) || 0;
      const vDesc  = Number(formData.valor_desconto) || 0;
      const valor_total = (vCache + vEqp) * nDiarias;
      const valor_final = Math.max(0, valor_total - vDesc);
      const mappedEquipamentos = (formData.equipamentos || [])
        .map((e) => ({ equipamento_id: e.equipamento_id ?? e.id ?? e?.equipamento?.id, quantidade: Number(e.quantidade ?? e.qtd ?? 1) || 1 }))
        .filter((e) => e.equipamento_id != null);
      const payload = {
        tipo_servico: formData.tipo_servico,
        cliente_id: Number(formData.cliente_id),
        descricao: formData.descricao,
        datas,
        valor_diaria_cache: vCache,
        valor_diaria_equipamentos: vEqp,
        valor_desconto: vDesc,
        data_previsao_pagamento: formData.data_previsao_pagamento || null,
        status: formData.status || "pendente",
        is_pacote: !!formData.is_pacote,
        equipamentos: formData.is_pacote ? [] : mappedEquipamentos,
      };
      if (!payload.is_pacote && payload.equipamentos.length === 0) {
        alert("Selecione ao menos um equipamento ou marque 'É pacote'.");
        return;
      }
      await api.post("/servicos", payload);
      setFormData(emptyForm());
      setNovaData("");
      setEquipKey((k) => k + 1);
      await carregarServicos();
      if (voltarParaCalendarioSePreciso()) return;
    } catch (err) {
      const data = err?.response?.data;
      let msg = err?.message || "Erro desconhecido";
      if (data?.detail) {
        try { msg = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail, null, 2); }
        catch { msg = String(data.detail); }
      }
      alert(`Erro ao criar serviço:\n${msg}`);
    }
  }

  async function abrirEdicao(servicoId) {
    const resp = await api.get(`/servicos/${servicoId}`);
    const s = resp.data?.servico || resp.data;
    const datasNorm = (s.datas || []).map((d) =>
      typeof d === "string" ? d.slice(0, 10) : String(d).slice(0, 10)
    ).sort();
    setServicoEditando({
      ...s,
      datas: datasNorm,
      cliente_id: s.cliente_id?.toString?.() ?? "",
      valor_diaria_cache: s.valor_diaria_cache ?? 0,
      valor_diaria_equipamentos: s.valor_diaria_equipamentos ?? 0,
      valor_desconto: s.valor_desconto ?? 0,
      valor_total: s.valor_total ?? 0,
      valor_final: s.valor_final ?? 0,
      data_previsao_pagamento: s.data_previsao_pagamento?.split?.("T")?.[0] || null,
      equipamentos: Array.isArray(s.equipamentos) ? s.equipamentos : [],
      status: s.status || "pendente",
      is_pacote: !!s.is_pacote,
    });
    setModalOpen(true);
  }

  // Totais calculados dinamicamente para o modal de edição
  const totaisEdit = useMemo(() => {
    if (!servicoEditando) return { total: 0, final: 0 };
    const nDiarias = (servicoEditando.datas || []).length || 1;
    const total = (Number(servicoEditando.valor_diaria_cache) || 0 + Number(servicoEditando.valor_diaria_equipamentos) || 0) * nDiarias;
    return { total, final: Math.max(0, total - (Number(servicoEditando.valor_desconto) || 0)) };
  }, [servicoEditando?.valor_diaria_cache, servicoEditando?.valor_diaria_equipamentos, servicoEditando?.datas?.length, servicoEditando?.valor_desconto]);

  async function salvarServico() {
    if (!servicoEditando) return;
    try {
      const datas = (servicoEditando.datas || []).sort();
      if (datas.length === 0) { alert("Adicione ao menos uma data de trabalho."); return; }
      if (!servicoEditando.cliente_id) { alert("Selecione um cliente."); return; }
      const nDiarias = datas.length;
      const vCache = Number(servicoEditando.valor_diaria_cache) || 0;
      const vEqp   = Number(servicoEditando.valor_diaria_equipamentos) || 0;
      const vDesc  = Number(servicoEditando.valor_desconto) || 0;
      const mappedEquipamentos = (servicoEditando.equipamentos || [])
        .map((e) => ({ equipamento_id: e.equipamento_id ?? e.id ?? e?.equipamento?.id, quantidade: Number(e.quantidade ?? e.qtd ?? 1) || 1 }))
        .filter((e) => e.equipamento_id != null);
      await api.put(`/servicos/${servicoEditando.id}`, {
        tipo_servico: servicoEditando.tipo_servico,
        cliente_id: Number(servicoEditando.cliente_id),
        descricao: servicoEditando.descricao,
        datas,
        valor_diaria_cache: vCache,
        valor_diaria_equipamentos: vEqp,
        valor_desconto: vDesc,
        data_previsao_pagamento: servicoEditando.data_previsao_pagamento || null,
        status: servicoEditando.status,
        is_pacote: !!servicoEditando.is_pacote,
        equipamentos: servicoEditando.is_pacote ? [] : mappedEquipamentos,
      });
      setModalOpen(false);
      setServicoEditando(null);
      setNovaDataEdit("");
      await carregarServicos();
      if (voltarParaCalendarioSePreciso()) return;
    } catch (err) {
      const data = err?.response?.data;
      let msg = err?.message || "Erro desconhecido";
      if (data?.detail) {
        try { msg = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail, null, 2); }
        catch { msg = String(data.detail); }
      }
      alert(`Erro ao salvar serviço:\n${msg}`);
    }
  }

  async function deletarServico(id) {
    if (!window.confirm("Tem certeza que deseja excluir este serviço?")) return;
    await api.delete(`/servicos/${id}`);
    await carregarServicos();
    if (voltarParaCalendarioSePreciso()) return;
  }

  const servicosFiltrados = useMemo(() => {
    let lista = [...servicos];
    if (filtroAno) lista = lista.filter((s) => new Date(s.data_contratacao).getFullYear() === Number(filtroAno));
    if (filtroMes) lista = lista.filter((s) => new Date(s.data_contratacao).getMonth() + 1 === Number(filtroMes));
    if (filtroStatus) lista = lista.filter((s) => s.status === filtroStatus);
    if (filtroCliente) lista = lista.filter((s) => String(s.cliente_id) === String(filtroCliente));
    if (filtroTipo) lista = lista.filter((s) => s.tipo_servico === filtroTipo);
    return lista.sort((a, b) => new Date(b.data_contratacao) - new Date(a.data_contratacao));
  }, [servicos, filtroAno, filtroMes, filtroStatus, filtroCliente, filtroTipo]);

  const { sorted: servicosOrdenados, sortConfig, handleSort } = useSortTable(servicosFiltrados);

  const totalRecords = servicosOrdenados.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / Math.max(1, pageSize)));

  useEffect(() => { setPage((p) => Math.min(p, totalPages)); }, [totalPages]);

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return servicosOrdenados.slice(start, start + pageSize);
  }, [servicosOrdenados, page, pageSize]);

  const goTo = (p) => setPage(Math.max(1, Math.min(p, totalPages)));

  const totalBruto   = servicosFiltrados.reduce((s, r) => s + (r.valor_total || 0), 0);
  const totalFinal   = servicosFiltrados.reduce((s, r) => s + (r.valor_final || 0), 0);
  const totalReceber = servicosFiltrados.reduce((s, r) => s + (r.valor_pendente_atual || 0), 0);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Serviços</h1>
      </div>

      <div className="page-body space-y-4">
        {/* Formulário de inclusão */}
        <form onSubmit={handleSubmit} className="card p-4">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
            Novo serviço
          </p>
          <div className="grid grid-cols-12 gap-x-3 gap-y-3">

            {/* Linha 1: Tipo + Cliente + Descrição */}
            <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Tipo
              <select value={formData.tipo_servico} className="w-full"
                onChange={(e) => setFormData({ ...formData, tipo_servico: e.target.value })}>
                <option value="Job">Job</option>
                <option value="Aluguel">Aluguel</option>
              </select>
            </label>

            <label className="col-span-4 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Cliente
              <select value={formData.cliente_id} className="w-full"
                onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}>
                <option value="">Selecione…</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>

            <label className="col-span-6 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Descrição
              <input type="text" value={formData.descricao} placeholder="Ex: Job Coca-Cola SP" className="w-full"
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
            </label>

            {/* Linha 2: Datas de trabalho */}
            <div className="col-span-12 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Datas de Trabalho *
              <div className="flex flex-wrap items-center gap-1.5 min-h-[34px] border border-neutral-300 rounded px-2 py-1.5 bg-white">
                {formData.datas.map((d) => (
                  <DateChip key={d} date={d} onRemove={removerDataForm} />
                ))}
                <DateInput
                  value={novaData}
                  placeholder="+ adicionar data"
                  className="min-w-[130px] border-dashed text-neutral-400"
                  onChange={(d) => { if (d) adicionarDataForm(d); setNovaData(""); }}
                />
              </div>
              <span className="text-neutral-400">
                {formData.datas.length} {formData.datas.length === 1 ? "diária" : "diárias"}
              </span>
            </div>

            {/* Linha 3: Cachê (Job) + Equipamentos */}
            {formData.tipo_servico === "Job" && (
              <label className="col-span-3 flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Valor Diária Cachê
                <CurrencyInput value={formData.valor_diaria_cache}
                  onChange={(val) => setFormData({ ...formData, valor_diaria_cache: val })} />
              </label>
            )}

            <div className={`${formData.tipo_servico === "Job" ? "col-span-5" : "col-span-8"} flex flex-col gap-1 text-xs font-medium text-neutral-600`}>
              Valor Diária Equipamentos
              <CampoEquipamentos key={equipKey} showLabel={false}
                valor={Number(formData.valor_diaria_equipamentos) || 0}
                pacoteInicial={formData.is_pacote}
                onValorChange={(val) => setFormData((prev) => prev.valor_diaria_equipamentos === val ? prev : { ...prev, valor_diaria_equipamentos: val })}
                onSelecionar={(lista) => setFormData((prev) => JSON.stringify(prev.equipamentos) === JSON.stringify(lista) ? prev : { ...prev, equipamentos: lista })}
                onPacoteChange={(checked) => setFormData((prev) => ({ ...prev, is_pacote: !!checked, valor_diaria_equipamentos: checked ? prev.valor_diaria_equipamentos : 0, equipamentos: checked ? [] : prev.equipamentos }))}
              />
            </div>

            {/* Linha 4: Totais + Previsão + Salvar */}
            <label className="col-span-3 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Valor Total
              <input type="text" value={fmtBRL(formData.valor_total)} readOnly className="w-full bg-neutral-50" />
            </label>
            <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Desconto
              <CurrencyInput value={formData.valor_desconto}
                onChange={(val) => setFormData({ ...formData, valor_desconto: val })} />
            </label>
            <label className="col-span-3 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Valor Final
              <input type="text" value={fmtBRL(formData.valor_final)} readOnly className="w-full bg-neutral-50" />
            </label>
            <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Previsão Pgto
              <DateInput value={formData.data_previsao_pagamento || ""}
                onChange={(d) => setFormData((prev) => ({ ...prev, data_previsao_pagamento: d }))} />
            </label>
            <div className="col-span-2 flex items-end">
              <button type="submit" className="btn-primary w-full">
                <Plus size={14} />
                Salvar Serviço
              </button>
            </div>
          </div>
        </form>

        {/* Filtros */}
        <div className="filter-bar">
          <div className="filter-field">
            <span className="filter-label">Ano</span>
            <select className="filter-select" value={filtroAno} onChange={(e) => { setFiltroAno(e.target.value); setPage(1); }}>
              <option value="">Todos</option>
              {[2023, 2024, 2025, 2026].map((a) => <option key={a} value={String(a)}>{a}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <span className="filter-label">Mês</span>
            <select className="filter-select" value={filtroMes} onChange={(e) => { setFiltroMes(e.target.value); setPage(1); }}>
              <option value="">Todos</option>
              {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <span className="filter-label">Status</span>
            <select className="filter-select" value={filtroStatus} onChange={(e) => { setFiltroStatus(e.target.value); setPage(1); }}>
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="parcial">Parcial</option>
              <option value="pago">Pago</option>
            </select>
          </div>
          <div className="filter-field">
            <span className="filter-label">Cliente</span>
            <select className="filter-select w-40" value={filtroCliente} onChange={(e) => { setFiltroCliente(e.target.value); setPage(1); }}>
              <option value="">Todos</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <span className="filter-label">Tipo</span>
            <select className="filter-select" value={filtroTipo} onChange={(e) => { setFiltroTipo(e.target.value); setPage(1); }}>
              <option value="">Todos</option>
              <option value="Job">Job</option>
              <option value="Aluguel">Aluguel</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <SortTh field="data_contratacao" sortConfig={sortConfig} onSort={handleSort}>Data</SortTh>
                  <SortTh field="tipo_servico" sortConfig={sortConfig} onSort={handleSort}>Tipo</SortTh>
                  <th className="no-sort">Cliente</th>
                  <SortTh field="descricao" sortConfig={sortConfig} onSort={handleSort}>Descrição</SortTh>
                  <SortTh field="numero_diarias" sortConfig={sortConfig} onSort={handleSort} className="text-center">Diárias</SortTh>
                  <SortTh field="valor_total" sortConfig={sortConfig} onSort={handleSort} className="text-right">Total</SortTh>
                  <SortTh field="valor_desconto" sortConfig={sortConfig} onSort={handleSort} className="text-right">Desconto</SortTh>
                  <SortTh field="valor_final" sortConfig={sortConfig} onSort={handleSort} className="text-right">Final</SortTh>
                  <SortTh field="valor_pendente_atual" sortConfig={sortConfig} onSort={handleSort} className="text-right">A Receber</SortTh>
                  <SortTh field="data_ultimo_pagamento" sortConfig={sortConfig} onSort={handleSort} className="text-center">Dt. Pgto</SortTh>
                  <SortTh field="status" sortConfig={sortConfig} onSort={handleSort} className="text-center w-24">Status</SortTh>
                  <th className="no-sort text-center w-20">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pageSlice.map((s) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap">{fmtDateBR(s.data_contratacao)}</td>
                    <td>{s.tipo_servico}</td>
                    <td>{clientes.find((c) => c.id === s.cliente_id)?.nome || "—"}</td>
                    <td className="max-w-[200px] truncate">{s.descricao}</td>
                    <td className="text-center">{s.numero_diarias ?? (s.datas?.length ?? "—")}</td>
                    <td className="text-right">{fmtBRL(s.valor_total)}</td>
                    <td className="text-right">{fmtBRL(s.valor_desconto)}</td>
                    <td className="text-right font-medium">{fmtBRL(s.valor_final)}</td>
                    <td className="text-right text-amber-700 font-medium">{fmtBRL(s.valor_pendente_atual ?? 0)}</td>
                    <td className="text-center whitespace-nowrap">{s.data_ultimo_pagamento ? fmtDateBR(s.data_ultimo_pagamento) : "—"}</td>
                    <td className="text-center"><StatusBadge status={s.status} /></td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <IconButton icon={Pencil} color="blue" title="Editar" onClick={() => abrirEdicao(s.id)} />
                        <IconButton icon={Trash2} color="red" title="Excluir" onClick={() => deletarServico(s.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
                {pageSlice.length === 0 && (
                  <tr>
                    <td colSpan={12} className="text-center text-neutral-400 py-8 italic">
                      Nenhum serviço encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totalizadores */}
          <div className="totals-bar">
            <span className="total-item">
              <span className="total-label">Total Bruto:</span>
              <span className="total-value text-neutral-700">{fmtBRL(totalBruto)}</span>
            </span>
            <span className="total-item">
              <span className="total-label">Total Final:</span>
              <span className="total-value text-primary-700">{fmtBRL(totalFinal)}</span>
            </span>
            <span className="total-item">
              <span className="total-label">A Receber:</span>
              <span className="total-value text-amber-600">{fmtBRL(totalReceber)}</span>
            </span>
          </div>

          {/* Paginação */}
          <div className="pagination-bar">
            <span>
              Exibindo{" "}
              <strong className="text-neutral-700">{totalRecords === 0 ? 0 : (page - 1) * pageSize + 1}</strong>{" "}
              – <strong className="text-neutral-700">{Math.min(page * pageSize, totalRecords)}</strong>{" "}
              / <strong className="text-neutral-700">{totalRecords}</strong> registros
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                Exibir:
                <select className="page-size-select"
                  value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </span>
              <div className="flex items-center gap-0.5">
                <button className="page-btn" onClick={() => goTo(1)} disabled={page === 1}><ChevronsLeft size={13} /></button>
                <button className="page-btn" onClick={() => goTo(page - 1)} disabled={page === 1}><ChevronLeft size={13} /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => Math.abs(p - page) <= 2).map((p) => (
                  <button key={p} onClick={() => goTo(p)} className={p === page ? "page-btn-active" : "page-btn"}>{p}</button>
                ))}
                <button className="page-btn" onClick={() => goTo(page + 1)} disabled={page === totalPages}><ChevronRight size={13} /></button>
                <button className="page-btn" onClick={() => goTo(totalPages)} disabled={page === totalPages}><ChevronsRight size={13} /></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal edição */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setNovaDataEdit(""); }} title="Editar Serviço">
        {servicoEditando && (
          <div className="grid grid-cols-12 gap-3">

            {/* Tipo */}
            <label className="col-span-6 md:col-span-3 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Tipo
              <select value={servicoEditando.tipo_servico || "Job"} className="w-full"
                onChange={(e) => setServicoEditando({ ...servicoEditando, tipo_servico: e.target.value })}>
                <option value="Job">Job</option>
                <option value="Aluguel">Aluguel</option>
              </select>
            </label>

            {/* Cliente */}
            <label className="col-span-12 md:col-span-6 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Cliente
              <select value={servicoEditando.cliente_id || ""} className="w-full"
                onChange={(e) => setServicoEditando({ ...servicoEditando, cliente_id: e.target.value })}>
                <option value="">Selecione…</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>

            {/* Datas de trabalho */}
            <div className="col-span-12 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Datas de Trabalho *
              <div className="flex flex-wrap items-center gap-1.5 min-h-[34px] border border-neutral-300 rounded px-2 py-1.5 bg-white">
                {(servicoEditando.datas || []).map((d) => (
                  <DateChip key={d} date={d} onRemove={removerDataEdit} />
                ))}
                <DateInput
                  value={novaDataEdit}
                  placeholder="+ adicionar data"
                  className="min-w-[130px] border-dashed text-neutral-400"
                  onChange={(d) => { if (d) adicionarDataEdit(d); setNovaDataEdit(""); }}
                />
              </div>
              <span className="text-neutral-400">
                {(servicoEditando.datas || []).length} {(servicoEditando.datas || []).length === 1 ? "diária" : "diárias"}
              </span>
            </div>

            {/* Descrição */}
            <label className="col-span-12 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Descrição
              <input type="text" value={servicoEditando.descricao || ""} placeholder="Ex: Job Coca-Cola SP" className="w-full"
                onChange={(e) => setServicoEditando({ ...servicoEditando, descricao: e.target.value })} />
            </label>

            {/* Cachê */}
            {servicoEditando?.tipo_servico === "Job" && (
              <label className="col-span-12 md:col-span-3 flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Valor Diária Cachê
                <CurrencyInput value={Number(servicoEditando?.valor_diaria_cache) || 0} className="w-full"
                  onChange={(val) => setServicoEditando({ ...servicoEditando, valor_diaria_cache: val })} />
              </label>
            )}

            {/* Equipamentos */}
            <div className="col-span-12 md:col-span-5 md:col-start-4 text-sm">
              <CampoEquipamentos showLabel={true}
                valor={Number(servicoEditando?.valor_diaria_equipamentos) || 0}
                equipamentosIniciais={servicoEditando?.is_pacote ? [] : (servicoEditando?.equipamentos || [])}
                pacoteInicial={!!servicoEditando?.is_pacote}
                onValorChange={(val) => setServicoEditando((prev) => Number(prev.valor_diaria_equipamentos) === Number(val) ? prev : { ...prev, valor_diaria_equipamentos: val })}
                onSelecionar={(lista) => setServicoEditando((prev) => JSON.stringify(prev.equipamentos) === JSON.stringify(lista) ? prev : { ...prev, equipamentos: lista })}
                onPacoteChange={(checked) => setServicoEditando((prev) => ({ ...prev, is_pacote: !!checked, equipamentos: checked ? [] : prev.equipamentos }))}
              />
            </div>

            {/* Totais */}
            <label className="col-span-12 md:col-span-4 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Valor Total
              <input type="text" readOnly className="w-full bg-neutral-50"
                value={fmtBRL(((Number(servicoEditando?.valor_diaria_cache) || 0) + (Number(servicoEditando?.valor_diaria_equipamentos) || 0)) * ((servicoEditando?.datas?.length) || 1))} />
            </label>
            <label className="col-span-6 md:col-span-3 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Desconto
              <CurrencyInput value={Number(servicoEditando?.valor_desconto) || 0} className="w-full"
                onChange={(val) => setServicoEditando({ ...servicoEditando, valor_desconto: val })} />
            </label>
            <label className="col-span-6 md:col-span-5 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Valor Final
              <input type="text" readOnly className="w-full bg-neutral-50"
                value={fmtBRL(Math.max(0, ((Number(servicoEditando?.valor_diaria_cache) || 0) + (Number(servicoEditando?.valor_diaria_equipamentos) || 0)) * ((servicoEditando?.datas?.length) || 1) - (Number(servicoEditando?.valor_desconto) || 0)))} />
            </label>

            {/* Status */}
            <label className="col-span-12 md:col-span-4 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Status
              <select value={servicoEditando?.status || "pendente"} className="w-full"
                onChange={(e) => setServicoEditando({ ...servicoEditando, status: e.target.value })}>
                <option value="pendente">Pendente</option>
                <option value="parcial">Parcial</option>
                <option value="pago">Pago</option>
              </select>
            </label>

            <div className="col-span-12 flex justify-end pt-1">
              <button onClick={salvarServico} className="btn-primary">Salvar Alterações</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
