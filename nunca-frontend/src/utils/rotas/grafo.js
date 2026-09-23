/**
 * Teoria dos grafos aplicada ao roteiro de visitas.
 *
 * Modelo:
 *  - Cada endereço é um VÉRTICE.
 *  - Existe uma ARESTA dirigida u → v somente se há caminho de carro de u até v
 *    respeitando a mão de direção das ruas. O peso é o custo do menor caminho
 *    de u até v — em segundos ou em metros, conforme o critério escolhido —
 *    calculado pelo roteador (Valhalla) sobre o grafo viário dirigido do
 *    OpenStreetMap. Os demais caminhos entre u e v são dominados por esse.
 *  - O grafo é dirigido e assimétrico: ida ≠ volta por causa das mãos únicas.
 *    Ausência de aresta = peso Infinity; nenhum algoritmo abaixo usa uma
 *    aresta inexistente.
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
 * vértices de `mask` e terminando em j. Retorna null se não houver roteiro viável.
 */
export function heldKarp(matriz, voltarAoInicio = false) {
  const n = matriz.length;
  if (n <= 2) return custoRota(matriz, [...Array(n).keys()], voltarAoInicio) < Infinity ? [...Array(n).keys()] : null;

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

  if (melhor === Infinity) return null;

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
 * e o algoritmo usado. `ordem` é null quando não existe roteiro que passe por
 * todos os vértices usando apenas arestas existentes.
 */
export function menorRoteiro(matriz, { voltarAoInicio = false } = {}) {
  const n = matriz.length;
  if (n <= LIMITE_EXATO) return { ordem: heldKarp(matriz, voltarAoInicio), algoritmo: "Held-Karp (ótimo)" };
  const ordem = doisOpt(matriz, vizinhoMaisProximo(matriz), voltarAoInicio);
  const viavel = custoRota(matriz, ordem, voltarAoInicio) < Infinity;
  return { ordem: viavel ? ordem : null, algoritmo: "Vizinho mais próximo + 2-opt" };
}

/** Vértices sem aresta de entrada ou de saída (inalcançáveis pela mão das ruas). */
export function verticesIsolados(matriz) {
  const n = matriz.length;
  const isolados = [];
  for (let v = 0; v < n; v++) {
    let entra = false;
    let sai = false;
    for (let u = 0; u < n; u++) {
      if (u === v) continue;
      if (matriz[u][v] < Infinity) entra = true;
      if (matriz[v][u] < Infinity) sai = true;
    }
    if (!entra || !sai) isolados.push(v);
  }
  return isolados;
}
