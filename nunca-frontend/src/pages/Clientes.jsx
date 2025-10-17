import { useEffect, useMemo, useState } from "react";
import { api } from "../api/config";
import Modal from "../components/Modal";
import IconButton from "../components/IconButton";
import { Pencil, Trash2 } from "lucide-react";
import { formatCpfCnpj, formatPhone } from "../utils/formatters";

// Helper local: remove tudo que não for dígito
const onlyDigits = (s) => (s || "").toString().replace(/\D+/g, "");

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [termo, setTermo] = useState("");

  // formulário de inclusão
  const [form, setForm] = useState({
    nome: "",
    cpf_cnpj: "",
    email: "",
    telefone: "",
  });

  // edição
  const [editando, setEditando] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // paginação (client-side)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ---------- carregamento ----------
  async function carregarClientes(search = "") {
    try {
      const res = await api.get("/clientes", {
        params: search ? { search } : {},
      });
      setClientes(res.data || []);
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
    }
  }

  useEffect(() => {
    carregarClientes();
  }, []);

  // busca no backend quando o termo muda
  useEffect(() => {
    carregarClientes(termo.trim());
    setPage(1);
  }, [termo]);

  // ---------- submit / crud ----------
  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      nome: form.nome?.trim() || "",
      cpf_cnpj: onlyDigits(form.cpf_cnpj), // strip para salvar limpo
      email: form.email?.trim() || "",
      telefone: onlyDigits(form.telefone), // strip para salvar limpo
    };
    await api.post("/clientes", payload);
    setForm({ nome: "", cpf_cnpj: "", email: "", telefone: "" });
    await carregarClientes(termo.trim());
  }

  async function handleSalvarEdicao() {
    if (!editando?.id) return;
    const payload = {
      nome: editando.nome?.trim() || "",
      cpf_cnpj: onlyDigits(editando.cpf_cnpj), // strip
      email: editando.email?.trim() || "",
      telefone: onlyDigits(editando.telefone), // strip
    };
    await api.put(`/clientes/${editando.id}`, payload);
    setModalOpen(false);
    setEditando(null);
    await carregarClientes(termo.trim());
  }

  async function handleDelete(id) {
    if (!window.confirm("Deseja realmente excluir este cliente?")) return;
    await api.delete(`/clientes/${id}`);
    await carregarClientes(termo.trim());
  }

  // ---------- paginação ----------
  const totalRecords = clientes.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / Math.max(1, pageSize)));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return clientes.slice(start, start + pageSize);
  }, [clientes, page, pageSize]);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Clientes</h2>

      {/* FORM DE INCLUSÃO */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded shadow grid grid-cols-12 gap-x-2 gap-y-3 mb-4"
      >
        <label className="col-span-12 md:col-span-4 text-sm">
          <span className="mb-1 block font-medium">Nome</span>
          <input
            type="text"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="border rounded p-2 h-10 w-full"
            placeholder="Nome do cliente"
            required
          />
        </label>

        {/* ↓ Reduzi para 2 colunas para abrir espaço ao telefone */}
        <label className="col-span-12 md:col-span-2 text-sm">
          <span className="mb-1 block font-medium">CPF/CNPJ</span>
          <input
            type="text"
            value={form.cpf_cnpj}
            onChange={(e) =>
              setForm({ ...form, cpf_cnpj: formatCpfCnpj(e.target.value) })
            }
            className="border rounded p-2 h-10 w-full"
            placeholder="CPF/CNPJ"
          />
        </label>

        <label className="col-span-12 md:col-span-3 text-sm">
          <span className="mb-1 block font-medium">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="border rounded p-2 h-10 w-full"
            placeholder="email@dominio.com"
          />
        </label>

        {/* ↑ Aumentei para 3 colunas para o telefone caber junto do botão */}
        <div className="col-span-12 md:col-span-3 text-sm">
          <span className="mb-1 block font-medium">Telefone</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.telefone}
              onChange={(e) =>
                setForm({ ...form, telefone: formatPhone(e.target.value) })
              }
              className="border rounded p-2 h-10 w-full"
              placeholder="(11) 99999-9999"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-3 py-2 rounded text-sm shrink-0"
            >
              Adicionar
            </button>
          </div>
        </div>
      </form>

      {/* BUSCA */}
      <div className="bg-white p-4 rounded shadow mb-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar por nome, email ou telefone…"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            className="border p-2 rounded h-10 w-full md:w-96"
          />
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {/* sem ID */}
                <th className="p-2 text-left">Nome</th>
                <th className="p-2 text-left">CPF/CNPJ</th>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Telefone</th>
                <th className="p-2 text-center w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageSlice.map((c) => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{c.nome || "-"}</td>
                  <td className="p-2">{formatCpfCnpj(c.cpf_cnpj || "")}</td>
                  <td className="p-2">{c.email || "-"}</td>
                  <td className="p-2">{formatPhone(c.telefone || "")}</td>
                  <td className="p-2">
                    <div className="flex items-center justify-center gap-2">
                      <IconButton
                        icon={Pencil}
                        color="blue"
                        onClick={() => {
                          // aplica máscara antes de abrir para já exibir no input
                          setEditando({
                            ...c,
                            cpf_cnpj: formatCpfCnpj(c.cpf_cnpj || ""),
                            telefone: formatPhone(c.telefone || ""),
                          });
                          setModalOpen(true);
                        }}
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </IconButton>
                      <IconButton
                        icon={Trash2}
                        color="red"
                        onClick={() => handleDelete(c.id)}
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
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* paginação */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 p-3">
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
              Página <strong>{page}</strong> de{" "}
              <strong>{Math.max(1, Math.ceil(totalRecords / Math.max(1, pageSize)))}</strong>
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
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Editar Cliente"
      >
        {editando && (
          <div className="grid grid-cols-12 gap-3">
            <label className="col-span-12 md:col-span-6 text-sm">
              <span className="mb-1 block font-medium">Nome</span>
              <input
                type="text"
                value={editando.nome || ""}
                onChange={(e) =>
                  setEditando({ ...editando, nome: e.target.value })
                }
                className="border rounded p-2 h-10 w-full"
              />
            </label>

            <label className="col-span-12 md:col-span-6 text-sm">
              <span className="mb-1 block font-medium">CPF/CNPJ</span>
              <input
                type="text"
                value={editando.cpf_cnpj || ""}
                onChange={(e) =>
                  setEditando({
                    ...editando,
                    cpf_cnpj: formatCpfCnpj(e.target.value),
                  })
                }
                className="border rounded p-2 h-10 w-full"
                placeholder="CPF/CNPJ"
              />
            </label>

            <label className="col-span-12 md:col-span-6 text-sm">
              <span className="mb-1 block font-medium">Email</span>
              <input
                type="email"
                value={editando.email || ""}
                onChange={(e) =>
                  setEditando({ ...editando, email: e.target.value })
                }
                className="border rounded p-2 h-10 w-full"
              />
            </label>

            <label className="col-span-12 md:col-span-6 text-sm">
              <span className="mb-1 block font-medium">Telefone</span>
              <input
                type="text"
                value={editando.telefone || ""}
                onChange={(e) =>
                  setEditando({
                    ...editando,
                    telefone: formatPhone(e.target.value),
                  })
                }
                className="border rounded p-2 h-10 w-full"
                placeholder="(11) 99999-9999"
              />
            </label>

            <div className="col-span-12 flex justify-end">
              <button
                onClick={handleSalvarEdicao}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Salvar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
