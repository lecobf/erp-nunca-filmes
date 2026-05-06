import { NumericFormat } from "react-number-format";
import { fmtBRL } from "../utils/formatters";

export default function CurrencyInput({ value, onChange, className = "", readOnly = false, ...rest }) {
  return (
    <NumericFormat
      value={value}
      thousandSeparator="."
      decimalSeparator=","
      decimalScale={2}
      fixedDecimalScale
      allowNegative={false}
      prefix="R$ "
      readOnly={readOnly}
      onValueChange={(vals) => {
        if (!readOnly) onChange(Number(vals.floatValue) || 0);
      }}
      className={`border p-2 rounded ${readOnly ? "bg-neutral-50" : ""} ${className}`}
      placeholder="R$ 0,00"
      {...rest}
    />
  );
}
