import { useEffect, useMemo, useState } from "react";
import ModalEquipamentos from "./ModalEquipamentos";

/**
 * Props esperadas:
 * - valor: number (valor diária equipamentos)
 * - onValorChange: (number) => void
 * - onSelecionar: (listaEquipSelecionados[]) => void
 * - equipamentosIniciais?: array de equipamentos já ligados ao serviço (edição)
 * - onPacoteChange?: (boolean) => void
 * - pacoteInicial?: boolean
 */
export default function CampoEquipamentos({
  valor = 0,
  onValorChange,
  onSelecionar,
  equipamentosIniciais = [],
  onPacoteChange,
  pacoteInicial = false,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selecionados, setSelecionados] = useState(equipamentosIniciais || []);
  const [isPacote, setIsPacote] = useState(!!pacoteInicial);
  const [valorLocal, setValorLocal] = useState(Number(valor) || 0);

  // sincroniza quando o pai mudar o "pacoteInicial"
  useEffect(() => {
    setIsPacote(!!pacoteInicial);
  }, [pacoteInicial]);

  // Mantém valorLocal em sincronia quando pai muda (ex.: reset do form)
  useEffect(() => {
    const num = Number(valor) || 0;
    if (num !== valorLocal) setValorLocal(num);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  // Soma calculada dos selecionados (usada quando NÃO é pacote) — considera quantidade
  const totalSelecionados = useMemo(() => {
    return (selecionados || []).reduce((acc, e) => {
      const v = Number(e.valor_diaria ?? e.valor_aluguel ?? e.valor ?? 0) || 0;
      const q = Number(e.quantidade ?? e.qtd ?? 1) || 1;
      return acc + v * q;
    }, 0);
  }, [selecionados]);

  function handleAbrirModal() {
    if (isPacote) return; // segurança extra
    setModalOpen(true);
  }

  function handleConfirmarEquipamentos(lista) {
    // Quando NÃO é pacote, total vem da soma da seleção (considerando quantidade)
    setSelecionados(lista || []);
    if (!isPacote) {
      const total = (lista || []).reduce((acc, e) => {
        const v = Number(e.valor_diaria ?? e.valor_aluguel ?? e.valor ?? 0) || 0;
        const q = Number(e.quantidade ?? e.qtd ?? 1) || 1;
        return acc + v * q;
      }, 0);
      setValorLocal(total);
      onValorChange && onValorChange(total);
    }
    onSelecionar && onSelecionar(lista || []);
    setModalOpen(false);
  }

  function handleCancelarModal() {
    setModalOpen(false);
  }

  function handleTogglePacote(checked) {
    setIsPacote(checked);
    onPacoteChange && onPacoteChange(checked);

    if (checked) {
      // Virou PACOTE: bloquear seleção e limpar equipamentos atrelados ao serviço
      if (selecionados.length > 0) {
        setSelecionados([]);
        onSelecionar && onSelecionar([]); // limpa no pai também
      }
      // NÃO zerar o valor — manter valorLocal como está e permitir edição manual do campo
    } else {
      // Deixou de ser PACOTE: zera o valor e mantém o input readonly (até abrir a modal)
      setValorLocal(0);
      onValorChange && onValorChange(0);
      // Não mexe em 'selecionados': usuário pode reabrir a modal e confirmar novamente
    }
  }

  function handleValorManualMudou(novoValor) {
    // Só permite edição manual quando É PACOTE
    if (!isPacote) return;
    const num = Number(novoValor) || 0;
    setValorLocal(num);
    onValorChange && onValorChange(num);
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Linha do título + checkbox */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Valor Diária Equipamentos</span>

        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isPacote}
            onChange={(e) => handleTogglePacote(e.target.checked)}
          />
          É pacote
        </label>
      </div>

      {/* Campo de valor + botão da modal */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          className={`border rounded p-2 w-36 ${isPacote ? "" : "bg-gray-100"}`}
          value={Number(valorLocal) || 0}
          onChange={(e) => handleValorManualMudou(e.target.value)}
          readOnly={!isPacote}
          min={0}
          step="0.01"
        />

        <button
          type="button"
          disabled={isPacote}
          onClick={handleAbrirModal}
          className={`px-3 py-2 rounded text-white ${
            isPacote
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          title={
            isPacote
              ? "Desmarque 'É pacote' para selecionar equipamentos"
              : "Selecionar equipamentos"
          }
        >
          Selecionar equipamentos
        </button>
      </div>

      {/* Lista simples dos selecionados (útil para conferência) */}
      {!isPacote && selecionados.length > 0 && (
        <div className="text-xs text-gray-600">
          {selecionados.length} item(ns) selecionados – soma atual:{" "}
          <strong>R$ {totalSelecionados.toFixed(2)}</strong>
        </div>
      )}

      {/* Modal de equipamentos */}
      {modalOpen && (
        <ModalEquipamentos
          isOpen={modalOpen}
          onClose={handleCancelarModal}
          onConfirm={handleConfirmarEquipamentos}
          preSelecionados={selecionados} // mantém pré-seleção e quantidade
        />
      )}
    </div>
  );
}
