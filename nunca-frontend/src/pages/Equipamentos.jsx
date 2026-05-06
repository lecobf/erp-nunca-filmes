import { useEffect, useMemo, useState } from "react";
import { api } from "../api/config";
import { fmtBRL } from "../utils/formatters";
import Modal from "../components/Modal";
import CurrencyInput from "../components/CurrencyInput";
import IconButton from "../components/IconButton";
import SortTh from "../components/SortTh";
import { useSortTable } from "../hooks/useSortTable";
import { Pencil, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus } from "lucide-react";

const CATEGORIAS = [
  "Câmeras",
  "Lentes",
  "Filtros, Adaptadores e Acessórios de Camera",
  "Monitoramento/Transmissão/Comunicação",
  "Luz",
  "Audio",
  "Live/Eventos",
  "Estabilizadores/Suporte",
  "Elétrica/Maquinário/Acessórios",
  "Baterias",
];

export default function Equipamentos() {
  const [equipamentos, setEquipamentos] = useState([]);
  const [termo, setTermo] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [form, setForm] = useState({ nome: "", categoria: "", valor_aluguel: 0, quantidade: 0 });
  const [editando, setEditando] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function carregar() {
    const res = await api.get("/equipamentos");
    setEquipamentos(res.data || []);
  }

  useEffect(() => { carregar(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    await api.post("/equipamentos", {
      nome: form.nome?.trim() || "",
      categoria: form.categoria || null,
      valor_aluguel: Number(form.valor_aluguel) || 0,
      quantidade: Number(form.quantidade) || 0,
    });
    setForm({ nome: "", categoria: "", valor_aluguel: 0, quantidade: 0 });
    await carregar();
  }

  async function handleSalvarEdicao() {
    if (!editando?.id) return;
    await api.put(`/equipamentos/${editando.id}`, {
      nome: editando.nome?.trim() || "",
      categoria: editando.categoria || null,
      valor_aluguel: Number(editando.valor_aluguel) || 0,
      quantidade: Number(editando.quantidade) || 0,
    });
    setModalOpen(false);
    setEditando(null);
    await carregar();
  }

  async function handleDelete(id) {
    if (!window.confirm("Deseja realmente excluir este equipamento?")) return;
    await api.delete(`/equipamentos/${id}`);
    await carregar();
  }

  const listaFiltrada = useMemo(() => {
    const t = termo.trim().toLowerCase();
    return (equipamentos || [])
      .filter((e) => {
        const byName = !t || (e.nome || "").toLowerCase().includes(t);
        const byCat = !filtroCategoria || (e.categoria || "") === filtroCategoria;
        return byName && byCat;
      })
      .sort((a, b) => {
        const ca = (a.categoria || "").localeCompare(b.categoria || "");
        return ca !== 0 ? ca : (a.nome || "").localeCompare(b.nome || "");
      });
  }, [equipamentos, termo, filtroCategoria]);

  const { sorted: listaOrdenada, sortConfig, handleSort } = useSortTable(listaFiltrada);

  const totalRecords = listaOrdenada.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / Math.max(1, pageSize)));

  useEffect(() => { setPage(1); }, [termo, filtroCategoria, pageSize]);
  useEffect(() => { setPage((p) => Math.min(p, totalPages)); }, [totalPages]);

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return listaOrdenada.slice(start, start + pageSize);
  }, [listaOrdenada, page, pageSize]);

  const goTo = (p) => setPage(Math.max(1, Math.min(p, totalPages)));

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Equipamentos</h1>
      </div>

      <div className="page-body space-y-4">
        {/* Formulário */}
        <form onSubmit={handleSubmit} className="card p-4">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
            Novo equipamento
          </p>
          <div className="grid grid-cols-12 gap-x-3 gap-y-3">
            <label className="col-span-12 md:col-span-5 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Nome *
              <input type="text" value={form.nome} placeholder="Ex: Câmera Sony FX3…" required className="w-full"
                onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </label>
            <label className="col-span-12 md:col-span-3 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Categoria
              <select value={form.categoria} className="w-full"
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                <option value="">Selecione…</option>
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="col-span-6 md:col-span-2 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Valor (diária)
              <CurrencyInput value={form.valor_aluguel} className="w-full"
                onChange={(v) => setForm({ ...form, valor_aluguel: v })} />
            </label>
            <div className="col-span-6 md:col-span-2 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Quantidade
              <div className="flex gap-2">
                <input type="number" min={0} step={1} value={form.quantidade} placeholder="0" className="w-full"
                  onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) || 0 })} />
                <button type="submit" className="btn-primary shrink-0">
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Filtros */}
        <div className="filter-bar">
          <div className="filter-field">
            <span className="filter-label">Buscar</span>
            <input type="text" placeholder="Nome do equipamento…" value={termo} className="filter-input w-52"
              onChange={(e) => setTermo(e.target.value)} />
          </div>
          <div className="filter-field">
            <span className="filter-label">Categoria</span>
            <select className="filter-select w-48" value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}>
              <option value="">Todas</option>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="filter-actions">
            <button type="button" className="btn-secondary"
              onClick={() => { setTermo(""); setFiltroCategoria(""); setPage(1); }}>
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
                  <SortTh field="categoria" sortConfig={sortConfig} onSort={handleSort}>Categoria</SortTh>
                  <SortTh field="nome" sortConfig={sortConfig} onSort={handleSort}>Nome</SortTh>
                  <SortTh field="valor_aluguel" sortConfig={sortConfig} onSort={handleSort} className="text-right">Valor Diária</SortTh>
                  <SortTh field="quantidade" sortConfig={sortConfig} onSort={handleSort} className="text-right">Quantidade</SortTh>
                  <th className="no-sort text-center w-20">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pageSlice.map((e) => (
                  <tr key={e.id}>
                    <td className="text-neutral-500">{e.categoria || "—"}</td>
                    <td className="font-medium">{e.nome}</td>
                    <td className="text-right">{fmtBRL(Number(e.valor_aluguel) || 0)}</td>
                    <td className="text-right">{Number(e.quantidade) || 0}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <IconButton icon={Pencil} color="blue" title="Editar"
                          onClick={() => { setEditando({ ...e, valor_aluguel: Number(e.valor_aluguel) || 0, quantidade: Number(e.quantidade) || 0 }); setModalOpen(true); }} />
                        <IconButton icon={Trash2} color="red" title="Excluir"
                          onClick={() => handleDelete(e.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
                {pageSlice.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-neutral-400 py-8 italic">
                      Nenhum equipamento encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Editar Equipamento">
        {editando && (
          <div className="grid grid-cols-12 gap-3">
            <label className="col-span-12 md:col-span-6 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Nome
              <input type="text" value={editando.nome || ""} className="w-full"
                onChange={(e) => setEditando({ ...editando, nome: e.target.value })} />
            </label>
            <label className="col-span-12 md:col-span-6 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Categoria
              <select value={editando.categoria || ""} className="w-full"
                onChange={(e) => setEditando({ ...editando, categoria: e.target.value })}>
                <option value="">Selecione…</option>
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="col-span-12 md:col-span-6 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Valor (diária)
              <CurrencyInput value={editando.valor_aluguel || 0} className="w-full"
                onChange={(v) => setEditando({ ...editando, valor_aluguel: v })} />
            </label>
            <label className="col-span-12 md:col-span-6 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Quantidade
              <input type="number" min={0} step={1} value={editando.quantidade ?? 0} className="w-full"
                onChange={(e) => setEditando({ ...editando, quantidade: Number(e.target.value) || 0 })} />
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
