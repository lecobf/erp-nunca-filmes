import { forwardRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar } from "lucide-react";
import { ymd } from "../utils/formatters";

/* Input customizado: ícone de calendário + texto compacto */
const CalendarInput = forwardRef(function CalendarInput({ value, onClick, placeholder, className = "" }, ref) {
  return (
    <button
      type="button"
      ref={ref}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 border border-neutral-300 rounded px-2 bg-white
        hover:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400
        transition-colors text-xs h-7 min-w-[110px] ${className}`}
    >
      <Calendar size={12} className="text-neutral-400 shrink-0" />
      <span className={value ? "text-neutral-700" : "text-neutral-400"}>
        {value || placeholder || "dd/mm/aaaa"}
      </span>
    </button>
  );
});

export default function DateInput({ value, onChange, className = "", placeholder }) {
  const parsedValue = value ? new Date(value + "T00:00:00") : null;

  const handleChange = (date) => {
    if (date) date.setHours(0, 0, 0, 0);
    onChange(date ? ymd(date) : null);
  };

  return (
    <DatePicker
      selected={parsedValue}
      onChange={handleChange}
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholder || "dd/mm/aaaa"}
      customInput={<CalendarInput className={className} placeholder={placeholder || "dd/mm/aaaa"} />}
      popperPlacement="bottom-start"
    />
  );
}
