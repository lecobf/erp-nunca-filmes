import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ymd } from "../utils/formatters";

export default function DateRangeInput({ value, onChange }) {
  const [startDate, setStartDate] = useState(value?.start ? new Date(value.start) : null);
  const [endDate, setEndDate] = useState(value?.end ? new Date(value.end) : null);

  // 🔹 controladores de abertura manual
  const [openStart, setOpenStart] = useState(false);
  const [openEnd, setOpenEnd] = useState(false);

  const handleChangeStart = (date) => {
    setStartDate(date);
    onChange({ start: date ? ymd(date) : null, end: endDate ? ymd(endDate) : null });
    setOpenStart(false); // 🔹 fecha ao escolher
  };

  const handleChangeEnd = (date) => {
    setEndDate(date);
    onChange({ start: startDate ? ymd(startDate) : null, end: date ? ymd(date) : null });
    setOpenEnd(false); // 🔹 fecha ao escolher
  };

  return (
    <div className="flex gap-2">
      {/* Data início */}
      <DatePicker
        selected={startDate}
        onChange={handleChangeStart}
        selectsStart
        startDate={startDate}
        endDate={endDate}
        dateFormat="dd/MM/yyyy"
        placeholderText="Data início"
        open={openStart}
        onInputClick={() => setOpenStart(true)}   // 🔹 abre ao clicar
        onClickOutside={() => setOpenStart(false)} // 🔹 fecha se clicar fora
        className="border p-2 rounded"
      />

      {/* Data fim */}
      <DatePicker
        selected={endDate}
        onChange={handleChangeEnd}
        selectsEnd
        startDate={startDate}
        endDate={endDate}
        minDate={startDate}
        dateFormat="dd/MM/yyyy"
        placeholderText="Data fim"
        open={openEnd}
        onInputClick={() => setOpenEnd(true)}   // 🔹 abre ao clicar
        onClickOutside={() => setOpenEnd(false)} // 🔹 fecha se clicar fora
        className="border p-2 rounded"
      />
    </div>
  );
}
