import { useEffect, useMemo, useState } from "react";
import { api } from "../api/config";
import { fmtBRL, fmtDateBR } from "../utils/formatters";
import Modal from "../components/Modal";
import CurrencyInput from "../components/CurrencyInput";
import DateInput from "../components/DateInput";
import { Pencil, Trash2 } from "lucide-react";
import IconButton from "../components/IconButton";

/**
 * Tela de Pagamentos — com combo "cliente - descricao",
 * filtros (serviço e intervalo de datas), grid completo e paginação.
 */
export default function Pagamentos() {
  const [pagamentos, setPagamentos] = useState([]);
  const [servicosCombo, setServicosCombo] = useState([]); // para form + filtro

  // form
  const [form, setForm] = useState({
    servico_id: "",
    data_pagamento: "",
    valor_pago: 0,
  });

  // edição
  const [editando, setEditando] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // filtros (backend suporta servico_id, data_inicio, data_fim)
  const [filtroServicoId, setFiltroServicoId] = useState("");
  const [filtroDataIni, setFiltroDataIni] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");

  // paginação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // helpers
  const labelServico = (s) =>
    `${s?.cliente_nome ?? "—"} - ${s?.descricao ?? ""}`;

  // ---------- Carregamento ----------
  async function carregarPagamentos() {
    const params = {};
    if (filtroServicoId) params.servico_id = filtroServicoId;
    if (filtroDataIni) params.data_inicio = filtroDataIni;
    if (filtroDataFim) params.data_fim = filtroDataFim;

    // backend lista pagamentos com cliente/serviço embutidos
    // (campos: cliente_nome, servico_descricao, servico_valor_pendente_atual etc.)
    const res = await api.get("/pagamentos", { params });
    setPagamentos(res.data || []);
  }

  async function carregarServicosCombo() {
    // endpoint dedicado à combo
    const res = await api.get("/servicos/combo");
    setServicosCombo(res.data || []);
  }

  useEffect(() => {
    carregarServicosCombo(); // carrega opções p/ form e filtro
  }, []);

  useEffect(() => {
    // recarrega sempre que mudar filtros
    carregarPagamentos();
    setPage(1); // reseta página ao filtrar
  }, [filtroServicoId, filtroDataIni, filtroDataFim]);

  // ---------- CRUD ----------
  async function handleSubmit(e) {
    e.preventDefault();
    // POST simples; backend retorna objeto já enriquecido
    await api.post("/pagamentos", {
      servico_id: form.servico_id ? Number(form.servico_id) : null,
      data_pagamento: form.data_pagamento,
      valor_pago: Number(form.valor_pago) || 0,
    });
    setForm({ servico_id: "", data_pagamento: "", valor_pago: 0 });
    await carregarPagamentos();
  }

  async function handleSalvarEdicao() {
    if (!editando) return;
    await api.put(`/pagamentos/${editando.id}`, {
      servico_id: editando.servico_id, // não muda aqui, mas mantém shape
      data_pagamento: editando.data_pagamento,
      valor_pago: Number(editando.valor_pago) || 0,
    });
    setModalOpen(false);
    setEditando(null);
    await carregarPagamentos();
  }

  async function handleDelete(id) {
    if (!window.confirm("Deseja realmente excluir este pagamento?")) return;
    await api.delete(`/pagamentos/${id}`);
    await carregarPagamentos();
  }

  // ---------- Paginação (client-side) ----------
  const totalRecords = pagamentos.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / Math.max(1, pageSize)));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return pagamentos.slice(start, start + pageSize);
  }, [pagamentos, page, pageSize]);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Pagamentos</h2>

      {/* FORM */}
     <form
  onSubmit={handleSubmit}
  className="bg-white p-4 rounded shadow grid grid-cols-12 gap-3 mb-6"
