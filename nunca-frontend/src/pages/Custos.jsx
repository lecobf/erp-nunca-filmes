import { useEffect, useMemo, useState } from "react";
import { api } from "../api/config";
import { fmtBRL, fmtDateBR } from "../utils/formatters";
import CurrencyInput from "../components/CurrencyInput";
import DateInput from "../components/DateInput";
import Modal from "../components/Modal";
import IconButton from "../components/IconButton";
import SortTh from "../components/SortTh";
import { useSortTable } from "../hooks/useSortTable";
import { Pencil, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus } from "lucide-react";

export default function Custos() {
  const [custos, setCustos] = useState([]);
  const [servicosCombo, setServicosCombo] = useState([]);

  const [form, setForm] = useState({ servico_id: "", data: "", valor: 0, descricao: "" });
  const [filtroServicoId, setFiltroServicoId] = useState("");
  const [filtroDataIni, setFiltroDataIni] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [editando, setEditando] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const labelServico = (s) => `${s?.cliente_nome ?? "—"} - ${s?.descricao ?? ""}`;

  async function carregarServicosCombo() {
    const res = await api.get("/servicos/combo");
    setServicosCombo(res.data || []);
  }

  async function carregarCustos() {
    const res = await api.get("/custos");
    setCustos(res.data || []);
  }

  useEffect(() => { carregarServicosCombo(); carregarCustos(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    await api.post("/custos", {
      servico_id: form.servico_id ? Number(form.servico_id) : null,
      data: form.data || null,
      valor: Number(form.valor) || 0,
      descricao: form.descricao || "",
    });
    setForm({ servico_id: "", data: "", valor: 0, descricao: "" });
    await carregarCustos();
  }

  async function handleSalvarEdicao() {
    if (!editando) return;
    await api.put(`/custos/${editando.id}`, {
      servico_id: editando.servico_id,
      data: editando.data || null,
      valor: Number(editando.valor) || 0,
      descricao: editando.descricao || "",
    });
    setModalOpen(false);
    setEditando(null);
    await carregarCustos();
  }

  async function handleDelete(id) {
    if (!window.confirm("Deseja realmente excluir este custo?")) return;
    await api.delete(`/custos/${id}`);
    await carregarCustos();
  }

  const custosFiltrados = useMemo(() => {
    let lista = [...custos];
    if (filtroServicoId) lista = lista.filter((c) => String(c.servico_id) === String(filtroServicoId));
    if (filtroDataIni) lista = lista.filter((c) => new Date(c.data) >= new Date(filtroDataIni));
    if (filtroDataFim) lista = lista.filter((c) => new Date(c.data) <= new Date(filtroDataFim));
    return lista.sort((a, b) => new Date(b.data) - new Date(a.data));
  }, [custos, filtroServicoId, filtroDataIni, filtroDataFim]);

  const { sorted: custosOrdenados, sortConfig, handleSort } = useSortTable(custosFiltrados);

  const totalRecords = custosOrdenados.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / Math.max(1, pageSize)));
  useEffect(() => { setPage((p) => Math.min(p, totalPages)); }, [totalPages]);

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return custosOrdenados.slice(start, start + pageSize);
  }, [custosOrdenados, page, pageSize]);

  const goTo = (p) => setPage(Math.max(1, Math.min(p, totalPages)));

  const totalCustos = custosFiltrados.reduce((s, c) => s + (c.valor || 0), 0);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Custos</h1>
      </div>

      <div className="page-body space-y-4">
        {/* Formulário */}
        <form onSubmit={handleSubmit} className="card p-4">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
            Novo custo
          </p>
          <div className="grid grid-cols-12 gap-x-3 gap-y-3">
            <label className="col-span-12 md:col-span-5 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Serviço
              <select className="w-full" value={form.servico_id}
                onChange={(e) => setForm({ ...form, servico_id: e.target.value })}>
                <option value="">Selecione…</option>
                {servicosCombo.map((s) => (
                  <option key={s.id} value={s.id}>{labelServico(s)}</option>
                ))}
              </select>
            </label>
            <label className="col-span-12 md:col-span-3 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Data
              <DateInput value={form.data} className="w-full"
                onChange={(v) => setForm({ ...form, data: v })} />
            </label>
            <div className="col-span-12 md:col-span-4 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Valor
              <div className="flex gap-2">
                <CurrencyInput value={form.valor} className="w-full"
                  onChange={(v) => setForm({ ...form, valor: v })} />
                <button type="submit" className="btn-primary shrink-0">
                  <Plus size={14} />
                  Adicionar
                </button>
              </div>
            </div>
            <label className="col-span-12 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Descrição
              <input type="text" value={form.descricao} placeholder="Ex: Aluguel de van, alimentação…" className="w-full"
                onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </label>
          </div>
        </form>

        {/* Filtros */}
        <div className="filter-bar">
          <div className="filter-field">
            <span className="filter-label">Serviço</span>
            <select className="filter-select w-52" value={filtroServicoId}
              onChange={(e) => { setFiltroServicoId(e.target.value); setPage(1); }}>
              <option value="">Todos</option>
              {servicosCombo.map((s) => (
                <option key={s.id} value={s.id}>{labelServico(s)}</option>
              ))}
            </select>
          </div>
          <div className="filter-field">
            <span className="filter-label">Data Inicial</span>
            <DateInput value={filtroDataIni} className="filter-input"
              onChange={(v) => { setFiltroDataIni(v); setPage(1); }} />
          </div>
          <div className="filter-field">
            <span className="filter-label">Data Final</span>
            <DateInput value={filtroDataFim} className="filter-input"
              onChange={(v) => { setFiltroDataFim(v); setPage(1); }} />
          </div>
          <div className="filter-actions">
            <button type="button" className="btn-secondary"
              onClick={() => { setFiltroServicoId(""); setFiltroDataIni(""); setFiltroDataFim(""); setPage(1); }}>
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
                  <SortTh field="descricao" sortConfig={sortConfig} onSort={handleSort}>Descrição</SortTh>
                  <SortTh field="data" sortConfig={sortConfig} onSort={handleSort}>Data</SortTh>
                  <SortTh field="valor" sortConfig={sortConfig} onSort={handleSort} className="text-right">Valor</SortTh>
                  <th className="no-sort text-center w-20">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pageSlice.map((c) => (
                  <tr key={c.id}>
                    <td>{c.cliente_nome || "—"}</td>
                    <td className="max-w-[180px] truncate">{c.servico_descricao || "—"}</td>
                    <td>{c.descricao || "—"}</td>
                    <td className="whitespace-nowrap">{fmtDateBR(c.data)}</td>
                    <td className="text-right font-medium text-red-700">{fmtBRL(c.valor)}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <IconButton icon={Pencil} color="blue" title="Editar"
                          onClick={() => { setEditando(c); setModalOpen(true); }} />
                        <IconButton icon={Trash2} color="red" title="Excluir"
                          onClick={() => handleDelete(c.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
                {pageSlice.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-neutral-400 py-8 italic">
                      Nenhum custo encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totalizadores */}
          <div className="totals-bar">
            <span className="total-item">
              <span className="total-label">Total de Custos:</span>
              <span className="total-value text-red-700">{fmtBRL(totalCustos)}</span>
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Editar Custo">
        {editando && (
          <div className="grid grid-cols-12 gap-3">
            <label className="col-span-12 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Descrição
              <input type="text" value={editando.descricao || ""} className="w-full"
                onChange={(e) => setEditando({ ...editando, descricao: e.target.value })} />
            </label>
            <label className="col-span-12 md:col-span-6 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Data
              <DateInput value={editando.data || ""} className="w-full"
                onChange={(v) => setEditando({ ...editando, data: v })} />
            </label>
            <label className="col-span-12 md:col-span-6 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Valor
              <CurrencyInput value={editando.valor || 0} className="w-full"
                onChange={(v) => setEditando({ ...editando, valor: v })} />
            </label>
            <div className="col-span-12 flex justify-end">
              <button onClick={handleSalvarEdicao} className="btn-primary">Salvar</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
