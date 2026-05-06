import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/config";
import { fmtBRL } from "../../utils/formatters";
import { Search } from "lucide-react";

/**
 * ModalEquipamentos
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - onConfirm: (listaSelecionada: Equipamento[]) => void
 *  - preSelecionados: (Array<number|Equipamento>)  // aceita IDs ou objetos
 *
 * Equipamento esperado em `lista` (API /equipamentos):
 *  { id, nome, valor_diaria? | valor_aluguel? | valor?, quantidade? }
 */
export default function ModalEquipamentos({
  isOpen,
  onClose,
  onConfirm,
  preSelecionados = null,
}) {
  const [lista, setLista] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [quantidades, setQuantidades] = useState(new Map());
  const [busca, setBusca] = useState("");

  const getQuantidadeInicial = (it) =>
    Number(it.quantidade ?? it.qtd ?? it.estoque ?? 1) || 1;

  // Normaliza qualquer entrada em um ID
  const toId = (e) =>
    typeof e === "number"
      ? e
      : e?.id ?? e?.equipamento_id ?? e?.equipamento?.id ?? null;

  // Carrega a lista quando abre e inicializa quantidades
  useEffect(() => {
    if (!isOpen) { setBusca(""); return; }
    (async () => {
      try {
        const res = await api.get("/equipamentos");
        const listaApi = res.data || [];
        setLista(listaApi);

        const q = new Map();
        listaApi.forEach((it) => q.set(it.id, getQuantidadeInicial(it)));
        setQuantidades(q);
      } catch (err) {
        console.error("Erro ao carregar equipamentos:", err);
        setLista([]);
        setQuantidades(new Map());
      }
    })();
  }, [isOpen]);

  // Quando abre (ou muda a prop), aplica pré-seleção + quantidade
  useEffect(() => {
    if (!isOpen) return;
    if (!preSelecionados) return; // evita resetar seleção à toa

    const ids = new Set();
    const nextQ = new Map(quantidades); // preserva quantidades já definidas

    (preSelecionados || []).forEach((e) => {
      const id = toId(e);
      if (id === null || id === undefined) return;

      ids.add(id);

      // Se vier quantidade do pai, usa; senão mantém a que já temos ou o default 1
      const qIni =
        typeof e === "object" && e
          ? Number(e.quantidade ?? e.qtd ?? e.estoque ?? 1) || 1
          : nextQ.get(id) ?? 1;

      nextQ.set(id, qIni);
    });

    setSelectedIds(ids);
    setQuantidades(nextQ);
  }, [isOpen, preSelecionados]); // dependências estáveis

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const listaFiltrada = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return lista;
    return lista.filter((it) =>
      (it.nome || "").toLowerCase().includes(t) ||
      (it.categoria || "").toLowerCase().includes(t)
    );
  }, [lista, busca]);

  // Total considera valor × quantidade
  const totalSelecionado = useMemo(() => {
    return (lista || []).reduce((acc, it) => {
      if (!selectedIds.has(it.id)) return acc;
      const v =
        Number(it.valor_diaria ?? it.valor_aluguel ?? it.valor ?? 0) || 0;
      const q = Number(quantidades.get(it.id) ?? getQuantidadeInicial(it)) || 1;
      return acc + v * q;
    }, 0);
  }, [lista, selectedIds, quantidades]);

  const confirmar = () => {
    const selecionados = (lista || [])
      .filter((it) => selectedIds.has(it.id))
      .map((it) => ({
        ...it,
        quantidade: Number(quantidades.get(it.id) ?? getQuantidadeInicial(it)) || 1,
      }));
    onConfirm(selecionados);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[80vh] flex flex-col">

        {/* Header fixo */}
        <div className="px-6 pt-5 pb-3 border-b shrink-0">
          <h3 className="text-base font-semibold text-neutral-800 mb-3">Selecionar Equipamentos</h3>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nome ou categoria…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              autoComplete="off"
              className="w-full pl-10 pr-3 h-8 text-xs border border-neutral-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Corpo rolável */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-zinc-800 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 w-8"></th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-100">Equipamento</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-100">Categoria</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-100">Diária</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-100">Qtd</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((it) => (
                <tr key={it.id} className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer"
                  onClick={() => toggle(it.id)}>
                  <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(it.id)}
                      onChange={() => toggle(it.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2 text-xs font-medium text-neutral-800">{it.nome}</td>
                  <td className="px-3 py-2 text-xs text-neutral-500">{it.categoria || "—"}</td>
                  <td className="px-3 py-2 text-xs text-right">
                    {fmtBRL(Number(it.valor_diaria ?? it.valor_aluguel ?? it.valor ?? 0))}
                  </td>
                  <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className="w-16 text-right border border-neutral-300 rounded px-1.5 py-0.5 text-xs disabled:opacity-40"
                      value={quantidades.get(it.id) ?? getQuantidadeInicial(it)}
                      disabled={!selectedIds.has(it.id)}
                      onChange={(e) => {
                        const v = Math.max(1, Number(e.target.value) || 1);
                        setQuantidades((prev) => {
                          const next = new Map(prev);
                          next.set(it.id, v);
                          return next;
                        });
                      }}
                    />
                  </td>
                </tr>
              ))}
              {listaFiltrada.length === 0 && (
                <tr>
                  <td className="px-3 py-8 text-center text-xs text-neutral-400 italic" colSpan={5}>
                    Nenhum equipamento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer fixo */}
        <div className="px-6 py-3 border-t bg-neutral-50 rounded-b-lg flex items-center justify-between shrink-0">
          <div className="text-xs text-neutral-600">
            Total selecionado:{" "}
            <strong className="text-neutral-800 text-sm">{fmtBRL(totalSelecionado)}</strong>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={confirmar} className="btn-primary">
              Confirmar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
