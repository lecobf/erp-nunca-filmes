import { useEffect, useState } from "react";
import { api } from "../../api/config";
import Modal from "../Modal";
import CurrencyInput from "../CurrencyInput";
import DateInput from "../DateInput";
import { fmtBRL, fmtDateBR } from "../../utils/formatters";
import { X, Trash2, Printer } from "lucide-react";
import ModalEquipamentos from "../servicos/ModalEquipamentos";
import ModalOrcamento from "../servicos/ModalOrcamento";

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

const formVazio = (dataInicial) => ({
  tipo_servico: "Job",
  cliente_id: "",
  descricao: "",
  datas: dataInicial ? [dataInicial] : [],
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

/**
 * Modal de criar/editar/excluir serviço, usada só pela tela de Calendário —
 * não reaproveita nem altera a modal/formulário já existentes em Servicos.jsx.
 *
 * Props:
 *  - isOpen: boolean
 *  - servicoId: number|null   (null = modo criação)
 *  - dataInicial: string|null ("YYYY-MM-DD", usado só na criação)
 *  - onClose: () => void
 *  - onSalvo: () => void      (chamado após criar/editar/excluir com sucesso)
 */
export default function ModalServicoCalendario({ isOpen, servicoId, dataInicial, onClose, onSalvo }) {
  const modoEdicao = servicoId != null;

  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(formVazio(dataInicial));
  const [novaData, setNovaData] = useState("");
  const [modalEquipOpen, setModalEquipOpen] = useState(false);
  const [orcamentoAberto, setOrcamentoAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    api.get("/clientes").then((r) => setClientes(r.data || [])).catch(() => setClientes([]));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setNovaData("");
    if (modoEdicao) {
      setCarregando(true);
      api.get(`/servicos/${servicoId}`)
        .then((resp) => {
          const s = resp.data?.servico || resp.data;
          const datasNorm = (s.datas || [])
            .map((d) => (typeof d === "string" ? d.slice(0, 10) : String(d).slice(0, 10)))
            .sort();
          setForm({
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
        })
        .finally(() => setCarregando(false));
    } else {
      setForm(formVazio(dataInicial));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, servicoId, dataInicial]);

  // Recalcula totais sempre que mudar cachê, equipamentos, datas ou desconto
  useEffect(() => {
    const nDiarias = (form.datas || []).length || 1;
    const total = (Number(form.valor_diaria_cache) + Number(form.valor_diaria_equipamentos)) * nDiarias;
    setForm((prev) => ({
      ...prev,
      valor_total: total,
      valor_final: Math.max(0, total - Number(prev.valor_desconto || 0)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.valor_diaria_cache, form.valor_diaria_equipamentos, form.datas?.length, form.valor_desconto]);

  function adicionarData(d) {
    if (!d) return;
    setForm((prev) => {
      const datas = prev.datas || [];
      if (datas.includes(d)) return prev;
      return { ...prev, datas: [...datas, d].sort() };
    });
    setNovaData("");
  }

  function removerData(d) {
    setForm((prev) => ({ ...prev, datas: (prev.datas || []).filter((x) => x !== d) }));
  }

  function calcTotalEquip(lista) {
    return (lista || []).reduce((acc, e) => {
      const v = Number(e.valor_diaria ?? e.valor_aluguel ?? e.valor ?? 0) || 0;
      const q = Number(e.quantidade ?? e.qtd ?? 1) || 1;
      return acc + v * q;
    }, 0);
  }

  function handleConfirmarEquip(lista) {
    setForm((prev) => ({
      ...prev,
      equipamentos: lista || [],
      valor_diaria_equipamentos: prev.is_pacote ? prev.valor_diaria_equipamentos : calcTotalEquip(lista),
    }));
    setModalEquipOpen(false);
  }

  async function salvar() {
    try {
      const datas = (form.datas || []).sort();
      if (datas.length === 0) { alert("Adicione ao menos uma data de trabalho."); return; }
      if (!form.cliente_id) { alert("Selecione um cliente."); return; }
      const nDiarias = datas.length;
      const vCache = Number(form.valor_diaria_cache) || 0;
      const vEqp = Number(form.valor_diaria_equipamentos) || 0;
      const vDesc = Number(form.valor_desconto) || 0;
      const mappedEquipamentos = (form.equipamentos || [])
        .map((e) => ({
          equipamento_id: e.equipamento_id ?? e.id ?? e?.equipamento?.id,
          quantidade: Number(e.quantidade ?? e.qtd ?? 1) || 1,
        }))
        .filter((e) => e.equipamento_id != null);
      if (!form.is_pacote && mappedEquipamentos.length === 0) {
        alert("Selecione ao menos um equipamento ou marque 'É pacote'.");
        return;
      }
      const payload = {
        tipo_servico: form.tipo_servico,
        cliente_id: Number(form.cliente_id),
        descricao: form.descricao,
        datas,
        valor_diaria_cache: vCache,
        valor_diaria_equipamentos: vEqp,
        valor_desconto: vDesc,
        data_previsao_pagamento: form.data_previsao_pagamento || null,
        status: form.status || "pendente",
        is_pacote: !!form.is_pacote,
        equipamentos: form.is_pacote ? [] : mappedEquipamentos,
      };
      if (modoEdicao) {
        await api.put(`/servicos/${servicoId}`, payload);
      } else {
        await api.post("/servicos", payload);
      }
      onSalvo?.();
      onClose();
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

  async function excluir() {
    if (!servicoId) return;
    if (!window.confirm("Tem certeza que deseja excluir este serviço?")) return;
    try {
      await api.delete(`/servicos/${servicoId}`);
      onSalvo?.();
      onClose();
    } catch (err) {
      alert("Erro ao excluir serviço.");
    }
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={modoEdicao ? "Editar Serviço" : "Novo Serviço"}>
        {carregando ? (
          <div className="text-sm text-neutral-500 py-6 text-center">Carregando…</div>
        ) : (
          <div className="grid grid-cols-12 gap-3">
            <label className="col-span-6 md:col-span-3 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Tipo
              <select value={form.tipo_servico || "Job"} className="w-full"
                onChange={(e) => setForm({ ...form, tipo_servico: e.target.value })}>
                <option value="Job">Job</option>
                <option value="Aluguel">Aluguel</option>
              </select>
            </label>

            <label className="col-span-12 md:col-span-6 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Cliente
              <select value={form.cliente_id || ""} className="w-full"
                onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}>
                <option value="">Selecione…</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>

            <div className="col-span-12 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Datas de Trabalho *
              <div className="flex flex-wrap items-center gap-1.5 min-h-[34px] border border-neutral-300 rounded px-2 py-1.5 bg-white">
                {(form.datas || []).map((d) => (
                  <DateChip key={d} date={d} onRemove={removerData} />
                ))}
                <DateInput
                  value={novaData}
                  placeholder="+ adicionar data"
                  className="min-w-[130px] border-dashed text-neutral-400"
                  onChange={(d) => { if (d) adicionarData(d); setNovaData(""); }}
                />
              </div>
              <span className="text-neutral-400">
                {(form.datas || []).length} {(form.datas || []).length === 1 ? "diária" : "diárias"}
              </span>
            </div>

            <label className="col-span-12 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Descrição
              <input type="text" value={form.descricao || ""} placeholder="Ex: Job Coca-Cola SP" className="w-full"
                onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </label>

            {form.tipo_servico === "Job" && (
              <label className="col-span-12 md:col-span-3 flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Valor Diária Cachê
                <CurrencyInput value={Number(form.valor_diaria_cache) || 0} className="w-full"
                  onChange={(val) => setForm({ ...form, valor_diaria_cache: val })} />
              </label>
            )}

            <label className={`${form.tipo_servico === "Job" ? "col-span-5" : "col-span-8"} flex flex-col gap-1 text-xs font-medium text-neutral-600`}>
              Valor Diária Equipamentos
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <CurrencyInput
                    value={Number(form.valor_diaria_equipamentos) || 0}
                    readOnly={!form.is_pacote}
                    onChange={(val) => setForm((prev) => ({ ...prev, valor_diaria_equipamentos: val }))}
                    className="w-full pr-10"
                  />
                  <button type="button" disabled={form.is_pacote} onClick={() => setModalEquipOpen(true)}
                    title="Selecionar equipamentos"
                    className={`absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded ${form.is_pacote ? "bg-neutral-300 text-neutral-400 cursor-not-allowed" : "bg-primary-600 hover:bg-primary-700 text-white"}`}>
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="14" rx="2" /><path d="M7 8h10M7 12h10M7 16h6" />
                    </svg>
                  </button>
                </div>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer whitespace-nowrap border border-neutral-300 rounded px-2 text-neutral-600">
                  <input type="checkbox" checked={!!form.is_pacote}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForm((prev) => ({ ...prev, is_pacote: checked, valor_diaria_equipamentos: checked ? prev.valor_diaria_equipamentos : 0, equipamentos: checked ? [] : prev.equipamentos }));
                    }} />
                  Pacote
                </label>
              </div>
            </label>

            <label className="col-span-12 md:col-span-4 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Valor Total
              <input type="text" readOnly className="w-full bg-neutral-50" value={fmtBRL(form.valor_total)} />
            </label>
            <label className="col-span-6 md:col-span-3 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Desconto
              <CurrencyInput value={Number(form.valor_desconto) || 0} className="w-full"
                onChange={(val) => setForm({ ...form, valor_desconto: val })} />
            </label>
            <label className="col-span-6 md:col-span-5 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Valor Final
              <input type="text" readOnly className="w-full bg-neutral-50" value={fmtBRL(form.valor_final)} />
            </label>

            <label className="col-span-6 md:col-span-4 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Previsão Pgto
              <div className="flex items-center gap-1.5">
                <DateInput value={form.data_previsao_pagamento || ""}
                  onChange={(d) => setForm((prev) => ({ ...prev, data_previsao_pagamento: d }))} />
                <button
                  type="button"
                  onClick={() => setOrcamentoAberto(true)}
                  title="Visualizar Orçamento"
                  className="h-8 w-8 flex items-center justify-center rounded border border-neutral-300 text-neutral-500 hover:bg-neutral-100 hover:text-primary-600 transition-colors shrink-0"
                >
                  <Printer size={14} />
                </button>
              </div>
            </label>

            {modoEdicao && (
              <label className="col-span-6 md:col-span-4 flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Status
                <select value={form.status || "pendente"} className="w-full"
                  onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="pendente">Pendente</option>
                  <option value="parcial">Parcial</option>
                  <option value="pago">Pago</option>
                </select>
              </label>
            )}

            <div className="col-span-12 flex items-center justify-between pt-1">
              {modoEdicao ? (
                <button type="button" onClick={excluir}
                  className="btn-secondary text-red-600 hover:bg-red-50 flex items-center gap-1.5">
                  <Trash2 size={14} />
                  Excluir
                </button>
              ) : <span />}
              <button type="button" onClick={salvar} className="btn-primary">
                {modoEdicao ? "Salvar Alterações" : "Salvar Serviço"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {modalEquipOpen && (
        <ModalEquipamentos isOpen={modalEquipOpen} onClose={() => setModalEquipOpen(false)}
          onConfirm={handleConfirmarEquip} preSelecionados={form.equipamentos} />
      )}

      <ModalOrcamento
        isOpen={orcamentoAberto}
        onClose={() => setOrcamentoAberto(false)}
        formData={{ ...form, numero_diarias: (form.datas || []).length || 1 }}
        clientes={clientes}
      />
    </>
  );
}
