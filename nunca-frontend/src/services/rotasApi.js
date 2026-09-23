/**
 * Provedores externos do módulo de Rotas (gratuitos, sem chave de API):
 *
 *  - Photon (komoot) — geocodificação com autocomplete sobre dados OpenStreetMap
 *  - OSRM            — matriz de tempos/distâncias e geometria do trajeto
 *
 * O Waze não oferece API pública de geocodificação/roteamento. Para trânsito em
 * tempo real, basta trocar as funções abaixo por Google Maps, Mapbox, TomTom ou
 * HERE mantendo o mesmo formato de retorno.
 *
 * Os servidores públicos têm limites de uso — em produção, hospedar Photon/OSRM
 * próprios ou contratar um provedor.
 */
import { haversine } from "../utils/rotas/grafo";

const PHOTON_URL = "https://photon.komoot.io/api/";
const OSRM_URL = "https://router.project-osrm.org";
const VELOCIDADE_FALLBACK_MS = 25 / 3.6; // 25 km/h médio urbano

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

/** Sugestões de endereço para o autocomplete. */
export async function buscarEnderecos(texto, { perto, signal } = {}) {
  const params = new URLSearchParams({ q: texto, limit: "6" });
  if (perto) {
    params.set("lat", String(perto[0]));
    params.set("lon", String(perto[1]));
  }
  const res = await fetch(`${PHOTON_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`Geocodificação falhou (${res.status})`);
  const data = await res.json();
  return (data.features || []).map((f) => ({
    id: `${f.properties.osm_type}${f.properties.osm_id}`,
    endereco: formatarEndereco(f.properties),
    coords: [f.geometry.coordinates[1], f.geometry.coordinates[0]], // [lat, lon]
  }));
}

const coordsOsrm = (pontos) => pontos.map(([lat, lon]) => `${lon},${lat}`).join(";");

/**
 * Matriz de custos do grafo completo: durations[i][j] (s) e distances[i][j] (m).
 * Se o OSRM não responder, estima por linha reta a velocidade média.
 */
export async function matrizDeCustos(pontos) {
  try {
    const res = await fetch(
      `${OSRM_URL}/table/v1/driving/${coordsOsrm(pontos)}?annotations=duration,distance`
    );
    const data = await res.json();
    if (data.code !== "Ok") throw new Error(data.message || data.code);
    return { durations: data.durations, distances: data.distances, estimado: false };
  } catch {
    const distances = pontos.map((a) => pontos.map((b) => haversine(a, b) * 1.3));
    const durations = distances.map((linha) => linha.map((d) => d / VELOCIDADE_FALLBACK_MS));
    return { durations, distances, estimado: true };
  }
}

/**
 * Trajeto pelas ruas passando pelos pontos na ordem dada.
 * Retorna a linha a desenhar ([lat, lon][]) e duração/distância de cada trecho.
 */
export async function tracarRota(pontos) {
  try {
    const res = await fetch(
      `${OSRM_URL}/route/v1/driving/${coordsOsrm(pontos)}?overview=full&geometries=geojson`
    );
    const data = await res.json();
    if (data.code !== "Ok") throw new Error(data.message || data.code);
    const rota = data.routes[0];
    return {
      linha: rota.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
      trechos: rota.legs.map((l) => ({ duracao: l.duration, distancia: l.distance })),
      estimado: false,
    };
  } catch {
    const trechos = pontos.slice(1).map((p, i) => {
      const distancia = haversine(pontos[i], p) * 1.3;
      return { duracao: distancia / VELOCIDADE_FALLBACK_MS, distancia };
    });
    return { linha: pontos, trechos, estimado: true };
  }
}
