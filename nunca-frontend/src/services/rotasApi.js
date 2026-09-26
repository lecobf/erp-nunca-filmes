/**
 * Provedores externos do módulo de Rotas (gratuitos, sem chave de API):
 *
 *  - HERE (via backend /geocodificacao, chave HERE_API_KEY no .env do servidor) —
 *    autocomplete de endereços com números de casa; usado quando configurado
 *  - Photon (komoot) — autocomplete sobre OpenStreetMap, usado sem chave HERE
 *  - Valhalla (FOSSGIS) — matriz de tempos/distâncias e geometria do trajeto,
 *                        otimizando por menor tempo ou por menor distância
 *
 * O Waze não oferece API pública de geocodificação/roteamento. Para trânsito em
 * tempo real, basta trocar as funções abaixo por Google Maps, Mapbox, TomTom ou
 * HERE mantendo o mesmo formato de retorno.
 *
 * Os servidores públicos têm limites de uso — em produção, hospedar Photon/Valhalla
 * próprios ou contratar um provedor.
 */
import { API_BASE_URL } from "../api/config";

const PHOTON_URL = "https://photon.komoot.io/api/";
const VALHALLA_URL = "https://valhalla1.openstreetmap.de";

function formatarEndereco(p) {
  const rua = [p.street || p.name, p.housenumber].filter(Boolean).join(", ");
  const partes = [
    rua,
    p.street && p.name && p.name !== p.street ? p.name : null,
    p.district || p.locality,
    p.city,
    p.state,
    p.postcode,
  ].filter(Boolean);
  return [...new Set(partes)].join(" - ");
}

const BBOX_BRASIL = "-74.1,-33.9,-34.7,5.4"; // lon mín, lat mín, lon máx, lat máx

async function consultarPhoton(q, perto, signal) {
  const params = new URLSearchParams({ q, limit: "8", bbox: BBOX_BRASIL });
  if (perto) {
    params.set("lat", String(perto[0]));
    params.set("lon", String(perto[1]));
  }
  const res = await fetch(`${PHOTON_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`Geocodificação falhou (${res.status})`);
  const data = await res.json();
  return data.features || [];
}

/** "Rua X, 155" → { rua: "Rua X", numero: "155" } */
function separarNumero(texto) {
  const m = texto.match(/^(.*\D)[\s,]+(\d{1,6})\s*$/);
  return m ? { rua: m[1].replace(/[\s,]+$/, ""), numero: m[2] } : { rua: texto, numero: null };
}

const distancia2 = ([a, b], [c, d]) => (a - c) ** 2 + ((b - d) * Math.cos((a * Math.PI) / 180)) ** 2;

/**
 * Sugestões de endereço para o autocomplete.
 *
 * No Brasil o OpenStreetMap muitas vezes não tem o número das casas. Quando o
 * texto termina em número, além da busca exata também buscamos só a rua e
 * oferecemos cada trecho dela com o número digitado, marcado como `aproximado`
 * (o usuário ajusta arrastando o marcador no mapa). Resultados ordenados pela
 * proximidade de `perto`.
 */
async function buscarPhoton(texto, { perto, signal } = {}) {
  const { rua, numero } = separarNumero(texto);
  const [exatos, ruas] = await Promise.all([
    consultarPhoton(texto, perto, signal),
    numero ? consultarPhoton(rua, perto, signal) : Promise.resolve([]),
  ]);

  const converter = (f, extra = {}) => ({
    id: `${f.properties.osm_type}${f.properties.osm_id}`,
    endereco: formatarEndereco({ ...f.properties, ...extra }),
    coords: [f.geometry.coordinates[1], f.geometry.coordinates[0]], // [lat, lon]
    aproximado: Boolean(extra.housenumber),
  });

  if (!numero) return exatos.map((f) => converter(f));

  const sugestoes = [
    ...exatos.filter((f) => String(f.properties.housenumber || "").startsWith(numero)).map((f) => converter(f)),
    ...ruas.filter((f) => f.properties.type === "street").map((f) => converter(f, { housenumber: numero })),
  ];
  const unicas = [...new Map(sugestoes.map((s) => [s.endereco, s])).values()];
  if (perto) unicas.sort((x, y) => distancia2(x.coords, perto) - distancia2(y.coords, perto));
  return unicas.slice(0, 8);
}

async function chamarBackend(caminho, signal) {
  const res = await fetch(`${API_BASE_URL}${caminho}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Falha na busca de endereços (${res.status})`);
  return data;
}

let hereDisponivel = null; // Promise<boolean>, consultada uma vez por carregamento

/** true quando o backend tem chave HERE configurada. */
export function usaHere() {
  if (!hereDisponivel) {
    hereDisponivel = chamarBackend("/geocodificacao/status")
      .then((d) => Boolean(d.here))
      .catch(() => {
        hereDisponivel = null; // tenta de novo na próxima busca
        return false;
      });
  }
  return hereDisponivel;
}

/** Sugestões de endereço: HERE se configurado no backend, senão Photon. */
export async function buscarEnderecos(texto, { perto, signal } = {}) {
  if (!(await usaHere())) return buscarPhoton(texto, { perto, signal });
  const params = new URLSearchParams({ q: texto });
  if (perto) {
    params.set("lat", String(perto[0]));
    params.set("lon", String(perto[1]));
  }
  return chamarBackend(`/geocodificacao/sugestoes?${params}`, signal);
}

/**
 * Critério de custo das arestas:
 *  - "tempo":     caminho mais rápido entre dois endereços
 *  - "distancia": caminho mais curto em km (costing "shortest" do Valhalla)
 * Em ambos o perfil "auto" só percorre ruas no sentido permitido (ignore_oneways
 * fica desligado), então a mão de direção é sempre respeitada.
 */
function parametrosCusto(criterio) {
  return {
    costing: "auto",
    costing_options: { auto: criterio === "distancia" ? { shortest: true } : {} },
  };
}

const locais = (pontos) => pontos.map(([lat, lon]) => ({ lat, lon }));

async function chamarValhalla(endpoint, corpo) {
  let res;
  let data;
  try {
    res = await fetch(`${VALHALLA_URL}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    data = await res.json();
  } catch {
    throw new Error("Serviço de rotas indisponível. Tente novamente em instantes.");
  }
  if (!res.ok || data.error) throw new Error(`Serviço de rotas recusou a consulta: ${data.error || res.status}`);
  return data;
}

