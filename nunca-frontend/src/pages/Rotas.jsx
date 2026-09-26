import { useEffect, useMemo, useRef, useState } from "react";
import { APIProvider, Map, AdvancedMarker, Polyline, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Trash2, Flag, Loader2, MapPin, AlertTriangle } from "lucide-react";
import { matrizDeCustos, tracarRota } from "../services/rotasApi";
import { menorRoteiro, verticesIsolados } from "../utils/rotas/grafo";

// Chave de navegador (restrita por domínio no Google Cloud) e Map ID, em
// nunca-frontend/.env.<modo>.local — arquivos fora do git.
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

const STORAGE_KEY = "rotas.pontos";
const CENTRO_PADRAO = [-30.0346, -51.2177]; // Porto Alegre
// Termos do Google: coordenadas obtidas do Google podem ser guardadas por até 30 dias
const VALIDADE_MS = 30 * 24 * 60 * 60 * 1000;

function lerPontosSalvos() {
  try {
    const salvos = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    return salvos.filter((p) => p.obtidoEm && Date.now() - p.obtidoEm < VALIDADE_MS);
  } catch {
    return [];
  }
}

function horaAtual() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const fmtHora = (d) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const fmtKm = (m) => `${(m / 1000).toFixed(1).replace(".", ",")} km`;
function fmtDuracao(s) {
  const min = Math.round(s / 60);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`;
}

const latLng = ([lat, lng]) => ({ lat, lng });

function MarcadorNumerado({ rotulo, partida }) {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 9999,
        background: partida ? "#16a34a" : "#2563eb",
        color: "#fff",
        font: "600 12px/28px sans-serif",
        textAlign: "center",
        border: "2px solid #fff",
        boxShadow: "0 1px 4px rgba(0,0,0,.4)",
        transform: "translateY(50%)", // centraliza o círculo no ponto (âncora padrão é a base)
      }}
    >
      {rotulo}
    </div>
  );
}

/* ── Enquadra o mapa nos pontos ───────────────────────────── */
function AjustarMapa({ pontos }) {
  const map = useMap();
  const core = useMapsLibrary("core");
  const qtdAnterior = useRef(-1);
  useEffect(() => {
    if (!map || !core) return;
    // só reenquadra quando entra/sai ponto; arrastar um marcador não mexe no zoom
    if (pontos.length === qtdAnterior.current) return;
    qtdAnterior.current = pontos.length;
    if (pontos.length === 1) {
      map.setCenter(latLng(pontos[0]));
      map.setZoom(16);
    } else if (pontos.length > 1) {
      const limites = new core.LatLngBounds();
      pontos.forEach((p) => limites.extend(latLng(p)));
      map.fitBounds(limites, 60);
    }
  }, [map, core, pontos]);
  return null;
}

/* ── Campo de endereço com autocomplete (Google Places) ───── */
function BuscaEndereco({ perto, onSelecionar }) {
  const places = useMapsLibrary("places");
  const [texto, setTexto] = useState("");
  const [sugestoes, setSugestoes] = useState([]);
  const [ativo, setAtivo] = useState(-1);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const sessao = useRef(null); // agrupa digitação + escolha numa sessão (cobrança por sessão)
  const consulta = useRef(0); // descarta respostas de buscas antigas

  useEffect(() => {
    if (!places || texto.trim().length < 3) {
      setSugestoes([]);
      return;
    }
    const minha = ++consulta.current;
    const t = setTimeout(async () => {
      setCarregando(true);
      setErro("");
      try {
        sessao.current ??= new places.AutocompleteSessionToken();
        const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: texto.trim(),
          sessionToken: sessao.current,
          locationBias: { center: latLng(perto), radius: 50000 },
          includedRegionCodes: ["br"],
          language: "pt-BR",
          region: "br",
        });
        if (minha !== consulta.current) return;
        setSugestoes(
          suggestions
            .filter((s) => s.placePrediction)
            .map((s) => ({ id: s.placePrediction.placeId, endereco: s.placePrediction.text.text, predicao: s.placePrediction }))
        );
        setAtivo(-1);
      } catch {
        if (minha === consulta.current) setErro("Não foi possível buscar endereços.");
      } finally {
        if (minha === consulta.current) setCarregando(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [texto, perto, places]);

  async function escolher(s) {
    setSugestoes([]);
    setCarregando(true);
    try {
      const lugar = s.predicao.toPlace();
      await lugar.fetchFields({ fields: ["location", "formattedAddress"] });
      onSelecionar({ endereco: lugar.formattedAddress || s.endereco, coords: [lugar.location.lat(), lugar.location.lng()] });
      setTexto("");
    } catch {
      setErro("Não foi possível obter a localização desse endereço.");
    } finally {
      sessao.current = null; // a busca dos detalhes encerra a sessão
      setCarregando(false);
    }
  }

  function onKeyDown(e) {
    if (!sugestoes.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAtivo((a) => (a + 1) % sugestoes.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((a) => (a <= 0 ? sugestoes.length - 1 : a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      escolher(sugestoes[ativo >= 0 ? ativo : 0]);
    } else if (e.key === "Escape") {
      setSugestoes([]);
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Digite um endereço (rua, número, cidade)…"
          className="w-full pr-8"
          autoComplete="off"
        />
        {carregando && (
          <Loader2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-neutral-400" />
        )}
      </div>
      {erro && <p className="text-xs text-red-600 mt-1">{erro}</p>}
      {sugestoes.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-neutral-200 rounded-md shadow-lg max-h-72 overflow-y-auto">
          {sugestoes.map((s, i) => (
            <li key={s.id + i}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(s)}
                className={`w-full text-left flex items-start gap-2 px-3 py-2 text-xs ${
                  i === ativo ? "bg-primary-50 text-primary-700" : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <MapPin size={13} className="mt-0.5 shrink-0 text-neutral-400" />
                <span>{s.endereco}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Página ───────────────────────────────────────────────── */
export default function Rotas() {
  if (!GOOGLE_MAPS_KEY) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">Rotas</h1>
        </div>
        <div className="page-body">
          <div className="card p-4 text-xs text-neutral-600 space-y-1">
            <p className="font-semibold text-neutral-800">Google Maps não configurado.</p>
            <p>
              Defina <code>VITE_GOOGLE_MAPS_API_KEY</code> (e opcionalmente <code>VITE_GOOGLE_MAPS_MAP_ID</code>) em{" "}
              <code>nunca-frontend/.env.devlocal.local</code> ou <code>.env.production.local</code> e reinicie o
              frontend.
            </p>
          </div>
        </div>
      </>
    );
  }
  return (
    <APIProvider apiKey={GOOGLE_MAPS_KEY} language="pt-BR" region="BR">
      <PaginaRotas />
    </APIProvider>
  );
}

