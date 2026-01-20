import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Calendario = () => {
  const [eventos, setEventos] = useState([]);
  const navigate = useNavigate();

  const carregarEventos = async (inicio, fim) => {
    try {
      const res = await axios.get(
        `http://localhost:8000/servicos/calendario?inicio=${inicio}&fim=${fim}`
      );
      const data = res.data.map((servico) => ({
        id: servico.id,
        title: `${servico.cliente?.nome ?? "Cliente"} - ${servico.descricao ?? ""}`,
        start: servico.data_inicio,
        end: servico.data_fim,
      }));
      setEventos(data);
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
    }
  };

  const handleRangeChange = (info) => {
    const inicio = info.startStr.split("T")[0];
    const fim = info.endStr.split("T")[0];
    carregarEventos(inicio, fim);
  };

  const handleEventClick = (info) => {
    navigate(`/servicos/${info.event.id}`);
  };

  const handleDateClick = (info) => {
    navigate(`/servicos/novo?data=${info.dateStr}`);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">📅 Agenda de Serviços</h2>
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        locale="pt-br"
        firstDay={1}
        allDaySlot={false}
        slotMinTime="08:00:00"
        slotMaxTime="22:00:00"
        height="85vh"
        events={eventos}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        datesSet={handleRangeChange}
      />
    </div>
  );
};

export default Calendario;
