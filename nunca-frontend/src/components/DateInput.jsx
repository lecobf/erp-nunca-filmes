import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ymd } from "../utils/formatters";

export default function DateInput({ value, onChange, className = "" }) {
  const parsedValue = value ? new Date(value + "T00:00:00") : null; 
  // força o horário para meia-noite local

  const [open, setOpen] = useState(false);

  const handleChange = (date) => {
    if (date) {
      // zera o horário para evitar bug de fuso
      date.setHours(0, 0, 0, 0);
    }
    onChange(date ? ymd(date) : null);
    setOpen(false); // fecha ao escolher
  };

  return (
    <DatePicker
      selected={parsedValue}
      onChange={handleChange}
      dateFormat="dd/MM/yyyy"
      placeholderText="dd/mm/aaaa"
      className={`border p-2 rounded ${className}`}
      open={open}
      onInputClick={() => setOpen(true)}
      onClickOutside={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Escape") {
          setOpen(false);
        }
      }}
    />
  );
}
