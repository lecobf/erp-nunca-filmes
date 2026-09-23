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
const PHOTON_URL = "https://photon.komoot.io/api/";
const OSRM_URL = "https://router.project-osrm.org";

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

async function chamarOsrm(caminho) {
  let data;
  try {
    const res = await fetch(`${OSRM_URL}${caminho}`);
    data = await res.json();
  } catch {
    throw new Error("Serviço de rotas indisponível. Tente novamente em instantes.");
  }
  if (data.code !== "Ok") throw new Error(`Serviço de rotas recusou a consulta: ${data.message || data.code}`);
  return data;
}

/**
 * Matriz de adjacência do grafo dirigido: durations[i][j] (s) e distances[i][j] (m).
 *
 * O perfil "driving" do OSRM só percorre ruas no sentido permitido (mão/contramão,
 * tags oneway do OpenStreetMap), então durations[i][j] ≠ durations[j][i] em geral.
 * Quando não existe caminho respeitando o sentido das vias, o OSRM devolve null:
 * aqui isso vira Infinity = aresta inexistente.
 *
 * Não há fallback por linha reta: ele ignoraria a mão das ruas e criaria
 * arestas que não existem.
 */
export async function matrizDeCustos(pontos) {
  const data = await chamarOsrm(
    `/table/v1/driving/${coordsOsrm(pontos)}?annotations=duration,distance`
  );
  const semAresta = (m) => m.map((linha) => linha.map((v) => (v == null ? Infinity : v)));
  return { durations: semAresta(data.durations), distances: semAresta(data.distances) };
}

/**
 * Trajeto pelas ruas, respeitando a mão de direção, passando pelos pontos na ordem dada.
 * Retorna a linha a desenhar ([lat, lon][]) e duração/distância de cada trecho.
 */
export async function tracarRota(pontos) {
  const data = await chamarOsrm(
    `/route/v1/driving/${coordsOsrm(pontos)}?overview=full&geometries=geojson`
  );
  const rota = data.routes[0];
  return {
    linha: rota.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
    trechos: rota.legs.map((l) => ({ duracao: l.duration, distancia: l.distance })),
  };
}
