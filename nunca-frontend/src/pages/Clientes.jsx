import { useEffect, useMemo, useState } from "react";
import { api } from "../api/config";
import Modal from "../components/Modal";
import IconButton from "../components/IconButton";
import SortTh from "../components/SortTh";
import { useSortTable } from "../hooks/useSortTable";
import { Pencil, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, UserPlus } from "lucide-react";
import { formatCpfCnpj, formatPhone } from "../utils/formatters";

const onlyDigits = (s) => (s || "").toString().replace(/\D+/g, "");

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [termo, setTermo] = useState("");
  const [form, setForm] = useState({ nome: "", cpf_cnpj: "", email: "", telefone: "" });
  const [editando, setEditando] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function carregarClientes(search = "") {
    try {
      const res = await api.get("/clientes", { params: search ? { search } : {} });
      setClientes(res.data || []);
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
    }
  }

  useEffect(() => { carregarClientes(); }, []);
  useEffect(() => { carregarClientes(termo.trim()); setPage(1); }, [termo]);

  async function handleSubmit(e) {
    e.preventDefault();
    await api.post("/clientes", {
      nome: form.nome?.trim() || "",
      cpf_cnpj: onlyDigits(form.cpf_cnpj),
      email: form.email?.trim() || "",
      telefone: onlyDigits(form.telefone),
    });
    setForm({ nome: "", cpf_cnpj: "", email: "", telefone: "" });
    await carregarClientes(termo.trim());
  }

  async function handleSalvarEdicao() {
    if (!editando?.id) return;
    await api.put(`/clientes/${editando.id}`, {
      nome: editando.nome?.trim() || "",
      cpf_cnpj: onlyDigits(editando.cpf_cnpj),
      email: editando.email?.trim() || "",
      telefone: onlyDigits(editando.telefone),
    });
    setModalOpen(false);
    setEditando(null);
    await carregarClientes(termo.trim());
  }

  async function handleDelete(id) {
    if (!window.confirm("Deseja realmente excluir este cliente?")) return;
    await api.delete(`/clientes/${id}`);
    await carregarClientes(termo.trim());
  }

  const { sorted, sortConfig, handleSort } = useSortTable(clientes);

  const totalRecords = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / Math.max(1, pageSize)));

  useEffect(() => { setPage((p) => Math.min(p, totalPages)); }, [totalPages]);

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const goTo = (p) => setPage(Math.max(1, Math.min(p, totalPages)));

  return (
    <>
      {/* Cabeçalho */}
      <div className="page-header">
        <h1 className="page-title">Clientes</h1>
      </div>

      <div className="page-body space-y-4">
        {/* Formulário de inclusão */}
        <form onSubmit={handleSubmit} className="card p-4">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
            Novo cliente
          </p>
          <div className="grid grid-cols-12 gap-x-3 gap-y-3">
            <label className="col-span-12 md:col-span-4 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Nome *
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="w-full"
                placeholder="Nome do cliente"
                required
              />
            </label>
            <label className="col-span-12 md:col-span-2 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              CPF / CNPJ
              <input
                type="text"
                value={form.cpf_cnpj}
                onChange={(e) => setForm({ ...form, cpf_cnpj: formatCpfCnpj(e.target.value) })}
                className="w-full"
                placeholder="000.000.000-00"
              />
            </label>
            <label className="col-span-12 md:col-span-3 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              E-mail
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full"
                placeholder="email@dominio.com"
              />
            </label>
            <div className="col-span-12 md:col-span-3 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Telefone
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: formatPhone(e.target.value) })}
                  className="w-full"
                  placeholder="(11) 99999-9999"
                />
                <button type="submit" className="btn-primary shrink-0">
                  <UserPlus size={14} />
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Filtro */}
        <div className="filter-bar">
          <div className="filter-field">
            <span className="filter-label">Buscar</span>
            <input
              type="text"
              placeholder="Nome, email ou telefone…"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              className="filter-input w-72"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <SortTh field="nome" sortConfig={sortConfig} onSort={handleSort}>Nome</SortTh>
                  <SortTh field="cpf_cnpj" sortConfig={sortConfig} onSort={handleSort}>CPF / CNPJ</SortTh>
                  <SortTh field="email" sortConfig={sortConfig} onSort={handleSort}>E-mail</SortTh>
                  <SortTh field="telefone" sortConfig={sortConfig} onSort={handleSort}>Telefone</SortTh>
                  <th className="no-sort w-20 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pageSlice.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.nome || "—"}</td>
                    <td>{formatCpfCnpj(c.cpf_cnpj || "")}</td>
                    <td>{c.email || "—"}</td>
                    <td>{formatPhone(c.telefone || "")}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <IconButton
                          icon={Pencil}
                          color="blue"
                          title="Editar"
                          onClick={() => {
                            setEditando({
                              ...c,
                              cpf_cnpj: formatCpfCnpj(c.cpf_cnpj || ""),
                              telefone: formatPhone(c.telefone || ""),
                            });
                            setModalOpen(true);
                          }}
                        />
                        <IconButton
                          icon={Trash2}
                          color="red"
                          title="Excluir"
                          onClick={() => handleDelete(c.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {pageSlice.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-neutral-400 py-8 italic">
                      Nenhum cliente encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="pagination-bar">
            <span>
              Exibindo{" "}
              <strong className="text-neutral-700">
                {totalRecords === 0 ? 0 : (page - 1) * pageSize + 1}
              </strong>{" "}
              –{" "}
              <strong className="text-neutral-700">
                {Math.min(page * pageSize, totalRecords)}
              </strong>{" "}
              / <strong className="text-neutral-700">{totalRecords}</strong> registros
            </span>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                Exibir:
                <select
                  className="page-size-select"
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                >
                  {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </span>
              <div className="flex items-center gap-0.5">
                <button className="page-btn" onClick={() => goTo(1)} disabled={page === 1}><ChevronsLeft size={13} /></button>
                <button className="page-btn" onClick={() => goTo(page - 1)} disabled={page === 1}><ChevronLeft size={13} /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => Math.abs(p - page) <= 2)
                  .map((p) => (
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Editar Cliente">
        {editando && (
          <div className="grid grid-cols-12 gap-3">
            <label className="col-span-12 md:col-span-6 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Nome
              <input type="text" value={editando.nome || ""} className="w-full"
                onChange={(e) => setEditando({ ...editando, nome: e.target.value })} />
            </label>
            <label className="col-span-12 md:col-span-6 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              CPF / CNPJ
              <input type="text" value={editando.cpf_cnpj || ""} placeholder="CPF/CNPJ" className="w-full"
                onChange={(e) => setEditando({ ...editando, cpf_cnpj: formatCpfCnpj(e.target.value) })} />
            </label>
            <label className="col-span-12 md:col-span-6 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              E-mail
              <input type="email" value={editando.email || ""} className="w-full"
                onChange={(e) => setEditando({ ...editando, email: e.target.value })} />
            </label>
            <label className="col-span-12 md:col-span-6 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Telefone
              <input type="text" value={editando.telefone || ""} placeholder="(11) 99999-9999" className="w-full"
                onChange={(e) => setEditando({ ...editando, telefone: formatPhone(e.target.value) })} />
            </label>
            <div className="col-span-12 flex justify-end pt-1">
              <button onClick={handleSalvarEdicao} className="btn-primary">Salvar</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
