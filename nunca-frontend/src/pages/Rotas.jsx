import { useEffect, useMemo, useRef, useState } from "react";
import { APIProvider, Map, AdvancedMarker, Polyline, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Trash2, Loader2, MapPin, AlertTriangle, Pencil, Copy, Check, Printer, Navigation } from "lucide-react";
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

/* ── Links para abrir o roteiro no celular ─────────────────── */
const coordTxt = ([lat, lng]) => `${lat.toFixed(6)},${lng.toFixed(6)}`;
// O link do Google Maps aceita até 9 paradas intermediárias; roteiros maiores viram vários links encadeados.
const MAX_PARADAS_LINK = 9;

function linksGoogleMaps(coords) {
  const links = [];
  for (let i = 0; i < coords.length - 1; i += MAX_PARADAS_LINK + 1) {
    const trecho = coords.slice(i, i + MAX_PARADAS_LINK + 2);
    const params = new URLSearchParams({
      api: "1",
      origin: coordTxt(trecho[0]),
      destination: coordTxt(trecho[trecho.length - 1]),
      travelmode: "driving",
    });
    if (trecho.length > 2) params.set("waypoints", trecho.slice(1, -1).map(coordTxt).join("|"));
    links.push(`https://www.google.com/maps/dir/?${params}`);
  }
  return links;
}