function PaginaRotas() {
  // pontos em ordem de inserção; o índice 0 é sempre o ponto de partida
  const [pontos, setPontos] = useState(lerPontosSalvos);
  const [horaSaida, setHoraSaida] = useState(horaAtual);
  const [paradaMin, setParadaMin] = useState(0);
  const [voltar, setVoltar] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [calculando, setCalculando] = useState(false);
  const [erroRota, setErroRota] = useState("");
  const idSeq = useRef(Date.now());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pontos));
    } catch {
      /* armazenamento indisponível: segue só em memória */
    }
  }, [pontos]);

  // Recalcula o menor roteiro sempre que os vértices mudam
  useEffect(() => {
    if (pontos.length < 2) {
      setResultado(null);
      setErroRota("");
      setCalculando(false);
      return;
    }
    let cancelado = false;
    (async () => {
      setCalculando(true);
      setErroRota("");
      try {
        const coords = pontos.map((p) => p.coords);
        const matriz = await matrizDeCustos(coords);
        const pesos = matriz.durations;
        const { ordem, algoritmo } = menorRoteiro(pesos, { voltarAoInicio: voltar });
        if (!ordem) {
          const isolados = verticesIsolados(pesos).map((i) => pontos[i].endereco);
          throw new Error(
            "Não existe roteiro que passe por todos os endereços respeitando a mão das ruas" +
              (isolados.length ? `. Sem acesso de/para: ${isolados.join("; ")}` : ".")
          );
        }
        const sequencia = voltar ? [...ordem, 0] : ordem;
        const trajeto = await tracarRota(sequencia.map((i) => coords[i]));
        if (cancelado) return;
        setResultado({ pontos, ordem, sequencia, algoritmo, ...trajeto });
      } catch (e) {
        if (cancelado) return;
        setResultado(null);
        setErroRota(e.message);
      }
      setCalculando(false);
    })();
    return () => {
      cancelado = true;
    };
  }, [pontos, voltar]);

  // descarta resultado calculado para uma lista de pontos que já mudou
  const rota = resultado?.pontos === pontos ? resultado : null;

  // Horário estimado de chegada em cada parada
  const itinerario = useMemo(() => {
    if (!rota) return pontos.map((p, i) => ({ ponto: p, indice: i }));
    const [h, m] = horaSaida.split(":").map(Number);
    const relogio = new Date();
    relogio.setHours(h || 0, m || 0, 0, 0);
    return rota.sequencia.map((idx, pos) => {
      const trecho = pos > 0 ? rota.trechos[pos - 1] : null;
      if (trecho) {
        relogio.setTime(relogio.getTime() + trecho.duracao * 1000);
      }
      const chegada = new Date(relogio);
      if (pos > 0) relogio.setTime(relogio.getTime() + paradaMin * 60000);
      return { ponto: pontos[idx], indice: idx, pos, trecho, chegada, retorno: pos > 0 && idx === 0 };
    });
  }, [rota, pontos, horaSaida, paradaMin]);

  const posicaoNaRota = useMemo(() => {
    const mapa = {};
    rota?.ordem.forEach((idx, pos) => (mapa[idx] = pos));
    return mapa;
  }, [rota]);

  const perto = useMemo(() => (pontos.length ? pontos[pontos.length - 1].coords : CENTRO_PADRAO), [pontos]);
  const coordsMapa = useMemo(() => pontos.map((p) => p.coords), [pontos]);
  const caminho = useMemo(() => rota?.linha.map(latLng), [rota]);
  const total = rota?.trechos.reduce((acc, t) => ({ d: acc.d + t.duracao, m: acc.m + t.distancia }), { d: 0, m: 0 });

  function adicionar(s) {
    setPontos((ps) => [...ps, { id: ++idSeq.current, endereco: s.endereco, coords: s.coords, obtidoEm: Date.now() }]);
  }
  const mover = (id, coords) =>
    setPontos((ps) => ps.map((p) => (p.id === id ? { ...p, coords } : p)));
  const remover = (id) => setPontos((ps) => ps.filter((p) => p.id !== id));
  const definirPartida = (id) =>
    setPontos((ps) => [ps.find((p) => p.id === id), ...ps.filter((p) => p.id !== id)]);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Rotas</h1>
        {pontos.length > 0 && (
          <button type="button" onClick={() => setPontos([])} className="text-xs text-neutral-500 hover:text-red-600">
            Limpar tudo
          </button>
        )}
      </div>

      <div className="page-body space-y-4">
        <div className="card p-4 space-y-3">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            {pontos.length === 0 ? "Ponto de partida" : "Adicionar endereço"}
          </p>
          <BuscaEndereco perto={perto} onSelecionar={adicionar} />
          <div className="flex flex-wrap items-end gap-4 text-xs font-medium text-neutral-600">
            <label className="flex flex-col gap-1">
              Saída às
              <input type="time" value={horaSaida} onChange={(e) => setHoraSaida(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              Tempo em cada parada (min)
              <input
                type="number"
                min={0}
                step={5}
                value={paradaMin}
                onChange={(e) => setParadaMin(Math.max(0, Number(e.target.value) || 0))}
                className="w-28"
              />
            </label>
            <label className="flex items-center gap-2 pb-1.5">
              <input type="checkbox" checked={voltar} onChange={(e) => setVoltar(e.target.checked)} />
              Voltar ao ponto de partida
            </label>
          </div>
        </div>

        <div className="card overflow-hidden relative z-0">
          <Map
            mapId={GOOGLE_MAP_ID}
            defaultCenter={latLng(CENTRO_PADRAO)}
            defaultZoom={12}
            gestureHandling="greedy"
            streetViewControl={false}
            style={{ height: 440 }}
          >
            <AjustarMapa pontos={coordsMapa} />
            {pontos.map((p, i) => (
              <AdvancedMarker
                key={p.id}
                position={latLng(p.coords)}
                title={p.endereco}
                draggable
                onDragEnd={(e) => e.latLng && mover(p.id, [e.latLng.lat(), e.latLng.lng()])}
              >
                <MarcadorNumerado
                  rotulo={posicaoNaRota[i] !== undefined ? posicaoNaRota[i] + 1 : i + 1}
                  partida={i === 0}
                />
              </AdvancedMarker>
            ))}
            {rota && (
              <Polyline path={caminho} strokeColor="#2563eb" strokeWeight={5} strokeOpacity={0.8} />
            )}
          </Map>
        </div>

        {erroRota && (
          <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            {erroRota}
          </div>
        )}

        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-neutral-100">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Roteiro</p>
            <div className="flex items-center gap-3 text-xs text-neutral-500">
              {calculando && <Loader2 size={14} className="animate-spin" />}
              {rota && total && (
                <span>
                  {fmtKm(total.m)} · {fmtDuracao(total.d)} dirigindo · {rota.algoritmo}
                </span>
              )}
            </div>
          </div>

          {pontos.length === 0 ? (
            <p className="px-4 py-6 text-xs text-neutral-400 text-center">
              Adicione endereços acima. O primeiro é o ponto de partida; a ordem de visita é otimizada automaticamente.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-neutral-500 bg-neutral-50">
                <tr>
                  <th className="px-3 py-2 text-left w-10">#</th>
                  <th className="px-3 py-2 text-left">Endereço</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Trecho</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Chegada</th>
                  <th className="px-3 py-2 w-16" />
                </tr>
              </thead>
              <tbody>
                {itinerario.map(({ ponto, indice, pos, trecho, chegada, retorno }) => (
                  <tr key={`${ponto.id}-${pos ?? indice}`} className="border-t border-neutral-100">
                    <td className="px-3 py-2 font-semibold text-neutral-700">
                      {retorno ? "↩" : (pos ?? indice) + 1}
                    </td>
                    <td className="px-3 py-2 text-neutral-700">
                      {indice === 0 && !retorno && (
                        <span className="mr-1.5 px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-semibold">
                          PARTIDA
                        </span>
                      )}
                      {retorno && <span className="mr-1.5 text-neutral-400">Retorno:</span>}
                      {ponto.endereco}
                    </td>
                    <td className="px-3 py-2 text-right text-neutral-500 whitespace-nowrap">
                      {trecho ? `${fmtKm(trecho.distancia)} · ${fmtDuracao(trecho.duracao)}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-neutral-800 whitespace-nowrap">
                      {chegada ? (pos === 0 ? `sai ${fmtHora(chegada)}` : fmtHora(chegada)) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {!retorno && (
                        <div className="flex justify-end gap-2">
                          {indice !== 0 && (
                            <button
                              type="button"
                              title="Definir como partida"
                              onClick={() => definirPartida(ponto.id)}
                              className="text-neutral-400 hover:text-green-600"
                            >
                              <Flag size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            title="Remover"
                            onClick={() => remover(ponto.id)}
                            className="text-neutral-400 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
