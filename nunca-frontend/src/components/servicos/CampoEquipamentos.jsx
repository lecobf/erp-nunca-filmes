import { useEffect, useMemo, useState } from "react";
import ModalEquipamentos from "./ModalEquipamentos";
// import { BoxSelect } from "lucide-react"; // ❌ não usado
import CurrencyInput from "../CurrencyInput";

/**
 * Props esperadas:
 * - valor: number (valor diária equipamentos)
 * - onValorChange: (number) => void
 * - onSelecionar: (listaEquipSelecionados[]) => void
 * - equipamentosIniciais?: array de equipamentos já ligados ao serviço (edição)
 * - onPacoteChange?: (boolean) => void
 * - pacoteInicial?: boolean
 * - showLabel?: boolean
 */
export default function CampoEquipamentos({
  valor = 0,
  showLabel = true,
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
    // CurrencyInput já entrega número; mas garantimos:
    const num = Number(novoValor) || 0;
    // Só permite edição manual quando É PACOTE
    if (!isPacote) return;
    setValorLocal(num);
    onValorChange && onValorChange(num);
  }

  return (
  <div className="flex flex-col gap-2">
    {/* Título acima, sem checkbox aqui */}
    {showLabel && (
      <span className="block mb-1 text-sm font-medium">
        Valor Diária Equipamentos
      </span>
    )}

   {/* Linha principal: input ocupa 100% + botão como adornment + chip 'Pacote' ao final */}
<div className="flex items-center gap-2">
  {/* Input com botão sobreposto */}
  <div className="relative flex-1">
    <CurrencyInput
      value={Number(valorLocal) || 0}
      onChange={(val) => handleValorManualMudou(val)}
      readOnly={!isPacote}
      className={`h-10 w-full pr-12 ${!isPacote ? "bg-gray-100" : ""}`} // 👈 espaço p/ o botão
    />

    {/* Botão sobre o canto direito do input */}
    <button
      type="button"
      disabled={isPacote}
      onClick={handleAbrirModal}
      title="Selecionar equipamentos"
      aria-label="Selecionar equipamentos"
      className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded ${
        isPacote
          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-700 text-white"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="4" width="18" height="14" rx="2"></rect>
        <path d="M7 8h10M7 12h10M7 16h6"></path>
      </svg>
    </button>
  </div>

  {/* Chip Pacote no final */}
  <label
    title="Marque para editar valor manualmente"
    className="whitespace-nowrap flex items-center gap-2 text-xs cursor-pointer select-none px-2 h-10 rounded border"
  >
    <input
      type="checkbox"
      checked={isPacote}
      onChange={(e) => handleTogglePacote(e.target.checked)}
    />
    Pacote
  </label>
</div>


    {/* Resumo seleção */}
    {!isPacote && selecionados.length > 0 && (
      <div className="text-xs text-gray-600">
        {selecionados.length} item(ns) selecionados — soma atual:{" "}
        <strong>R$ {totalSelecionados.toFixed(2)}</strong>
      </div>
    )}

    {/* Modal */}
    {modalOpen && (
      <ModalEquipamentos
        isOpen={modalOpen}
        onClose={handleCancelarModal}
        onConfirm={handleConfirmarEquipamentos}
        preSelecionados={selecionados}
      />
    )}
  </div>
);

}
