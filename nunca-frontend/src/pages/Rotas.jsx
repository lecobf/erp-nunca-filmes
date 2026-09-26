import { useEffect, useMemo, useRef, useState } from "react";
import { APIProvider, Map, AdvancedMarker, Polyline, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Trash2, Loader2, MapPin, AlertTriangle, Pencil } from "lucide-react";
import { matrizDeCustos, tracarRota } from "../services/rotasApi";
import { menorCaminho, verticesIsolados } from "../utils/rotas/grafo";

// Chave de navegador (restrita por domínio no Google Cloud) e Map ID, em
// nunca-frontend/.env.<modo>.local — arquivos fora do git.
// (criados por CONFIGURAR_GOOGLE_MAPS.bat; "COLE_AQUI_..." = ainda não preenchido)
const valorEnv = (v) => (v && !v.startsWith("COLE_AQUI") ? v.trim() : undefined);
const GOOGLE_MAPS_KEY = valorEnv(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
const GOOGLE_MAP_ID = valorEnv(import.meta.env.VITE_GOOGLE_MAPS_MAP_ID) || "DEMO_MAP_ID";

const STORAGE_KEY = "rotas.roteiro";
const CENTRO_PADRAO = [-30.0346, -51.2177]; // Porto Alegre
// Termos do Google: coordenadas obtidas do Google podem ser guardadas por até 30 dias
const VALIDADE_MS = 30 * 24 * 60 * 60 * 1000;

const ROTEIRO_VAZIO = { partida: null, chegada: null, paradas: [] };
const valido = (p) => p && p.obtidoEm && Date.now() - p.obtidoEm < VALIDADE_MS;

function lerRoteiroSalvo() {
  try {
    const salvo = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    return {
      partida: valido(salvo.partida) ? salvo.partida : null,
      chegada: valido(salvo.chegada) ? salvo.chegada : null,
      paradas: (salvo.paradas || []).filter(valido),
    };
  } catch {
    return ROTEIRO_VAZIO;
  }
}

const CORES = { partida: "#16a34a", chegada: "#dc2626", parada: "#2563eb" };

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

function MarcadorNumerado({ rotulo, papel }) {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 9999,
        background: CORES[papel],
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
function BuscaEndereco({ perto, onSelecionar, placeholder = "Digite um endereço (rua, número, cidade)…" }) {
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
          placeholder={placeholder}
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
              Rode <code>CONFIGURAR_GOOGLE_MAPS.bat</code> na pasta do projeto, preencha{" "}
              <code>VITE_GOOGLE_MAPS_API_KEY</code> em <code>nunca-frontend/.env.devlocal.local</code> (em produção:{" "}
              <code>.env.production.local</code>) e reinicie o frontend.
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

/* ── Local fixo (partida ou chegada): mostra o endereço ou o campo de busca ── */
function LocalFixo({ titulo, descricao, papel, ponto, perto, onDefinir, onLimpar }) {
  const [editando, setEditando] = useState(false);
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-neutral-600">
        <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle" style={{ background: CORES[papel] }} />
        {titulo} <span className="font-normal text-neutral-400">— {descricao}</span>
      </p>
      {ponto && !editando ? (
        <div className="flex items-center gap-2 border border-neutral-200 rounded px-2.5 py-1.5 text-xs text-neutral-700 bg-neutral-50">
          <span className="flex-1">{ponto.endereco}</span>
          <button type="button" title="Trocar" onClick={() => setEditando(true)} className="text-neutral-400 hover:text-primary-600">
            <Pencil size={13} />
          </button>
          <button type="button" title="Remover" onClick={onLimpar} className="text-neutral-400 hover:text-red-600">
            <Trash2 size={13} />
          </button>
        </div>
      ) : (
        <BuscaEndereco
          perto={perto}
          placeholder={`Endereço do ${titulo.toLowerCase()}…`}
          onSelecionar={(s) => {
            onDefinir(s);
            setEditando(false);
          }}
        />
      )}
    </div>
  );
}

function PaginaRotas() {
  // partida e chegada são fixas; só a ordem das paradas (equipe) é otimizada
  const [roteiro, setRoteiro] = useState(lerRoteiroSalvo);
  const [sentido, setSentido] = useState("ida"); // "ida": partida → paradas → chegada | "volta": o inverso
  // ida: hora em que é preciso CHEGAR ao destino final (a saída é calculada de trás para frente)
  // volta: hora de SAÍDA do local de chegada (ex.: fim da diária)
  const [horarios, setHorarios] = useState(() => ({ ida: horaAtual(), volta: horaAtual() }));
  const [paradaMin, setParadaMin] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [calculando, setCalculando] = useState(false);
  const [erroRota, setErroRota] = useState("");
  const idSeq = useRef(Date.now());
  const { partida, chegada, paradas } = roteiro;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(roteiro));
    } catch {
      /* armazenamento indisponível: segue só em memória */
    }
  }, [roteiro]);

  // Vértices do grafo: [partida?, ...paradas, chegada?], cada um com seu papel
  const vertices = useMemo(
    () => [
      ...(partida ? [{ ...partida, papel: "partida" }] : []),
      ...paradas.map((p) => ({ ...p, papel: "parada" })),
      ...(chegada ? [{ ...chegada, papel: "chegada" }] : []),
    ],
    [partida, chegada, paradas]
  );

  // Aviso quando falta algo para calcular o sentido escolhido
  const faltando = !partida
    ? "Defina o local de partida."
    : sentido === "volta" && !chegada
      ? "Defina o local de chegada para calcular a volta."
      : vertices.length < 2
        ? "Adicione endereços da equipe ou o local de chegada."
        : "";

  // Recalcula o menor caminho sempre que os vértices ou o sentido mudam
  useEffect(() => {
    if (faltando) {
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
        const coords = vertices.map((v) => v.coords);
        const iPartida = 0;
        const iChegada = chegada ? vertices.length - 1 : null;
        const matriz = await matrizDeCustos(coords);
        const pesos = matriz.durations;
        const extremos =
          sentido === "ida" ? { origem: iPartida, destino: iChegada } : { origem: iChegada, destino: iPartida };
        const { ordem, algoritmo } = menorCaminho(pesos, extremos);
        if (!ordem) {
          const isolados = verticesIsolados(pesos).map((i) => vertices[i].endereco);
          throw new Error(
            "Não existe caminho que passe por todos os endereços respeitando a mão das ruas" +
              (isolados.length ? `. Sem acesso de/para: ${isolados.join("; ")}` : ".")
          );
        }
        const trajeto = await tracarRota(ordem.map((i) => coords[i]));
        if (cancelado) return;
        setResultado({ vertices, sentido, ordem, algoritmo, ...trajeto });
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
  }, [vertices, sentido, chegada, faltando]);

  // descarta resultado calculado para vértices ou sentido que já mudaram
  const rota = resultado?.vertices === vertices && resultado.sentido === sentido ? resultado : null;

  // Horário de saída do motorista: na ida, calculado a partir da hora de chegada desejada
  // (tempo dirigindo + paradas da equipe antes do destino), arredondado para baixo
  // para nunca chegar atrasado; na volta, é a própria hora informada.
  const saidaMotorista = useMemo(() => {
    if (!rota) return null;
    const [h, m] = horarios[sentido].split(":").map(Number);
    const referencia = new Date();
    referencia.setHours(h || 0, m || 0, 0, 0);
    if (sentido === "volta") return referencia;
    const paradasAntes = rota.ordem.slice(0, -1).filter((i) => vertices[i].papel === "parada").length;
    const totalMs = rota.trechos.reduce((acc, t) => acc + t.duracao, 0) * 1000 + paradasAntes * paradaMin * 60000;
    return new Date(Math.floor((referencia.getTime() - totalMs) / 60000) * 60000);
  }, [rota, vertices, horarios, sentido, paradaMin]);

  // Horário estimado de chegada em cada ponto; o tempo de parada só conta nas paradas da equipe
  const itinerario = useMemo(() => {
    if (!rota || !saidaMotorista) return vertices.map((v) => ({ v }));
    const relogio = new Date(saidaMotorista);
    return rota.ordem.map((idx, pos) => {
      const v = vertices[idx];
      const trecho = pos > 0 ? rota.trechos[pos - 1] : null;
      if (trecho) relogio.setTime(relogio.getTime() + trecho.duracao * 1000);
      const chegadaEm = new Date(relogio);
      if (v.papel === "parada") relogio.setTime(relogio.getTime() + paradaMin * 60000);
      return { v, pos, trecho, chegadaEm };
    });
  }, [rota, vertices, saidaMotorista, paradaMin]);

  const posicaoNaRota = useMemo(() => {
    const mapa = {};
    rota?.ordem.forEach((idx, pos) => (mapa[vertices[idx].id] = pos));
    return mapa;
  }, [rota, vertices]);

  const ultimo = paradas[paradas.length - 1] || partida || chegada;
  const perto = useMemo(() => (ultimo ? ultimo.coords : CENTRO_PADRAO), [ultimo]);
  const coordsMapa = useMemo(() => vertices.map((v) => v.coords), [vertices]);
  const caminho = useMemo(() => rota?.linha.map(latLng), [rota]);
  const total = rota?.trechos.reduce((acc, t) => ({ d: acc.d + t.duracao, m: acc.m + t.distancia }), { d: 0, m: 0 });

  const novoPonto = (s) => ({ id: ++idSeq.current, endereco: s.endereco, coords: s.coords, obtidoEm: Date.now() });
  const definir = (papel, s) => setRoteiro((r) => ({ ...r, [papel]: novoPonto(s) }));
  const adicionarParada = (s) => setRoteiro((r) => ({ ...r, paradas: [...r.paradas, novoPonto(s)] }));
  const atualizar = (fn) =>
    setRoteiro((r) => ({
      partida: r.partida && fn(r.partida),
      chegada: r.chegada && fn(r.chegada),
      paradas: r.paradas.map(fn).filter(Boolean),
    }));
  const mover = (id, coords) => atualizar((p) => (p.id === id ? { ...p, coords } : p));
  const remover = (id) => atualizar((p) => (p.id === id ? null : p));

  const rotuloPapel = { partida: "PARTIDA", chegada: "CHEGADA" };
  const classePapel = { partida: "bg-green-100 text-green-700", chegada: "bg-red-100 text-red-700" };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Rotas</h1>
        {vertices.length > 0 && (
          <button
            type="button"
            onClick={() => setRoteiro(ROTEIRO_VAZIO)}
            className="text-xs text-neutral-500 hover:text-red-600"
          >
            Limpar tudo
          </button>
        )}
      </div>

      <div className="page-body space-y-4">
        <div className="card p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <LocalFixo
              titulo="Local de partida"
              descricao="ex.: garagem"
              papel="partida"
              ponto={partida}
              perto={perto}
              onDefinir={(s) => definir("partida", s)}
              onLimpar={() => setRoteiro((r) => ({ ...r, partida: null }))}
            />
            <LocalFixo
              titulo="Local de chegada"
              descricao="ex.: cliente"
              papel="chegada"
              ponto={chegada}
              perto={perto}
              onDefinir={(s) => definir("chegada", s)}
              onLimpar={() => setRoteiro((r) => ({ ...r, chegada: null }))}
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-neutral-600">
              <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle" style={{ background: CORES.parada }} />
              Paradas <span className="font-normal text-neutral-400">— endereços da equipe; a ordem é otimizada</span>
            </p>
            <BuscaEndereco perto={perto} onSelecionar={adicionarParada} placeholder="Adicionar endereço da equipe…" />
          </div>

          <div className="flex flex-wrap items-end gap-4 text-xs font-medium text-neutral-600 border-t border-neutral-100 pt-3">
            <div className="flex flex-col gap-1">
              Trajeto
              <div className="inline-flex rounded border border-neutral-300 overflow-hidden">
                {[
                  ["ida", "Ida: partida → chegada"],
                  ["volta", "Volta: chegada → partida"],
                ].map(([valor, rotulo]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => setSentido(valor)}
                    className={`px-3 py-1.5 text-xs ${
                      sentido === valor ? "bg-primary-600 text-white" : "bg-white text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1">
              {sentido === "ida" ? "Chegar ao destino às" : "Sair do local de chegada às"}
              <input
                type="time"
                value={horarios[sentido]}
                onChange={(e) => setHorarios((h) => ({ ...h, [sentido]: e.target.value }))}
              />
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
            {vertices.map((v) => (
              <AdvancedMarker
                key={v.id}
                position={latLng(v.coords)}
                title={v.endereco}
                draggable
                onDragEnd={(e) => e.latLng && mover(v.id, [e.latLng.lat(), e.latLng.lng()])}
              >
                <MarcadorNumerado
                  papel={v.papel}
                  rotulo={v.papel === "partida" ? "P" : v.papel === "chegada" ? "C" : (posicaoNaRota[v.id] ?? "•")}
                />
              </AdvancedMarker>
            ))}
            {rota && <Polyline path={caminho} strokeColor="#2563eb" strokeWeight={5} strokeOpacity={0.8} />}
          </Map>
        </div>

        {(erroRota || (faltando && vertices.length > 0)) && (
          <div
            className={`flex items-start gap-2 text-xs rounded-md px-3 py-2 border ${
              erroRota ? "text-red-700 bg-red-50 border-red-200" : "text-amber-700 bg-amber-50 border-amber-200"
            }`}
          >
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            {erroRota || faltando}
          </div>
        )}

        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-neutral-100">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Roteiro — {sentido === "ida" ? "ida" : "volta"}
              </p>
              {sentido === "ida" && saidaMotorista && (
                <span className="px-2 py-1 rounded bg-primary-50 text-primary-700 text-xs font-semibold">
                  Motorista sai às {fmtHora(saidaMotorista)} para chegar às {horarios.ida}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-neutral-500">
              {calculando && <Loader2 size={14} className="animate-spin" />}
              {rota && total && (
                <span>
                  {fmtKm(total.m)} · {fmtDuracao(total.d)} dirigindo · {rota.algoritmo}
                </span>
              )}
            </div>
          </div>

          {vertices.length === 0 ? (
            <p className="px-4 py-6 text-xs text-neutral-400 text-center">
              Defina o local de partida e o de chegada e adicione os endereços da equipe. A ordem das paradas é
              otimizada automaticamente.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-neutral-500 bg-neutral-50">
                <tr>
                  <th className="px-3 py-2 text-left w-10">#</th>
                  <th className="px-3 py-2 text-left">Endereço</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Trecho</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Chegada</th>
                  <th className="px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {itinerario.map(({ v, pos, trecho, chegadaEm }) => (
                  <tr key={v.id} className="border-t border-neutral-100">
                    <td className="px-3 py-2 font-semibold text-neutral-700">
                      {v.papel === "parada" ? (pos ?? "•") : v.papel === "partida" ? "P" : "C"}
                    </td>
                    <td className="px-3 py-2 text-neutral-700">
                      {rotuloPapel[v.papel] && (
                        <span className={`mr-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${classePapel[v.papel]}`}>
                          {rotuloPapel[v.papel]}
                        </span>
                      )}
                      {v.endereco}
                    </td>
                    <td className="px-3 py-2 text-right text-neutral-500 whitespace-nowrap">
                      {trecho ? `${fmtKm(trecho.distancia)} · ${fmtDuracao(trecho.duracao)}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-neutral-800 whitespace-nowrap">
                      {chegadaEm ? (pos === 0 ? `sai ${fmtHora(chegadaEm)}` : fmtHora(chegadaEm)) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        title="Remover"
                        onClick={() => remover(v.id)}
                        className="text-neutral-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
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
