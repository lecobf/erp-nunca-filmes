/**
 * Roteamento do módulo de Rotas — Google Routes API via backend (/rotas/*),
 * com a chave GOOGLE_MAPS_API_KEY só no servidor. Sempre o caminho mais rápido
 * sem trânsito, respeitando a mão de direção das ruas.
 *
 * O mapa e o autocomplete de endereços (Google Maps JavaScript API + Places)
 * ficam na página, com a chave de navegador VITE_GOOGLE_MAPS_API_KEY.
 */
import { API_BASE_URL } from "../api/config";

const TEMPO_LIMITE_MS = 30000;

async function chamarBackend(caminho, corpo) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${caminho}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
  } catch (e) {
    throw new Error(
      e.name === "TimeoutError"
        ? "O servidor do ERP não respondeu. Verifique se o backend está rodando."
        : "Não foi possível falar com o servidor do ERP."
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Falha no cálculo de rotas (${res.status})`);
  return data;
}

/**
 * Arestas já consultadas nesta sessão: "lat,lon>lat,lon" → { duracao, distancia } | null.
 * Só em memória (some ao recarregar a página). Adicionar um endereço custa só as
 * arestas que o envolvem, em vez da matriz inteira de novo.
 */
const cacheArestas = new Map();
const chavePonto = ([lat, lon]) => `${lat.toFixed(6)},${lon.toFixed(6)}`;
const chaveAresta = (a, b) => `${chavePonto(a)}>${chavePonto(b)}`;

async function consultarArestas(origens, destinos) {
  if (!origens.length || !destinos.length) return;
  const matriz = await chamarBackend("/rotas/matriz", { origens, destinos });
  origens.forEach((o, i) => destinos.forEach((d, j) => cacheArestas.set(chaveAresta(o, d), matriz[i][j])));
}

/**
 * Matriz de adjacência do grafo dirigido: durations[i][j] (s) e distances[i][j] (m)
 * do caminho mais rápido de i até j. Em geral [i][j] ≠ [j][i] por causa das mãos
 * únicas. Sem caminho respeitando o sentido das vias → Infinity = aresta inexistente.
 */
export async function matrizDeCustos(pontos) {
  // "conhecidos": pontos cujas arestas entre si já estão todas no cache
  const conhecidos = [];
  const novos = [];
  for (const p of pontos) {
    const completo = conhecidos.every((c) => cacheArestas.has(chaveAresta(p, c)) && cacheArestas.has(chaveAresta(c, p)));
    (completo ? conhecidos : novos).push(p);
  }
  await consultarArestas(novos, pontos); // novos → todos
  await consultarArestas(conhecidos, novos); // conhecidos → novos

  const aresta = (a, b) => (chavePonto(a) === chavePonto(b) ? { duracao: 0, distancia: 0 } : cacheArestas.get(chaveAresta(a, b)));
  const valor = (a, b, campo) => aresta(a, b)?.[campo] ?? Infinity;
  return {
    durations: pontos.map((a) => pontos.map((b) => valor(a, b, "duracao"))),
    distances: pontos.map((a) => pontos.map((b) => valor(a, b, "distancia"))),
  };
}

/** Decodifica polyline do Google (precisão 5) em [lat, lon][]. */
function decodificarPolyline(str) {
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
    coords.push([lat / 1e5, lon / 1e5]);
  }
  return coords;
}

/**
 * Trajeto pelas ruas, respeitando a mão de direção, passando pelos pontos na ordem dada.
 * Retorna a linha a desenhar ([lat, lon][]) e duração/distância de cada trecho.
 */
export async function tracarRota(pontos) {
  const data = await chamarBackend("/rotas/trajeto", { pontos });
  return { linha: decodificarPolyline(data.polyline), trechos: data.trechos };
}