/** Decodifica polyline com precisão 6 (formato do Valhalla) em [lat, lon][]. */
function decodificarPolyline6(str) {
  const coords = [];
  let i = 0;
  let lat = 0;
  let lon = 0;
  const proximo = () => {
    let resultado = 0;
    let shift = 0;
    let b;
    do {
      b = str.charCodeAt(i++) - 63;
      resultado |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    return resultado & 1 ? ~(resultado >> 1) : resultado >> 1;
  };
  while (i < str.length) {
    lat += proximo();
    lon += proximo();
    coords.push([lat / 1e6, lon / 1e6]);
  }
  return coords;
}

/**
 * Matriz de adjacência do grafo dirigido: durations[i][j] (s) e distances[i][j] (m)
 * do melhor caminho de i até j segundo o critério escolhido. Em geral
 * [i][j] ≠ [j][i] por causa das mãos únicas.
 * Sem caminho respeitando o sentido das vias → Infinity = aresta inexistente.
 *
 * Não há fallback por linha reta: ele ignoraria a mão das ruas e criaria
 * arestas que não existem.
 */
export async function matrizDeCustos(pontos, criterio = "tempo") {
  const data = await chamarValhalla("sources_to_targets", {
    sources: locais(pontos),
    targets: locais(pontos),
    ...parametrosCusto(criterio),
  });
  const valor = (v, fator = 1) => (v == null ? Infinity : v * fator);
  return {
    durations: data.sources_to_targets.map((linha) => linha.map((c) => valor(c.time))),
    distances: data.sources_to_targets.map((linha) => linha.map((c) => valor(c.distance, 1000))), // km → m
  };
}

/**
 * Trajeto pelas ruas, respeitando a mão de direção, passando pelos pontos na ordem dada.
 * Retorna a linha a desenhar ([lat, lon][]) e duração/distância de cada trecho.
 */
export async function tracarRota(pontos, criterio = "tempo") {
  const data = await chamarValhalla("route", {
    locations: locais(pontos).map((l) => ({ ...l, type: "break" })),
    ...parametrosCusto(criterio),
    directions_type: "none",
  });
  const legs = data.trip.legs;
  return {
    linha: legs.flatMap((l) => decodificarPolyline6(l.shape)),
    trechos: legs.map((l) => ({ duracao: l.summary.time, distancia: l.summary.length * 1000 })),
  };
}
