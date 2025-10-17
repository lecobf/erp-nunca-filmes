import { NumericFormat } from "react-number-format";
import { fmtBRL } from "../utils/formatters";

export default function CurrencyInput({ value, onChange, className = "" }) {
  return (
    <NumericFormat
      value={value}
      thousandSeparator="."
      decimalSeparator=","
      decimalScale={2}
      fixedDecimalScale
      allowNegative={false}
      prefix="R$ "
      onValueChange={(vals) => {
        // sempre retorna o valor numérico puro (float) para salvar no backend
        onChange(Number(vals.floatValue) || 0);
      }}
      className={`border p-2 rounded ${className}`}
      placeholder="R$ 0,00"
    />
  );
}