>
  {/* Serviço – col 1-4 */}
  <label className="col-span-12 md:col-span-4 text-sm">
    <span className="mb-1 font-medium block">Serviço</span>
    <select
      value={form.servico_id}
      onChange={(e) => setForm({ ...form, servico_id: e.target.value })}
      className="border p-2 rounded h-10 w-full"
    >
      <option value="">Selecione...</option>
      {servicosCombo.map((s) => (
        <option key={s.id} value={s.id}>
          {`${s.cliente_nome ?? "—"} - ${s.descricao ?? ""}`}
        </option>
      ))}
    </select>
  </label>

  {/* Data Pagamento – col 5-8 */}
  <label className="col-span-12 md:col-span-4 text-sm">
    <span className="mb-1 font-medium block">Data Pagamento</span>
    <DateInput
      value={form.data_pagamento}
      onChange={(v) => setForm({ ...form, data_pagamento: v })}
      className="h-10 w-full"
    />
  </label>

  {/* Valor Pago – col 9-11 (alinha com Data final) */}
  <label className="col-span-12 md:col-span-3 text-sm">
    <span className="mb-1 font-medium block">Valor Pago</span>
    <CurrencyInput
      value={form.valor_pago}
      onChange={(v) => setForm({ ...form, valor_pago: v })}
      className="h-10 w-full"
    />
  </label>

  {/* Adicionar – col 12 */}
  <div className="col-span-12 md:col-span-1 flex items-end justify-end">
    <button
      type="submit"
      className="bg-blue-600 text-white px-3 py-2 rounded text-sm w-full md:w-auto"
    >
      Adicionar
    </button>
  </div>
</form>


      {/* FILTROS TABELA */}
     <div className="bg-white p-4 rounded shadow mb-3">
  <div className="grid grid-cols-12 gap-3 items-end text-sm">
    {/* Filtrar por serviço – col 1-4 */}
    <label className="col-span-12 md:col-span-4">
      <span className="mb-1 text-gray-700 block">Filtrar por serviço</span>
      <select
        value={filtroServicoId}
        onChange={(e) => setFiltroServicoId(e.target.value)}
        className="border rounded px-2 h-9 w-full"
      >
        <option value="">Todos</option>
        {servicosCombo.map((s) => (
          <option key={s.id} value={s.id}>
            {`${s.cliente_nome ?? "—"} - ${s.descricao ?? ""}`}
          </option>
        ))}
      </select>
    </label>

    {/* Data inicial – col 5-8 */}
    <label className="col-span-12 md:col-span-4">
      <span className="mb-1 text-gray-700 block">Data inicial</span>
      <DateInput
        value={filtroDataIni}
        onChange={setFiltroDataIni}
        className="h-9 w-full"
      />
    </label>

    {/* Data final – col 9-11 (alinha com Valor Pago) */}
    <label className="col-span-12 md:col-span-3">
      <span className="mb-1 text-gray-700 block">Data final</span>
      <DateInput
        value={filtroDataFim}
        onChange={setFiltroDataFim}
        className="h-9 w-full"
      />
    </label>

    {/* Limpar – col 12 */}
    <div className="col-span-12 md:col-span-1 flex md:justify-end">
      <button
        type="button"
        onClick={() => {
          setFiltroServicoId("");
          setFiltroDataIni("");
          setFiltroDataFim("");
          setPage(1);
        }}
        className="border px-3 py-2 rounded text-sm w-full md:w-auto"
        title="Limpar filtros"
      >
        Limpar
      </button>
    </div>
  </div>
</div>


      {/* TABELA */}
      <div className="bg-white shadow rounded">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {/* sem ID */}
                <th className="p-2 text-left">Cliente</th>
                <th className="p-2 text-left">Serviço</th>
                <th className="p-2 text-left">Data de pagamento</th>
                <th className="p-2 text-right">Valor pago</th>
                <th className="p-2 text-right">Valor a receber</th>
                <th className="p-2 text-center w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageSlice.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{p.cliente_nome || "-"}</td>
                  <td className="p-2">
                    {p.servico_descricao || "-"}
                  </td>
                  <td className="p-2">{fmtDateBR(p.data_pagamento)}</td>
                  <td className="p-2 text-right">{fmtBRL(p.valor_pago)}</td>
                  <td className="p-2 text-right">
                    {fmtBRL(p.valor_pendente ?? 0)}
                  </td>
                  <td className="p-2">
                    <div className="flex items-center justify-center gap-2">
                      <IconButton
                        icon={Pencil}
                        color="blue"
                        onClick={() => {
                          setEditando(p);
                          setModalOpen(true);
                        }}
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </IconButton>
                      <IconButton
                        icon={Trash2}
                        color="red"
                        onClick={() => handleDelete(p.id)}
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
                    Nenhum pagamento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* paginação discreta */}
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
        title="Editar Pagamento"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Valor Pago</span>
            <CurrencyInput
              value={editando?.valor_pago || 0}
              onChange={(v) => setEditando({ ...editando, valor_pago: v })}
              className="h-10 w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Data Pagamento</span>
            <DateInput
              value={editando?.data_pagamento || ""}
              onChange={(v) => setEditando({ ...editando, data_pagamento: v })}
              className="h-10 w-full"
            />
          </label>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={handleSalvarEdicao}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Salvar
          </button>
        </div>
      </Modal>
    </div>
  );
}
