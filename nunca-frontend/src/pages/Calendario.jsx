import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import IconButton from "../components/IconButton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../api/config";
import ModalServicoCalendario from "../components/calendario/ModalServicoCalendario";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

function parseISODate(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function addDays(dateObj, n) {
  const d = new Date(dateObj);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeekMonday(dateObj) {
  const d = new Date(dateObj);
  const jsDay = d.getDay(); // 0=Dom..6=Sáb
  const diff = (jsDay + 6) % 7; // Seg=0, Ter=1, ... Dom=6
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeekSunday(dateObj) {
  const start = startOfWeekMonday(dateObj);
  const end = addDays(start, 6);
  end.setHours(0, 0, 0, 0);
  return end;
}

function startOfMonth(dateObj) {
  const d = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(dateObj) {
  const d = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function monthNamePt(monthIndex0) {
  const meses = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
  ];
  return meses[monthIndex0] || "";
}

export default function Calendario() {
  const [searchParams, setSearchParams] = useSearchParams();

  const now = new Date();
  const urlAno = Number(searchParams.get("ano")) || now.getFullYear();
  const urlMes = Number(searchParams.get("mes")) || (now.getMonth() + 1);

  const [ano, setAno] = useState(urlAno);
  const [mes, setMes] = useState(urlMes); // 1-12

  // Modal de servico (criar/editar), aberta sem sair da tela de Calendario
  const [modalAberto, setModalAberto] = useState(false);
  const [servicoIdSelecionado, setServicoIdSelecionado] = useState(null);
  const [dataSelecionada, setDataSelecionada] = useState(null);
  const [servicos, setServicos] = useState([]);

  // Mantém state sincronizado com URL quando usuário navega por histórico/refresh
  useEffect(() => {
    setAno(urlAno);
    setMes(urlMes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const { gridStart, gridEnd, weeks } = useMemo(() => {
    const base = new Date(ano, mes - 1, 1);
    const mStart = startOfMonth(base);
    const mEnd = endOfMonth(base);
    const gStart = startOfWeekMonday(mStart);
    const gEnd = endOfWeekSunday(mEnd);

    const allDays = [];
    let cursor = new Date(gStart);
    while (cursor <= gEnd) {
      allDays.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }

    const w = [];
    for (let i = 0; i < allDays.length; i += 7) {
      w.push(allDays.slice(i, i + 7));
    }

    return { gridStart: gStart, gridEnd: gEnd, weeks: w };
  }, [ano, mes]);

  async function carregarServicos() {
    try {
      const inicio = toISODate(gridStart);
      const fim = toISODate(gridEnd);
      const res = await api.get("/servicos/calendario", { params: { inicio, fim } });
      setServicos(res.data || []);
    } catch (err) {
      console.error("Erro ao carregar serviços do calendário:", err);
      setServicos([]);
    }
  }

  useEffect(() => {
    carregarServicos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridStart.getTime(), gridEnd.getTime()]);

  function atualizarURL(nAno, nMes) {
    setSearchParams({ ano: String(nAno), mes: String(nMes) });
  }

  function irMes(delta) {
    let nAno = ano;
    let nMes = mes + delta;
    if (nMes <= 0) { nMes = 12; nAno -= 1; }
    if (nMes >= 13) { nMes = 1; nAno += 1; }
    atualizarURL(nAno, nMes);
  }

  function irAno(delta) {
    atualizarURL(ano + delta, mes);
  }

  // ---- Eventos: um por data cadastrada no servico ----
  const eventos = useMemo(() => {
    const evs = [];
    (servicos || []).forEach((s) => {
      const tituloBase = (s.cliente_nome || "Cliente") + " - " + (s.descricao || "");
      const titulo = tituloBase.trim().length > 55 ? tituloBase.trim().slice(0, 55) + "..." : tituloBase.trim();

      // Usa array de datas especificas; fallback para data_contratacao em registros antigos
      const datasArr = Array.isArray(s.datas) && s.datas.length > 0
        ? s.datas
        : [s.data_contratacao];

      datasArr.forEach((d) => {
        const start = parseISODate(
          typeof d === "string" ? d.slice(0, 10) : String(d).slice(0, 10)
        );
        if (!start) return;
        evs.push({ id: s.id, start, end: start, titulo, raw: s });
      });
    });
    return evs;
  }, [servicos]);

  // Retorna eventos que intersectam um intervalo [a,b]
  function intersects(ev, a, b) {
    return ev.start <= b && ev.end >= a;
  }

  // Aloca "lanes" (linhas) por semana para barras multi-dia não colidirem
  function buildWeekLayout(weekDays) {
    const wStart = weekDays[0];
    const wEnd = weekDays[6];

    // Segmentos recortados para essa semana
    const segs = eventos
      .filter((ev) => intersects(ev, wStart, wEnd))
      .map((ev) => {
        const startIdx = Math.max(0, Math.floor((startOfDay(ev.start) - startOfDay(wStart)) / 86400000));
        const endIdx = Math.min(6, Math.floor((startOfDay(ev.end) - startOfDay(wStart)) / 86400000));
        const isStartHere = sameDay(ev.start, weekDays[startIdx]);
        return {
          ev,
          startIdx,
          endIdx,
          isStartHere,
        };
      })
      .sort((a, b) => (a.startIdx - b.startIdx) || ((b.endIdx - b.startIdx) - (a.endIdx - a.startIdx)));

    // Greedy lane assignment
    const lanes = []; // cada lane: array de segmentos
    function conflicts(seg, lane) {
      return lane.some((x) => !(seg.endIdx < x.startIdx || seg.startIdx > x.endIdx));
    }
    segs.forEach((seg) => {
      let placed = false;
      for (let i = 0; i < lanes.length; i++) {
        if (!conflicts(seg, lanes[i])) {
          lanes[i].push(seg);
          placed = true;
          break;
        }
      }
      if (!placed) lanes.push([seg]);
    });

    // Normaliza ordem dentro de cada lane
    lanes.forEach((lane) => lane.sort((a, b) => a.startIdx - b.startIdx));

    return { lanes };
  }

  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function onClickDia(dateObj) {
    setServicoIdSelecionado(null);
    setDataSelecionada(toISODate(dateObj));
    setModalAberto(true);
  }

  function onClickEvento(evId) {
    setDataSelecionada(null);
    setServicoIdSelecionado(evId);
    setModalAberto(true);
  }

  function fecharModalServico() {
    setModalAberto(false);
    setServicoIdSelecionado(null);
    setDataSelecionada(null);
  }

  const hoje = new Date();
  const baseMes = new Date(ano, mes - 1, 1);

  // ✅ AJUSTES VISUAIS
  const HEADER_H = 32;
  const BAR_H = 22;
  const BAR_GAP = 6;
  const WEEK_PADDING_BOTTOM = 14;

  // ✅ altura mínima por semana (estilo Google Calendar)
  const WEEK_MIN_HEIGHT = 150;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <IconButton
            icon={ChevronLeft}
            color="gray"
            onClick={() => irAno(-1)}
            title="Ano anterior"
          >
            <ChevronLeft size={18} />
          </IconButton>
          <div className="text-sm font-medium w-16 text-center">{ano}</div>
          <IconButton
            icon={ChevronRight}
            color="gray"
            onClick={() => irAno(1)}
            title="Próximo ano"
          >
            <ChevronRight size={18} />
          </IconButton>
        </div>

        <div className="flex items-center gap-2">
          <IconButton
            icon={ChevronLeft}
            color="gray"
            onClick={() => irMes(-1)}
            title="Mês anterior"
          >
            <ChevronLeft size={18} />
          </IconButton>
          <div className="text-lg font-bold">
            {monthNamePt(baseMes.getMonth())}
          </div>
          <IconButton
            icon={ChevronRight}
            color="gray"
            onClick={() => irMes(1)}
            title="Próximo mês"
          >
            <ChevronRight size={18} />
          </IconButton>
        </div>

        <button
          type="button"
          onClick={() => atualizarURL(hoje.getFullYear(), hoje.getMonth() + 1)}
          className="border rounded px-3 py-2 text-sm hover:bg-gray-50"
          title="Ir para o mês atual"
        >
          Hoje
        </button>
      </div>

      {/* Cabeçalho dias da semana */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-t overflow-hidden">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-gray-50 p-3 text-xs font-semibold text-gray-700">
            {d}
          </div>
        ))}
      </div>

      {/* Semanas */}
      <div className="bg-gray-200 gap-px grid rounded-b overflow-hidden">
        {weeks.map((weekDays, wIdx) => {
          const { lanes } = buildWeekLayout(weekDays);

          const computedHeight =
            HEADER_H +
            (lanes.length ? lanes.length * BAR_H + Math.max(0, lanes.length - 1) * BAR_GAP : 0) +
            WEEK_PADDING_BOTTOM;

          const weekHeight = Math.max(computedHeight, WEEK_MIN_HEIGHT);

          return (
            <div
              key={wIdx}
              className="relative bg-gray-200"
              style={{ height: weekHeight }}
            >
              {/* Grade de dias */}
              <div className="grid grid-cols-7 gap-px">
                {weekDays.map((d, idx) => {
                  const isCurrentMonth = d.getMonth() === baseMes.getMonth();
                  const isToday = sameDay(d, hoje);

                  return (
                    <div
                      key={idx}
                      className={`bg-white p-3 cursor-pointer hover:bg-gray-50 select-none ${isCurrentMonth ? "" : "opacity-60"}`}
                      style={{ height: weekHeight }}
                      onClick={() => onClickDia(d)}
                      title={`Criar serviço em ${toISODate(d)}`}
                    >
                      <div className="flex items-center justify-between" style={{ height: HEADER_H }}>
                        <div
                          className={`text-sm font-semibold ${isToday ? "text-blue-700" : "text-gray-700"}`}
                        >
                          {d.getDate()}
                        </div>
                        {isToday && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                            Hoje
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Barras (overlay) */}
              <div className="absolute left-0 right-0 top-0 bottom-0 pointer-events-none">
                {lanes.map((lane, laneIdx) => {
                  return lane.map((seg) => {
                    const colSpan = seg.endIdx - seg.startIdx + 1;

                    const top = HEADER_H + laneIdx * (BAR_H + BAR_GAP);

                    const bgClass = seg.ev.raw?.tipo_servico === "Aluguel" ? "bg-orange-500" : "bg-red-500";
                    const textClass = "text-white";

                    return (
                      <div
                        key={`${seg.ev.id}-${seg.startIdx}-${colSpan}-${laneIdx}`}
                        className="absolute pointer-events-auto"
                        style={{
                          top,
                          height: BAR_H,
                          left: `${(seg.startIdx * 100) / 7}%`,
                          width: `${(colSpan * 100) / 7}%`,
                          paddingLeft: 6,
                          paddingRight: 6,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onClickEvento(seg.ev.id);
                        }}
                        title={seg.ev.titulo}
                      >
                        <div className={`${bgClass} ${textClass} rounded-md h-full flex items-center overflow-hidden`}>
                          <div className="text-[12px] font-semibold truncate">
                            {seg.isStartHere ? seg.ev.titulo : ""}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-xs text-gray-600">
        Dica: clique em um dia vazio para criar um serviço nessa data; clique na barra colorida para editar.
      </div>

      <ModalServicoCalendario
        isOpen={modalAberto}
        servicoId={servicoIdSelecionado}
        dataInicial={dataSelecionada}
        onClose={fecharModalServico}
        onSalvo={carregarServicos}
      />
    </div>
  );
}
