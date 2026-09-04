import { useEffect, useMemo, useState, useRef } from "react";
import { api } from "../api/config";
import { fmtBRL, fmtDateBR } from "../utils/formatters";
import { Pencil, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus } from "lucide-react";
import IconButton from "../components/IconButton";
import SortTh from "../components/SortTh";
import { useSortTable } from "../hooks/useSortTable";
import ModalServicoCalendario from "../components/calendario/ModalServicoCalendario";
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

  // Controla o modal único de criar/editar
  const [modalAberto, setModalAberto] = useState(false);
  const [servicoModalId, setServicoModalId] = useState(null); // null = criação
  const [dataInicial, setDataInicial] = useState(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const veioDoCalendario = searchParams.get("from") === "calendario";
  const calendarioAno = searchParams.get("ano");
  const calendarioMes = searchParams.get("mes");

  useEffect(() => { carregarServicos(); carregarClientes(); }, []);

  // Abre modal de criação com data pré-preenchida quando vem do Calendário via ?data=
  useEffect(() => {
    const dataParam = searchParams.get("data");
    if (dataParam) {
      setDataInicial(dataParam);
      setServicoModalId(null);
      setModalAberto(true);
    }
  }, [searchParams]);

  // Abre modal de edição quando a URL tem ?edit=ID
  const lastEditRef = useRef(null);
  useEffect(() => {
    const editParam = searchParams.get("edit");
    if (editParam) {
      const idNum = Number(editParam);
      if (Number.isFinite(idNum) && String(lastEditRef.current) !== String(idNum)) {
        lastEditRef.current = idNum;
        setServicoModalId(idNum);
        setModalAberto(true);
      }
    }
  }, [searchParams]);

  async function carregarServicos() {
    const resp = await api.get("/servicos");
    setServicos(resp.data || []);
  }

  async function carregarClientes() {
    const resp = await api.get("/clientes");
    setClientes(resp.data || []);
  }

  function abrirCriar() {
    setServicoModalId(null);
    setDataInicial(new Date().toISOString().split("T")[0]); // pré-preenche com hoje
    setModalAberto(true);
  }

  function abrirEdicao(id) {
    setServicoModalId(id);
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setDataInicial(null);
  }

  // Chamado após criar, editar ou excluir com sucesso
  function handleSalvo() {
    carregarServicos();
    if (veioDoCalendario) {
      const a = calendarioAno ? Number(calendarioAno) : new Date().getFullYear();
      const m = calendarioMes ? Number(calendarioMes) : (new Date().getMonth() + 1);
      navigate(`/calendario?ano=${a}&mes=${m}`);
    }
  }

  async function deletarServico(id) {
    if (!window.confirm("Tem certeza que deseja excluir este serviço?")) return;
    await api.delete(`/servicos/${id}`);
    await carregarServicos();
    if (veioDoCalendario) {
      const a = calendarioAno ? Number(calendarioAno) : new Date().getFullYear();
      const m = calendarioMes ? Number(calendarioMes) : (new Date().getMonth() + 1);
      navigate(`/calendario?ano=${a}&mes=${m}`);
    }
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

        {/* Filtros + botão Novo Serviço */}
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

          {/* Botão Novo Serviço — fica no final da barra de filtros */}
          <button onClick={abrirCriar} className="btn-primary ml-auto flex items-center gap-1.5 whitespace-nowrap">
            <Plus size={14} />
            Novo Serviço
          </button>
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

      {/* Modal único de criar/editar — mesmo componente do Calendário */}
      <ModalServicoCalendario
        isOpen={modalAberto}
        servicoId={servicoModalId}
        dataInicial={dataInicial}
        onClose={fecharModal}
        onSalvo={handleSalvo}
      />
    </>
  );
}