// O Waze só aceita um destino por link: um link por parada
const linkWaze = (coords) => `https://waze.com/ul?ll=${coordTxt(coords)}&navigate=yes`;

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    // navegadores sem Clipboard API (ou página sem HTTPS): cópia pelo método antigo
    const area = document.createElement("textarea");
    area.value = texto;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

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
function AjustarMapa({ pontos, chave }) {
  const map = useMap();
  const core = useMapsLibrary("core");
  const qtdAnterior = useRef(-1);
  const chaveAnterior = useRef(chave);
  useEffect(() => {
    if (!map || !core) return;
    // só reenquadra quando entra/sai ponto ou muda a `chave` (ex.: preparar impressão);
    // arrastar um marcador não mexe no zoom
    if (pontos.length === qtdAnterior.current && chave === chaveAnterior.current) return;
    qtdAnterior.current = pontos.length;
    chaveAnterior.current = chave;
    if (pontos.length === 1) {
      map.setCenter(latLng(pontos[0]));
      map.setZoom(16);
    } else if (pontos.length > 1) {
      const limites = new core.LatLngBounds();
      pontos.forEach((p) => limites.extend(latLng(p)));
      map.fitBounds(limites, 60);
    }
  }, [map, core, pontos, chave]);
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

/* ── Formulário de parada: endereço + nome + telefone + tempo, e só então "Incluir" ── */
function FormParada({ perto, onIncluir }) {
  const [endereco, setEndereco] = useState(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [minutos, setMinutos] = useState(0);
  const pronto = endereco && nome.trim();

  function incluir(e) {
    e.preventDefault();
    if (!pronto) return;
    onIncluir({ ...endereco, nome: nome.trim(), telefone: telefone.trim(), paradaMin: minutos });
    setEndereco(null);
    setNome("");
    setTelefone("");
    setMinutos(0);
  }

  const rotulo = "flex flex-col gap-1 text-[11px] font-medium text-neutral-500";
  return (
    <form onSubmit={incluir} className="grid grid-cols-12 gap-2 items-end">
      <div className={`${rotulo} col-span-12 lg:col-span-5`}>
        Endereço *
        {endereco ? (
          <div className="flex items-center gap-2 border border-neutral-200 rounded px-2.5 py-1.5 text-xs text-neutral-700 bg-neutral-50 font-normal">
            <span className="flex-1">{endereco.endereco}</span>
            <button type="button" title="Trocar endereço" onClick={() => setEndereco(null)} className="text-neutral-400 hover:text-primary-600">
              <Pencil size={13} />
            </button>
          </div>
        ) : (
          <BuscaEndereco perto={perto} onSelecionar={setEndereco} placeholder="Endereço da pessoa…" />
        )}
      </div>
      <label className={`${rotulo} col-span-12 sm:col-span-5 lg:col-span-3`}>
        Nome *
        <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Ana (câmera)" />
      </label>
      <label className={`${rotulo} col-span-6 sm:col-span-3 lg:col-span-2`}>
        Telefone
        <input type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(51) 99999-9999" />
      </label>
      <label className={`${rotulo} col-span-3 sm:col-span-2 lg:col-span-1`}>
        Parada (min)
        <input
          type="number"
          min={0}
          step={5}
          value={minutos}
          onChange={(e) => setMinutos(Math.max(0, Number(e.target.value) || 0))}
        />
      </label>
      <button type="submit" disabled={!pronto} className="btn-primary col-span-3 sm:col-span-2 lg:col-span-1 disabled:opacity-40">
        Incluir
      </button>
    </form>
  );
}

function PaginaRotas() {
  // partida e chegada são fixas; só a ordem das paradas (equipe) é otimizada
  const [roteiro, setRoteiro] = useState(lerRoteiroSalvo);
  const [sentido, setSentido] = useState("ida"); // "ida": partida → paradas → chegada | "volta": o inverso
  // ida: hora em que é preciso CHEGAR ao destino final (a saída é calculada de trás para frente)
  // volta: hora de SAÍDA do local de chegada (ex.: fim da diária)
  const [horarios, setHorarios] = useState(() => ({ ida: horaAtual(), volta: horaAtual() }));
  const [resultado, setResultado] = useState(null);
  const [calculando, setCalculando] = useState(false);
  const [erroRota, setErroRota] = useState(null); // { mensagem, assinatura, sentido }
  const idSeq = useRef(Date.now());
  const { partida, chegada, paradas } = roteiro;
  // Na volta, partida e chegada trocam de papel na tela: o cliente vira a partida e a
  // garagem a chegada. Os dados continuam guardados como "partida" (garagem) e "chegada" (cliente).
  const papelVisivel = (papel) =>
    sentido === "volta" && papel !== "parada" ? (papel === "partida" ? "chegada" : "partida") : papel;

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

  // Só a geometria (quais pontos e onde) dispara novo cálculo de rota; mudar nome,
  // telefone ou tempo de parada só refaz os horários, sem consultar o Google.
  const assinatura = vertices.map((v) => `${v.id}:${v.coords.join(",")}`).join("|");
  const verticesRef = useRef(vertices);
  verticesRef.current = vertices;

  // Aviso quando falta algo para calcular o sentido escolhido
  const faltando = !partida
    ? sentido === "volta"
      ? "Defina o local de chegada (garagem)."
      : "Defina o local de partida."
    : sentido === "volta" && !chegada
      ? "Defina o local de partida (cliente) para calcular a volta."
      : vertices.length < 2
        ? "Adicione endereços da equipe ou o local de chegada."
        : "";

  // O cálculo só roda sob demanda (botão "Calcular menor rota"), não a cada endereço
  // incluído: economiza consultas ao Google durante o preenchimento.
  const [pedido, setPedido] = useState(null); // { assinatura, sentido } do último cálculo pedido
  const calcular = () => setPedido({ assinatura, sentido });

  // Alternar ida/volta depois de já ter calculado estes mesmos endereços recalcula
  // sozinho: os tempos entre os pontos já estão em cache, só falta o trajeto.
  useEffect(() => {
    setPedido((p) => (p && p.assinatura === assinatura && p.sentido !== sentido ? { assinatura, sentido } : p));
  }, [assinatura, sentido]);

  useEffect(() => {
    if (!pedido) return;
    let cancelado = false;
    (async () => {
      setCalculando(true);
      setErroRota(null);
      try {
        const vertices = verticesRef.current;
        const coords = vertices.map((v) => v.coords);
        const iPartida = 0;
        const iChegada = vertices[vertices.length - 1]?.papel === "chegada" ? vertices.length - 1 : null;
        const matriz = await matrizDeCustos(coords);
        const pesos = matriz.durations;
        const extremos =
          pedido.sentido === "ida" ? { origem: iPartida, destino: iChegada } : { origem: iChegada, destino: iPartida };
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
        setResultado({ assinatura: pedido.assinatura, sentido: pedido.sentido, ordem, algoritmo, ...trajeto });
      } catch (e) {
        if (cancelado) return;
        setResultado(null);
        setErroRota({ mensagem: e.message, assinatura: pedido.assinatura, sentido: pedido.sentido });
      }
      setCalculando(false);
    })();
    return () => {
      cancelado = true;
    };
  }, [pedido]);

  // descarta resultado calculado para vértices ou sentido que já mudaram
  const rota = resultado?.assinatura === assinatura && resultado.sentido === sentido ? resultado : null;

  const erroAtual = erroRota?.assinatura === assinatura && erroRota.sentido === sentido ? erroRota.mensagem : "";
  const aviso = erroAtual
    ? { tipo: "erro", texto: erroAtual }
    : vertices.length === 0 || calculando || rota
      ? null
      : faltando
        ? { tipo: "alerta", texto: faltando }
        : resultado
          ? { tipo: "alerta", texto: "Os endereços mudaram desde o último cálculo. Clique em Calcular menor rota." }
          : { tipo: "info", texto: "Quando terminar de incluir os endereços, clique em Calcular menor rota." };

  // Horário de saída do motorista: na ida, calculado a partir da hora de chegada desejada
  // (tempo dirigindo + paradas da equipe antes do destino), arredondado para baixo
  // para nunca chegar atrasado; na volta, é a própria hora informada.
  const saidaMotorista = useMemo(() => {
    if (!rota) return null;
    const [h, m] = horarios[sentido].split(":").map(Number);
    const referencia = new Date();
    referencia.setHours(h || 0, m || 0, 0, 0);
    if (sentido === "volta") return referencia;
    const minutosParado = rota.ordem.slice(0, -1).reduce((acc, i) => acc + (vertices[i].paradaMin || 0), 0);
    const totalMs = rota.trechos.reduce((acc, t) => acc + t.duracao, 0) * 1000 + minutosParado * 60000;
    return new Date(Math.floor((referencia.getTime() - totalMs) / 60000) * 60000);
  }, [rota, vertices, horarios, sentido]);

  // Horário estimado de chegada em cada ponto; o tempo de parada só conta nas paradas da equipe
  const itinerario = useMemo(() => {
    if (!rota || !saidaMotorista) return vertices.map((v) => ({ v }));
    const relogio = new Date(saidaMotorista);
    return rota.ordem.map((idx, pos) => {
      const v = vertices[idx];
      const trecho = pos > 0 ? rota.trechos[pos - 1] : null;
      if (trecho) relogio.setTime(relogio.getTime() + trecho.duracao * 1000);
      const chegadaEm = new Date(relogio);
      if (v.papel === "parada") relogio.setTime(relogio.getTime() + (v.paradaMin || 0) * 60000);
      const ultimo = pos === rota.ordem.length - 1;
      return { v, pos, trecho, chegadaEm: pos > 0 ? chegadaEm : null, saidaEm: ultimo ? null : new Date(relogio) };
    });
  }, [rota, vertices, saidaMotorista]);

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
  const adicionarParada = (s) =>
    setRoteiro((r) => ({
      ...r,
      paradas: [...r.paradas, { ...novoPonto(s), nome: s.nome, telefone: s.telefone, paradaMin: s.paradaMin }],
    }));
  const editarParada = (id, campos) =>
    setRoteiro((r) => ({ ...r, paradas: r.paradas.map((p) => (p.id === id ? { ...p, ...campos } : p)) }));
  const atualizar = (fn) =>
    setRoteiro((r) => ({
      partida: r.partida && fn(r.partida),
      chegada: r.chegada && fn(r.chegada),
      paradas: r.paradas.map(fn).filter(Boolean),
    }));
  const mover = (id, coords) => atualizar((p) => (p.id === id ? { ...p, coords } : p));
  const remover = (id) => atualizar((p) => (p.id === id ? null : p));

  // ── Copiar roteiro (Google Maps com a rota inteira + Waze por parada) ──
  const [copiado, setCopiado] = useState(false);
  const linksMaps = useMemo(
    () => (rota ? linksGoogleMaps(rota.ordem.map((i) => vertices[i].coords)) : []),
    [rota, vertices]
  );

  function textoRoteiro() {
    const titulo =
      sentido === "ida"
        ? `ROTEIRO — IDA (chegar às ${horarios.ida})\nMotorista sai às ${fmtHora(saidaMotorista)}`
        : `ROTEIRO — VOLTA (saída às ${horarios.volta})`;
    const linhas = [titulo, `${fmtKm(total.m)} · ${fmtDuracao(total.d)} dirigindo`, ""];
    linhas.push(linksMaps.length > 1 ? "Google Maps (rota completa, em partes):" : "Google Maps (rota completa):");
    linksMaps.forEach((l, i) => linhas.push(linksMaps.length > 1 ? `${i + 1}) ${l}` : l));
    linhas.push("");
    itinerario.forEach(({ v, pos, chegadaEm, saidaEm }) => {
      const papel = papelVisivel(v.papel);
      const rotulo = papel === "partida" ? "PARTIDA" : papel === "chegada" ? "CHEGADA" : `${pos}.`;
      const horas = [chegadaEm && `chega ${fmtHora(chegadaEm)}`, saidaEm && `sai ${fmtHora(saidaEm)}`].filter(Boolean).join(" / ");
      const quem = v.nome ? ` ${v.nome}${v.telefone ? ` · ${v.telefone}` : ""}` : "";
      linhas.push(`${rotulo}${quem} — ${horas}`);
      linhas.push(`   ${v.endereco}`);
      if (pos > 0) linhas.push(`   Waze: ${linkWaze(v.coords)}`);
    });
    return linhas.join("\n");
  }

  async function copiarRoteiro() {
    await copiarTexto(textoRoteiro());
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  // ── Imprimir / PDF: ajusta o mapa à largura da folha A4 antes de abrir a impressão ──
  const [imprimindo, setImprimindo] = useState(false);
  useEffect(() => {
    if (!imprimindo) return;
    const tituloOriginal = document.title;
    document.title = `Roteiro ${sentido} ${new Date().toLocaleDateString("pt-BR").replaceAll("/", "-")}`;
    const fim = () => {
      document.title = tituloOriginal;
      setImprimindo(false);
    };
    window.addEventListener("afterprint", fim, { once: true });
    const t = setTimeout(() => window.print(), 1500); // tempo para o mapa redesenhar no novo tamanho
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", fim);
    };
  }, [imprimindo, sentido]);

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
            className="text-xs text-neutral-500 hover:text-red-600 print:hidden"
          >
            Limpar tudo
          </button>
        )}
      </div>

      <div className="page-body space-y-4">
        <div className="card p-4 space-y-4 print:hidden">
          <div className="grid gap-4 md:grid-cols-2">
            {(sentido === "volta" ? ["chegada", "partida"] : ["partida", "chegada"]).map((chave, i) => (
              <LocalFixo
                key={chave}
                titulo={i === 0 ? "Local de partida" : "Local de chegada"}
                descricao={chave === "partida" ? "ex.: garagem" : "ex.: cliente"}
                papel={papelVisivel(chave)}
                ponto={roteiro[chave]}
                perto={perto}
                onDefinir={(s) => definir(chave, s)}
                onLimpar={() => setRoteiro((r) => ({ ...r, [chave]: null }))}
              />
            ))}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-neutral-600">
              <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle" style={{ background: CORES.parada }} />
              Paradas <span className="font-normal text-neutral-400">— pessoas da equipe; a ordem é otimizada</span>
            </p>
            <FormParada perto={perto} onIncluir={adicionarParada} />
          </div>

          <div className="flex flex-wrap items-end gap-4 text-xs font-medium text-neutral-600 border-t border-neutral-100 pt-3">
            <div className="flex flex-col gap-1">
              Trajeto
              <div className="inline-flex rounded border border-neutral-300 overflow-hidden">
                {[
                  ["ida", "Ida"],
                  ["volta", "Volta (inverte partida e chegada)"],
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
              {sentido === "ida" ? "Chegar ao destino às" : "Sair do local de partida às"}
              <input
                type="time"
                value={horarios[sentido]}
                onChange={(e) => setHorarios((h) => ({ ...h, [sentido]: e.target.value }))}
              />
            </label>
            <button
              type="button"
              onClick={calcular}
              disabled={Boolean(faltando) || calculando}
              className="btn-primary ml-auto inline-flex items-center gap-1.5 disabled:opacity-40"
              title={faltando || "Calcula a ordem de menor tempo e o trajeto"}
            >
              {calculando && <Loader2 size={14} className="animate-spin" />}
              Calcular menor rota
            </button>
          </div>
        </div>

        <div className="card overflow-hidden relative z-0" style={imprimindo ? { width: 716 } : undefined}>
          <Map
            mapId={GOOGLE_MAP_ID}
            renderingType="RASTER"
            defaultCenter={latLng(CENTRO_PADRAO)}
            defaultZoom={12}
            gestureHandling="greedy"
            streetViewControl={false}
            style={{ height: imprimindo ? 520 : 440 }}
          >
            <AjustarMapa pontos={coordsMapa} chave={imprimindo} />
            {vertices.map((v) => (
              <AdvancedMarker
                key={v.id}
                position={latLng(v.coords)}
                title={v.nome ? `${v.nome} — ${v.endereco}` : v.endereco}
                draggable
                onDragEnd={(e) => e.latLng && mover(v.id, [e.latLng.lat(), e.latLng.lng()])}
              >
                <MarcadorNumerado
                  papel={papelVisivel(v.papel)}
                  rotulo={
                    papelVisivel(v.papel) === "partida"
                      ? "P"
                      : papelVisivel(v.papel) === "chegada"
                        ? "C"
                        : (posicaoNaRota[v.id] ?? "•")
                  }
                />
              </AdvancedMarker>
            ))}
            {rota && <Polyline path={caminho} strokeColor="#2563eb" strokeWeight={5} strokeOpacity={0.8} />}
          </Map>
        </div>

        {aviso && (
          <div
            className={`print:hidden flex items-start gap-2 text-xs rounded-md px-3 py-2 border ${
              aviso.tipo === "erro"
                ? "text-red-700 bg-red-50 border-red-200"
                : aviso.tipo === "alerta"
                  ? "text-amber-700 bg-amber-50 border-amber-200"
                  : "text-primary-700 bg-primary-50 border-primary-200"
            }`}
          >
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            {aviso.texto}
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
              {linksMaps.length > 0 && (
                <span className="hidden print:inline text-xs">
                  Rota completa no Google Maps:{" "}
                  {linksMaps.map((l, i) => (
                    <a key={l} href={l} className="text-primary-600 underline mr-1">
                      {linksMaps.length > 1 ? `parte ${i + 1}` : "abrir"}
                    </a>
                  ))}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
              {calculando && <Loader2 size={14} className="animate-spin" />}
              {rota && total && (
                <span>
                  {fmtKm(total.m)} · {fmtDuracao(total.d)} dirigindo
                  <span className="print:hidden"> · {rota.algoritmo}</span>
                </span>
              )}
              {rota && (
                <div className="flex items-center gap-2 print:hidden">
                  <button
                    type="button"
                    onClick={copiarRoteiro}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                    title="Copia o roteiro com links do Google Maps e do Waze para colar no celular"
                  >
                    {copiado ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    {copiado ? "Copiado!" : "Copiar roteiro"}
                  </button>
                  <a
                    href={linksMaps[0]}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                    title="Abrir a rota completa no Google Maps"
                  >
                    <Navigation size={14} /> Google Maps
                  </a>
                  <button
                    type="button"
                    onClick={() => setImprimindo(true)}
                    disabled={imprimindo}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                    title="Imprimir ou salvar como PDF"
                  >
                    {imprimindo ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />} Imprimir / PDF
                  </button>
                </div>
              )}
            </div>
          </div>

          {vertices.length === 0 ? (
            <p className="px-4 py-6 text-xs text-neutral-400 text-center">
              Defina o local de partida e o de chegada e adicione os endereços da equipe. A ordem das paradas é
              otimizada automaticamente.
            </p>
          ) : (
            <div className="overflow-x-auto roteiro-tabela-area">
              <table className="w-full text-xs roteiro-tabela">
                <thead className="text-neutral-500 bg-neutral-50">
                  <tr>
                    <th className="px-3 py-2 text-left w-8">#</th>
                    <th className="px-3 py-2 text-left col-nome">Nome</th>
                    <th className="px-3 py-2 text-left col-endereco">Endereço</th>
                    <th className="px-3 py-2 text-right whitespace-nowrap">Parada (min)</th>
                    <th className="px-3 py-2 text-right whitespace-nowrap">Trecho</th>
                    <th className="px-3 py-2 text-right whitespace-nowrap">Chega</th>
                    <th className="px-3 py-2 text-right whitespace-nowrap">Sai</th>
                    <th className="px-3 py-2 text-left whitespace-nowrap">Navegar</th>
                    <th className="px-3 py-2 w-8 print:hidden" />
                  </tr>
                </thead>
                <tbody>
                  {itinerario.map(({ v, pos, trecho, chegadaEm, saidaEm }) => (
                    <tr key={v.id} className="border-t border-neutral-100 align-top">
                      <td className="px-3 py-2 font-semibold text-neutral-700">
                        {v.papel === "parada" ? (pos ?? "•") : papelVisivel(v.papel) === "partida" ? "P" : "C"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap quebra col-nome">
                        {rotuloPapel[papelVisivel(v.papel)] ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${classePapel[papelVisivel(v.papel)]}`}
                          >
                            {rotuloPapel[papelVisivel(v.papel)]}
                          </span>
                        ) : (
                          <>
                            <div className="font-semibold text-neutral-800">{v.nome || "—"}</div>
                            {v.telefone && (
                              <a href={`tel:${v.telefone.replace(/[^\d+]/g, "")}`} className="text-[11px] text-neutral-500">
                                {v.telefone}
                              </a>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2 text-neutral-700 quebra col-endereco">{v.endereco}</td>
                      <td className="px-3 py-2 text-right">
                        {v.papel === "parada" && <span className="hidden print:inline">{v.paradaMin || 0}</span>}
                        {v.papel === "parada" ? (
                          <input
                            type="number"
                            min={0}
                            step={5}
                            value={v.paradaMin || 0}
                            onChange={(e) => editarParada(v.id, { paradaMin: Math.max(0, Number(e.target.value) || 0) })}
                            className="w-16 text-right print:hidden"
                            title="Minutos parado neste endereço"
                          />
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-neutral-500 whitespace-nowrap">
                        {trecho ? `${fmtKm(trecho.distancia)} · ${fmtDuracao(trecho.duracao)}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-neutral-800 whitespace-nowrap">
                        {chegadaEm ? fmtHora(chegadaEm) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-neutral-800 whitespace-nowrap">
                        {saidaEm ? fmtHora(saidaEm) : "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {pos > 0 && (
                          <a
                            href={linkWaze(v.coords)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary-600 underline"
                            title="Navegar até este endereço no Waze"
                          >
                            Abrir no Waze
                          </a>
                        )}
                      </td>
                      <td className="px-3 py-2 print:hidden">
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
            </div>
          )}
        </div>
      </div>
    </>
  );
}
