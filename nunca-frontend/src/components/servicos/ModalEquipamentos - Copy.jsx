import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/config";
import { fmtBRL } from "../../utils/formatters";

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

  const getQuantidadeInicial = (it) =>
    Number(it.quantidade ?? it.qtd ?? it.estoque ?? 1) || 1;

  // Normaliza qualquer entrada em um ID
  const toId = (e) =>
    typeof e === "number"
      ? e
      : e?.id ?? e?.equipamento_id ?? e?.equipamento?.id ?? null;

  // Carrega a lista quando abre e inicializa quantidades
  useEffect(() => {
    if (!isOpen) return;
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Selecionar Equipamentos</h3>

        <table className="w-full text-sm border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 w-8"></th>
              <th className="p-2 text-left">Equipamento</th>
              <th className="p-2 text-right">Diária</th>
              <th className="p-2 text-right">Qtd</th>
            </tr>
          </thead>
          <tbody>
            {(lista || []).map((it) => (
              <tr key={it.id} className="border-t">
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(it.id)}
                    onChange={() => toggle(it.id)}
                  />
                </td>
                <td className="p-2">{it.nome}</td>
                <td className="p-2 text-right">
                  {fmtBRL(Number(it.valor_diaria ?? it.valor_aluguel ?? it.valor ?? 0))}
                </td>
                <td className="p-2 text-right">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className="w-20 text-right border rounded px-2 py-1 disabled:opacity-50"
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
            {lista?.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={4}>
                  Nenhum equipamento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-700">
            Total selecionado: <strong>{fmtBRL(totalSelecionado)}</strong>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded border">
              Cancelar
            </button>
            <button
              onClick={confirmar}
              className="px-4 py-2 rounded bg-blue-600 text-white"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
