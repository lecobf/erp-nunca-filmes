import { useEffect, useMemo, useState } from "react";
import { api } from "../api/config";
import { fmtBRL, fmtDateBR } from "../utils/formatters";
import CurrencyInput from "../components/CurrencyInput";
import DateInput from "../components/DateInput";
import Modal from "../components/Modal";
import IconButton from "../components/IconButton";
import { Pencil, Trash2 } from "lucide-react";

/**
 * Custos
 * - Form: serviço (combo "cliente - descrição"), data, valor, descrição
 * - Filtros: serviço + intervalo de datas (compara com a data do custo)
 * - Grid: Cliente, Serviço, Descrição, Data, Valor (sem ID) + ações
 * - Paginação: igual à tela de Serviços
 */
export default function Custos() {
  const [custos, setCustos] = useState([]);
  const [servicosCombo, setServicosCombo] = useState([]);

  // form
  const [form, setForm] = useState({
    servico_id: "",
    data: "",
    valor: 0,
    descricao: "",
  });

  // filtros
  const [filtroServicoId, setFiltroServicoId] = useState("");
  const [filtroDataIni, setFiltroDataIni] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");

  // edição
  const [editando, setEditando] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // paginação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const labelServico = (s) => `${s?.cliente_nome ?? "—"} - ${s?.descricao ?? ""}`;

  // --------- load ---------
  async function carregarServicosCombo() {
    // GET /servicos/combo  →  [{ id, cliente_nome, descricao }]
    const res = await api.get("/servicos/combo");
    setServicosCombo(res.data || []);
  }

  async function carregarCustos() {
    // GET /custos → já traz cliente_nome e servico_descricao
    const res = await api.get("/custos");
    setCustos(res.data || []);
  }

  useEffect(() => {
    carregarServicosCombo();
    carregarCustos();
  }, []);

  // --------- submit / crud ---------
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

  // --------- filtros (client-side) ---------
  const custosFiltrados = useMemo(() => {
    let lista = [...custos];

    if (filtroServicoId) {
      lista = lista.filter((c) => String(c.servico_id) === String(filtroServicoId));
    }

    if (filtroDataIni) {
      const di = new Date(filtroDataIni);
      lista = lista.filter((c) => new Date(c.data) >= di);
    }
    if (filtroDataFim) {
      const df = new Date(filtroDataFim);
      lista = lista.filter((c) => new Date(c.data) <= df);
    }

    // Ordena por data desc pra ficar consistente
    return lista.sort((a, b) => new Date(b.data) - new Date(a.data));
  }, [custos, filtroServicoId, filtroDataIni, filtroDataFim]);

  // --------- paginação (client-side) ---------
  const totalRecords = custosFiltrados.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / Math.max(1, pageSize)));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return custosFiltrados.slice(start, start + pageSize);
  }, [custosFiltrados, page, pageSize]);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Custos</h2>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded shadow grid grid-cols-12 gap-x-2 gap-y-3 mb-6"
      >
        {/* Serviço (combo "cliente - descrição") */}
        <label className="col-span-12 md:col-span-5 text-sm">
          <span className="mb-1 font-medium block">Serviço</span>
          <select
            value={form.servico_id}
            onChange={(e) => setForm({ ...form, servico_id: e.target.value })}
            className="border p-2 rounded h-10 w-full"
          >
            <option value="">Selecione...</option>
            {servicosCombo.map((s) => (
              <option key={s.id} value={s.id}>
                {labelServico(s)}
              </option>
            ))}
          </select>
        </label>

        {/* Data */}
        <label className="col-span-12 md:col-span-3 text-sm">
          <span className="mb-1 font-medium block">Data</span>
          <DateInput
            value={form.data}
            onChange={(v) => setForm({ ...form, data: v })}
            className="h-10 w-full"
          />
        </label>

        {/* Valor + botão Adicionar */}
        <div className="col-span-12 md:col-span-4 text-sm">
          <span className="mb-1 font-medium block">Valor</span>
          <div className="flex gap-2">
            <CurrencyInput
              value={form.valor}
              onChange={(v) => setForm({ ...form, valor: v })}
              className="h-10 w-full"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-3 py-2 rounded text-sm shrink-0"
            >
              Adicionar
            </button>
          </div>
        </div>

        {/* Descrição (linha inteira) */}
        <label className="col-span-12 text-sm">
          <span className="mb-1 font-medium block">Descrição</span>
          <input
            type="text"
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            className="border p-2 rounded h-10 w-full"
            placeholder="Ex: Aluguel de van, alimentação, etc."
          />
        </label>
      </form>

      {/* FILTROS (iguais aos Pagamentos) */}
      <div className="bg-white p-4 rounded shadow mb-3">
        <div className="grid grid-cols-12 gap-x-2 gap-y-3 items-end text-sm">
          {/* Filtrar por serviço */}
          <label className="col-span-12 md:col-span-5">
            <span className="mb-1 text-gray-700 block">Filtrar por serviço</span>
            <select
              value={filtroServicoId}
              onChange={(e) => {
                setFiltroServicoId(e.target.value);
                setPage(1);
              }}
              className="border rounded px-2 h-9 w-full"
            >
              <option value="">Todos</option>
              {servicosCombo.map((s) => (
                <option key={s.id} value={s.id}>
                  {labelServico(s)}
                </option>
              ))}
            </select>
          </label>

          {/* Data inicial */}
          <label className="col-span-12 md:col-span-3">
            <span className="mb-1 text-gray-700 block">Data inicial</span>
            <DateInput
              value={filtroDataIni}
              onChange={(v) => {
                setFiltroDataIni(v);
                setPage(1);
              }}
              className="h-9 w-full"
            />
          </label>

          {/* Data final + limpar */}
          <div className="col-span-12 md:col-span-4">
            <span className="mb-1 text-gray-700 block">Data final</span>
            <div className="flex gap-2">
              <DateInput
                value={filtroDataFim}
                onChange={(v) => {
                  setFiltroDataFim(v);
                  setPage(1);
                }}
                className="h-9 w-full"
              />
              <button
                type="button"
                onClick={() => {
                  setFiltroServicoId("");
                  setFiltroDataIni("");
                  setFiltroDataFim("");
                  setPage(1);
                }}
                className="border px-3 py-2 rounded text-sm shrink-0"
                title="Limpar filtros"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-white shadow rounded">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Cliente</th>
                <th className="p-2 text-left">Serviço</th>
                <th className="p-2 text-left">Descrição</th>
                <th className="p-2 text-left">Data</th>
                <th className="p-2 text-right">Valor</th>
                <th className="p-2 text-center w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageSlice.map((c) => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{c.cliente_nome || "-"}</td>
                  <td className="p-2">{c.servico_descricao || "-"}</td>
                  <td className="p-2">{c.descricao || "-"}</td>
                  <td className="p-2">{fmtDateBR(c.data)}</td>
                  <td className="p-2 text-right">{fmtBRL(c.valor)}</td>
                  <td className="p-2">
                    <div className="flex items-center justify-center gap-2">
                      <IconButton
                        icon={Pencil}
                        color="blue"
                        onClick={() => {
                          setEditando(c);
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
                  <td colSpan={6} className="p-6 text-center text-gray-500">
                    Nenhum custo encontrado.
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
        title="Editar Custo"
      >
        {editando && (
          <div className="grid grid-cols-12 gap-3">
            <label className="col-span-12 text-sm">
              <span className="mb-1 font-medium block">Descrição</span>
              <input
                type="text"
                value={editando.descricao || ""}
                onChange={(e) => setEditando({ ...editando, descricao: e.target.value })}
                className="border p-2 rounded h-10 w-full"
              />
            </label>
            <label className="col-span-12 md:col-span-6 text-sm">
              <span className="mb-1 font-medium block">Data</span>
              <DateInput
                value={editando.data || ""}
                onChange={(v) => setEditando({ ...editando, data: v })}
                className="h-10 w-full"
              />
            </label>
            <label className="col-span-12 md:col-span-6 text-sm">
              <span className="mb-1 font-medium block">Valor</span>
              <CurrencyInput
                value={editando.valor || 0}
                onChange={(v) => setEditando({ ...editando, valor: v })}
                className="h-10 w-full"
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
