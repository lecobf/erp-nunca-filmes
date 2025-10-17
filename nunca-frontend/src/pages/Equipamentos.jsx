import { useEffect, useMemo, useState } from "react";
import { api } from "../api/config";
import { fmtBRL } from "../utils/formatters";
import Modal from "../components/Modal";
import CurrencyInput from "../components/CurrencyInput";
import IconButton from "../components/IconButton";
import { Pencil, Trash2 } from "lucide-react";

/** Opções fixas de categoria */
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

/**
 * Equipamentos
 * - Busca por nome (substring) + filtro por categoria
 * - Form: Nome, Categoria (combo fixa), Valor (diária), Quantidade
 * - Grid: Categoria, Nome, Valor (diária), Quantidade, Ações (sem ID)
 * - Modal de edição com os mesmos campos
 * - Paginação client-side (como na tela de Serviços)
 */
export default function Equipamentos() {
  const [equipamentos, setEquipamentos] = useState([]);

  // busca/filtros
  const [termo, setTermo] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");

  // form inclusão
  const [form, setForm] = useState({
    nome: "",
    categoria: "",
    valor_aluguel: 0,
    quantidade: 0,
  });

  // edição
  const [editando, setEditando] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // paginação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ---------- load ----------
  async function carregar() {
    const res = await api.get("/equipamentos");
    setEquipamentos(res.data || []);
  }

  useEffect(() => {
    carregar();
  }, []);

  // ---------- submit / crud ----------
  async function handleSubmit(e) {
    e.preventDefault();
    await api.post("/equipamentos", {
      nome: form.nome?.trim() || "",
      categoria: form.categoria || null, // vem da combo fixa
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

  // ---------- filtro (client-side) ----------
  const listaFiltrada = useMemo(() => {
    const t = termo.trim().toLowerCase();
    return (equipamentos || [])
      .filter((e) => {
        const byName = !t || (e.nome || "").toLowerCase().includes(t);
        const byCat =
          !filtroCategoria || (e.categoria || "") === filtroCategoria;
        return byName && byCat;
      })
      .sort((a, b) => {
        // ordena por categoria, depois nome
        const ca = (a.categoria || "").localeCompare(b.categoria || "");
        if (ca !== 0) return ca;
        return (a.nome || "").localeCompare(b.nome || "");
      });
  }, [equipamentos, termo, filtroCategoria]);

  // ---------- paginação (client-side) ----------
  const totalRecords = listaFiltrada.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / Math.max(1, pageSize)));

  useEffect(() => {
    setPage(1);
  }, [termo, filtroCategoria, pageSize]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return listaFiltrada.slice(start, start + pageSize);
  }, [listaFiltrada, page, pageSize]);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Equipamentos</h2>

      {/* FORM DE INCLUSÃO */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded shadow grid grid-cols-12 gap-x-2 gap-y-3 mb-4"
      >
        <label className="col-span-12 md:col-span-5 text-sm">
          <span className="mb-1 block font-medium">Nome</span>
          <input
            type="text"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="border p-2 rounded h-10 w-full"
            placeholder="Ex: Câmera, Tripé, Luz LED…"
            required
          />
        </label>

        <label className="col-span-12 md:col-span-3 text-sm">
          <span className="mb-1 block font-medium">Categoria</span>
          <select
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            className="border p-2 rounded h-10 w-full"
          >
            <option value="">Selecione...</option>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="col-span-6 md:col-span-2 text-sm">
          <span className="mb-1 block font-medium">Valor (diária)</span>
          <CurrencyInput
            value={form.valor_aluguel}
            onChange={(v) => setForm({ ...form, valor_aluguel: v })}
            className="h-10 w-full"
          />
        </label>

        <div className="col-span-6 md:col-span-2 text-sm">
          <span className="mb-1 block font-medium">Quantidade</span>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              step={1}
              value={form.quantidade}
              onChange={(e) =>
                setForm({ ...form, quantidade: Number(e.target.value) || 0 })
              }
              className="border p-2 rounded h-10 w-full"
              placeholder="0"
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

      {/* BUSCA + FILTRO CATEGORIA */}
      <div className="bg-white p-4 rounded shadow mb-3">
        <div className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-12 md:col-span-6">
            <label className="block text-sm">
              <span className="mb-1 block text-gray-700">Buscar por nome</span>
              <input
                type="text"
                placeholder="Buscar por nome do equipamento…"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                className="border p-2 rounded h-10 w-full"
              />
            </label>
          </div>

          <div className="col-span-12 md:col-span-4">
            <label className="block text-sm">
              <span className="mb-1 block text-gray-700">Categoria</span>
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="border p-2 rounded h-10 w-full"
              >
                <option value="">Todas</option>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="col-span-12 md:col-span-2 flex md:justify-end">
            <button
              type="button"
              onClick={() => {
                setTermo("");
                setFiltroCategoria("");
                setPage(1);
              }}
              className="border px-3 py-2 rounded text-sm"
              title="Limpar filtros"
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {/* sem ID */}
                <th className="p-2 text-left">Categoria</th>
                <th className="p-2 text-left">Nome</th>
                <th className="p-2 text-right">Valor (diária)</th>
                <th className="p-2 text-right">Quantidade</th>
                <th className="p-2 text-center w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageSlice.map((e) => (
                <tr key={e.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{e.categoria || "-"}</td>
                  <td className="p-2">{e.nome}</td>
                  <td className="p-2 text-right">{fmtBRL(Number(e.valor_aluguel) || 0)}</td>
                  <td className="p-2 text-right">{Number(e.quantidade) || 0}</td>
                  <td className="p-2">
                    <div className="flex items-center justify-center gap-2">
                      <IconButton
                        icon={Pencil}
                        color="blue"
                        onClick={() => {
                          setEditando({
                            ...e,
                            valor_aluguel: Number(e.valor_aluguel) || 0,
                            quantidade: Number(e.quantidade) || 0,
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
                        onClick={() => handleDelete(e.id)}
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
                    Nenhum equipamento encontrado.
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

      {/* MODAL EDIÇÃO */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Editar Equipamento"
      >
        {editando && (
          <div className="grid grid-cols-12 gap-3">
            <label className="col-span-12 md:col-span-6 text-sm">
              <span className="mb-1 block font-medium">Nome</span>
              <input
                type="text"
                value={editando.nome || ""}
                onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                className="border p-2 rounded h-10 w-full"
              />
            </label>

            <label className="col-span-12 md:col-span-6 text-sm">
              <span className="mb-1 block font-medium">Categoria</span>
              <select
                value={editando.categoria || ""}
                onChange={(e) => setEditando({ ...editando, categoria: e.target.value })}
                className="border p-2 rounded h-10 w-full"
              >
                <option value="">Selecione...</option>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="col-span-12 md:col-span-6 text-sm">
              <span className="mb-1 block font-medium">Valor (diária)</span>
              <CurrencyInput
                value={editando.valor_aluguel || 0}
                onChange={(v) => setEditando({ ...editando, valor_aluguel: v })}
                className="h-10 w-full"
              />
            </label>

            <label className="col-span-12 md:col-span-6 text-sm">
              <span className="mb-1 block font-medium">Quantidade</span>
              <input
                type="number"
                min={0}
                step={1}
                value={editando.quantidade ?? 0}
                onChange={(e) =>
                  setEditando({ ...editando, quantidade: Number(e.target.value) || 0 })
                }
                className="border p-2 rounded h-10 w-full"
              />
            </label>

            <div className="col-span-12 flex justify-end">
              <button
                onClick={handleSalvarEdicao}
                className="bg-blue-600 text-white px-4 py-2 rounded"
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
