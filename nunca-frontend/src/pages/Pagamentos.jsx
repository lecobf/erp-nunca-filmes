import { useEffect, useMemo, useState } from "react";
import { api } from "../api/config";
import { fmtBRL, fmtDateBR } from "../utils/formatters";
import Modal from "../components/Modal";
import CurrencyInput from "../components/CurrencyInput";
import DateInput from "../components/DateInput";
import { Pencil, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus } from "lucide-react";
import IconButton from "../components/IconButton";
import SortTh from "../components/SortTh";
import { useSortTable } from "../hooks/useSortTable";

export default function Pagamentos() {
  const [pagamentos, setPagamentos] = useState([]);
  const [servicosComboFiltro, setServicosComboFiltro] = useState([]);
  const [servicosComboForm, setServicosComboForm] = useState([]);

  const [form, setForm] = useState({ servico_id: "", data_pagamento: "", valor_pago: 0 });
  const [editando, setEditando] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [filtroClienteId, setFiltroClienteId] = useState("");
  const [filtroDataIni, setFiltroDataIni] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [clientesComPagamentos, setClientesComPagamentos] = useState([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function carregarClientesComPagamentos() {
    const res = await api.get("/clientes/com-pagamentos");
    setClientesComPagamentos(res.data || []);
  }

  async function carregarPagamentos() {
    const params = {};
    if (filtroClienteId) params.cliente_id = filtroClienteId;
    if (filtroDataIni) params.data_inicio = filtroDataIni;
    if (filtroDataFim) params.data_fim = filtroDataFim;
    const res = await api.get("/pagamentos", { params });
    setPagamentos(res.data || []);
  }

  async function carregarServicosComboFiltro() {
    const res = await api.get("/servicos/combo");
    setServicosComboFiltro(res.data || []);
  }

  async function carregarServicosComboForm() {
    const res = await api.get("/servicos/combo", { params: { pendentes: true } });
    setServicosComboForm(res.data || []);
  }

  useEffect(() => {
    carregarServicosComboFiltro();
    carregarServicosComboForm();
    carregarClientesComPagamentos();
  }, []);

  useEffect(() => { carregarPagamentos(); setPage(1); }, [filtroClienteId, filtroDataIni, filtroDataFim]);

  async function handleSubmit(e) {
    e.preventDefault();
    await api.post("/pagamentos", {
      servico_id: form.servico_id ? Number(form.servico_id) : null,
      data_pagamento: form.data_pagamento,
      valor_pago: Number(form.valor_pago) || 0,
    });
    setForm({ servico_id: "", data_pagamento: "", valor_pago: 0 });
    await carregarPagamentos();
    await carregarServicosComboForm();
  }

  async function handleSalvarEdicao() {
    if (!editando) return;
    await api.put(`/pagamentos/${editando.id}`, {
      servico_id: editando.servico_id,
      data_pagamento: editando.data_pagamento,
      valor_pago: Number(editando.valor_pago) || 0,
    });
    setModalOpen(false);
    setEditando(null);
    await carregarPagamentos();
    await carregarServicosComboForm();
  }

  async function handleDelete(id) {
    if (!window.confirm("Deseja realmente excluir este pagamento?")) return;
    await api.delete(`/pagamentos/${id}`);
    await carregarPagamentos();
    await carregarServicosComboForm();
  }

  const { sorted: pagamentosOrdenados, sortConfig, handleSort } = useSortTable(pagamentos);

  const totalRecords = pagamentosOrdenados.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / Math.max(1, pageSize)));
  useEffect(() => { setPage((p) => Math.min(p, totalPages)); }, [totalPages]);

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return pagamentosOrdenados.slice(start, start + pageSize);
  }, [pagamentosOrdenados, page, pageSize]);

  const goTo = (p) => setPage(Math.max(1, Math.min(p, totalPages)));

  const totalPago    = pagamentos.reduce((s, p) => s + (p.valor_pago || 0), 0);
  const totalPendente = pagamentos.reduce((s, p) => s + (p.valor_pendente || 0), 0);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Pagamentos</h1>
      </div>

      <div className="page-body space-y-4">
        {/* Formulário */}
        <form onSubmit={handleSubmit} className="card p-4">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
            Registrar pagamento
          </p>
          <div className="grid grid-cols-12 gap-x-3 gap-y-3">
            <label className="col-span-12 md:col-span-5 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Serviço
              <select className="w-full" value={form.servico_id}
                onChange={(e) => setForm({ ...form, servico_id: e.target.value })}>
                <option value="">Selecione…</option>
                {servicosComboForm.map((s) => {
                  const nome = (s.cliente_nome || "").split(" ")[0] || "";
                  const desc = (s.descricao || "").replace(/\s+/g, "_").slice(0, 20);
                  const valor = s.valor_final ? `$${Number(s.valor_final).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : "";
                  let texto = `${nome}-${desc}_${valor}`;
                  if (texto.length > 50) texto = texto.slice(0, 50) + "…";
                  return <option key={s.id} value={s.id}>{texto}</option>;
                })}
              </select>
            </label>
            <label className="col-span-12 md:col-span-3 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Data do Pagamento
              <DateInput value={form.data_pagamento} className="w-full"
                onChange={(v) => setForm({ ...form, data_pagamento: v })} />
            </label>
            <label className="col-span-12 md:col-span-3 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Valor Pago
              <CurrencyInput value={form.valor_pago} className="w-full"
                onChange={(v) => setForm({ ...form, valor_pago: v })} />
            </label>
            <div className="col-span-12 md:col-span-1 flex items-end">
              <button type="submit" className="btn-primary w-full">
                <Plus size={14} />
                Adicionar
              </button>
            </div>
          </div>
        </form>

        {/* Filtros */}
        <div className="filter-bar">
          <div className="filter-field">
            <span className="filter-label">Cliente</span>
            <select className="filter-select w-44" value={filtroClienteId}
              onChange={(e) => setFiltroClienteId(e.target.value)}>
              <option value="">Todos</option>
              {clientesComPagamentos.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div className="filter-field">
            <span className="filter-label">Data Inicial</span>
            <DateInput value={filtroDataIni} onChange={setFiltroDataIni} className="filter-input" />
          </div>
          <div className="filter-field">
            <span className="filter-label">Data Final</span>
            <DateInput value={filtroDataFim} onChange={setFiltroDataFim} className="filter-input" />
          </div>
          <div className="filter-actions">
            <button type="button" className="btn-secondary"
              onClick={() => { setFiltroClienteId(""); setFiltroDataIni(""); setFiltroDataFim(""); setPage(1); }}>
              Limpar
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <SortTh field="cliente_nome" sortConfig={sortConfig} onSort={handleSort}>Cliente</SortTh>
                  <SortTh field="servico_descricao" sortConfig={sortConfig} onSort={handleSort}>Serviço</SortTh>
                  <SortTh field="data_pagamento" sortConfig={sortConfig} onSort={handleSort}>Data do Pagamento</SortTh>
                  <SortTh field="valor_pago" sortConfig={sortConfig} onSort={handleSort} className="text-right">Valor Pago</SortTh>
                  <SortTh field="valor_pendente" sortConfig={sortConfig} onSort={handleSort} className="text-right">A Receber</SortTh>
                  <th className="no-sort text-center w-20">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pageSlice.map((p) => (
                  <tr key={p.id}>
                    <td>{p.cliente_nome || "—"}</td>
                    <td className="max-w-[200px] truncate">{p.servico_descricao || "—"}</td>
                    <td className="whitespace-nowrap">{fmtDateBR(p.data_pagamento)}</td>
                    <td className="text-right font-medium text-emerald-700">{fmtBRL(p.valor_pago)}</td>
                    <td className="text-right text-amber-700">{fmtBRL(p.valor_pendente ?? 0)}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <IconButton icon={Pencil} color="blue" title="Editar"
                          onClick={() => { setEditando(p); setModalOpen(true); }} />
                        <IconButton icon={Trash2} color="red" title="Excluir"
                          onClick={() => handleDelete(p.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
                {pageSlice.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-neutral-400 py-8 italic">
                      Nenhum pagamento encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totalizadores */}
          <div className="totals-bar">
            <span className="total-item">
              <span className="total-label">Total Pago:</span>
              <span className="total-value text-emerald-700">{fmtBRL(totalPago)}</span>
            </span>
            <span className="total-item">
              <span className="total-label">Total a Receber:</span>
              <span className="total-value text-amber-600">{fmtBRL(totalPendente)}</span>
            </span>
          </div>

          {/* Paginação */}
          <div className="pagination-bar">
            <span>
              Exibindo <strong className="text-neutral-700">{totalRecords === 0 ? 0 : (page - 1) * pageSize + 1}</strong>{" "}
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Editar Pagamento">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Valor Pago
            <CurrencyInput value={editando?.valor_pago || 0} className="w-full"
              onChange={(v) => setEditando({ ...editando, valor_pago: v })} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Data Pagamento
            <DateInput value={editando?.data_pagamento || ""} className="w-full"
              onChange={(v) => setEditando({ ...editando, data_pagamento: v })} />
          </label>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={handleSalvarEdicao} className="btn-primary">Salvar</button>
        </div>
      </Modal>
    </>
  );
}
