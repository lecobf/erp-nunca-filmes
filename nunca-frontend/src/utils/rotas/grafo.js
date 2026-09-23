/**
 * Teoria dos grafos aplicada ao roteiro de visitas.
 *
 * Modelo:
 *  - Cada endereço é um VÉRTICE.
 *  - Entre todo par de vértices existe uma ARESTA dirigida cujo peso é o tempo
 *    de viagem pelas ruas (matriz de custos vinda do OSRM, que internamente roda
 *    um algoritmo de caminho mínimo — Dijkstra/Contraction Hierarchies — sobre o
 *    grafo viário do OpenStreetMap).
 *  - O grafo resultante é completo e assimétrico (ida ≠ volta por causa de
 *    mão única).
 *
 * Problema: encontrar a ordem de visita de menor custo total que parte do
 * primeiro endereço e passa por todos os outros exatamente uma vez
 * (Caixeiro Viajante — TSP, caminho aberto ou ciclo).
 *
 *  - n ≤ LIMITE_EXATO  → Held-Karp (programação dinâmica, ótimo garantido, O(n²·2ⁿ))
 *  - n >  LIMITE_EXATO → Vizinho mais próximo + 2-opt (heurística, O(n³) por passada)
 */

export const LIMITE_EXATO = 12;

/** Custo total de uma ordem de visita. */
export function custoRota(matriz, ordem, voltarAoInicio = false) {
  let total = 0;
  for (let i = 0; i < ordem.length - 1; i++) total += matriz[ordem[i]][ordem[i + 1]];
  if (voltarAoInicio && ordem.length > 1) total += matriz[ordem[ordem.length - 1]][ordem[0]];
  return total;
}

/**
 * Held-Karp: dp[mask][j] = menor custo saindo de 0, visitando exatamente os
 * vértices de `mask` e terminando em j.
 */
export function heldKarp(matriz, voltarAoInicio = false) {
  const n = matriz.length;
  if (n <= 2) return [...Array(n).keys()];

  const total = 1 << n;
  const dp = Array.from({ length: total }, () => new Float64Array(n).fill(Infinity));
  const pai = Array.from({ length: total }, () => new Int8Array(n).fill(-1));
  dp[1][0] = 0;

  for (let mask = 1; mask < total; mask += 2) {
    // só máscaras que contêm o vértice inicial (bit 0)
    for (let j = 0; j < n; j++) {
      const atual = dp[mask][j];
      if (atual === Infinity) continue;
      for (let k = 1; k < n; k++) {
        if (mask & (1 << k)) continue;
        const prox = mask | (1 << k);
        const custo = atual + matriz[j][k];
        if (custo < dp[prox][k]) {
          dp[prox][k] = custo;
          pai[prox][k] = j;
        }
      }
    }
  }

  const cheio = total - 1;
  let melhor = Infinity;
  let fim = -1;
  for (let j = 1; j < n; j++) {
    const custo = dp[cheio][j] + (voltarAoInicio ? matriz[j][0] : 0);
    if (custo < melhor) {
      melhor = custo;
      fim = j;
    }
  }

  const ordem = [];
  let mask = cheio;
  let v = fim;
  while (v !== -1) {
    ordem.push(v);
    const anterior = pai[mask][v];
    mask &= ~(1 << v);
    v = anterior;
  }
  return ordem.reverse();
}

/** Heurística gulosa: sempre vai para o vértice não visitado mais próximo. */
export function vizinhoMaisProximo(matriz) {
  const n = matriz.length;
  const visitado = new Array(n).fill(false);
  const ordem = [0];
  visitado[0] = true;
  for (let passo = 1; passo < n; passo++) {
    const atual = ordem[ordem.length - 1];
    let melhor = -1;
    for (let k = 0; k < n; k++) {
      if (!visitado[k] && (melhor === -1 || matriz[atual][k] < matriz[atual][melhor])) melhor = k;
    }
    visitado[melhor] = true;
    ordem.push(melhor);
  }
  return ordem;
}

/**
 * 2-opt: inverte trechos da rota enquanto isso reduzir o custo.
 * Recalcula o custo completo a cada troca para funcionar com matriz assimétrica.
 * O vértice 0 (partida) nunca sai da primeira posição.
 */
export function doisOpt(matriz, ordemInicial, voltarAoInicio = false) {
  let ordem = [...ordemInicial];
  let melhorCusto = custoRota(matriz, ordem, voltarAoInicio);
  let melhorou = true;
  while (melhorou) {
    melhorou = false;
    for (let i = 1; i < ordem.length - 1; i++) {
      for (let k = i + 1; k < ordem.length; k++) {
        const candidata = [...ordem.slice(0, i), ...ordem.slice(i, k + 1).reverse(), ...ordem.slice(k + 1)];
        const custo = custoRota(matriz, candidata, voltarAoInicio);
        if (custo + 1e-9 < melhorCusto) {
          ordem = candidata;
          melhorCusto = custo;
          melhorou = true;
        }
      }
    }
  }
  return ordem;
}

/**
 * Ponto de entrada: devolve a ordem de visita (índices da matriz, começando em 0)
 * e o algoritmo usado.
 */
export function menorRoteiro(matriz, { voltarAoInicio = false } = {}) {
  const n = matriz.length;
  if (n <= 2) return { ordem: [...Array(n).keys()], algoritmo: "trivial" };
  if (n <= LIMITE_EXATO) return { ordem: heldKarp(matriz, voltarAoInicio), algoritmo: "Held-Karp (ótimo)" };
  const inicial = vizinhoMaisProximo(matriz);
  return { ordem: doisOpt(matriz, inicial, voltarAoInicio), algoritmo: "Vizinho mais próximo + 2-opt" };
}

/** Distância em linha reta (metros) — usada como fallback se o roteador falhar. */
export function haversine([lat1, lon1], [lat2, lon2]) {
  const R = 6371000;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
