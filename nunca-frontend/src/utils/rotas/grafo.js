/**
 * Teoria dos grafos aplicada ao roteiro de visitas.
 *
 * Modelo:
 *  - Cada endereço é um VÉRTICE.
 *  - Existe uma ARESTA dirigida u → v somente se há caminho de carro de u até v
 *    respeitando a mão de direção das ruas. O peso é o tempo do caminho mais
 *    rápido de u até v (sem trânsito), calculado pelo Google Routes sobre o
 *    grafo viário dirigido. Os demais caminhos entre u e v são dominados por esse.
 *  - O grafo é dirigido e assimétrico: ida ≠ volta por causa das mãos únicas.
 *    Ausência de aresta = peso Infinity; nenhum algoritmo abaixo usa uma
 *    aresta inexistente.
 *
 * Problema: menor caminho que sai de um vértice ORIGEM fixo, passa por todos os
 * INTERMEDIÁRIOS exatamente uma vez, em qualquer ordem, e termina num vértice
 * DESTINO fixo (ou em qualquer intermediário, se não houver destino).
 * É o Caixeiro Viajante de caminho com extremos fixos: só a ordem dos
 * intermediários é otimizada.
 *
 *  - até LIMITE_EXATO intermediários → Held-Karp (programação dinâmica, ótimo
 *    garantido, O(k²·2ᵏ))
 *  - acima → Vizinho mais próximo + 2-opt (heurística)
 *
 * Ida e volta são problemas diferentes (garagem → equipe → cliente e
 * cliente → equipe → garagem): com mãos únicas, a melhor ordem da volta não é
 * necessariamente a da ida invertida.
 */

export const LIMITE_EXATO = 12;

/** Custo total de uma sequência de vértices. */
export function custoRota(matriz, ordem) {
  let total = 0;
  for (let i = 0; i < ordem.length - 1; i++) total += matriz[ordem[i]][ordem[i + 1]];
  return total;
}

/**
 * Held-Karp com extremos fixos. dp[mask][j] = menor custo saindo da origem,
 * visitando exatamente os intermediários de `mask` e parando no intermediário j.
 * Retorna a sequência completa (origem, ..., destino) ou null se inviável.
 */
function heldKarp(matriz, origem, intermediarios, destino) {
  const k = intermediarios.length;
  const fechar = (seq) => (destino == null ? seq : [...seq, destino]);
  if (k === 0) {
    const seq = fechar([origem]);
    return custoRota(matriz, seq) < Infinity ? seq : null;
  }

  const total = 1 << k;
  const dp = Array.from({ length: total }, () => new Float64Array(k).fill(Infinity));
  const pai = Array.from({ length: total }, () => new Int8Array(k).fill(-1));
  for (let j = 0; j < k; j++) dp[1 << j][j] = matriz[origem][intermediarios[j]];

  for (let mask = 1; mask < total; mask++) {
    for (let j = 0; j < k; j++) {
      const atual = dp[mask][j];
      if (atual === Infinity) continue;
      for (let p = 0; p < k; p++) {
        if (mask & (1 << p)) continue;
        const prox = mask | (1 << p);
        const custo = atual + matriz[intermediarios[j]][intermediarios[p]];
        if (custo < dp[prox][p]) {
          dp[prox][p] = custo;
          pai[prox][p] = j;
        }
      }
    }
  }

  const cheio = total - 1;
  let melhor = Infinity;
  let ultimo = -1;
  for (let j = 0; j < k; j++) {
    const custo = dp[cheio][j] + (destino == null ? 0 : matriz[intermediarios[j]][destino]);
    if (custo < melhor) {
      melhor = custo;
      ultimo = j;
    }
  }
  if (melhor === Infinity) return null;

  const meio = [];
  let mask = cheio;
  let j = ultimo;
  while (j !== -1) {
    meio.push(intermediarios[j]);
    const anterior = pai[mask][j];
    mask &= ~(1 << j);
    j = anterior;
  }
  return fechar([origem, ...meio.reverse()]);
}

/** Heurística gulosa: da origem, sempre vai ao intermediário não visitado mais próximo. */
function vizinhoMaisProximo(matriz, origem, intermediarios) {
  const restantes = new Set(intermediarios);
  const seq = [origem];
  while (restantes.size) {
    const atual = seq[seq.length - 1];
    let melhor = null;
    for (const v of restantes) if (melhor === null || matriz[atual][v] < matriz[atual][melhor]) melhor = v;
    restantes.delete(melhor);
    seq.push(melhor);
  }
  return seq;
}

/**
 * 2-opt: inverte trechos do meio da sequência enquanto isso reduzir o custo.
 * Recalcula o custo completo a cada troca (matriz assimétrica). Origem e
 * destino nunca saem do lugar.
 */
function doisOpt(matriz, seqInicial, destinoFixo) {
  let seq = [...seqInicial];
  let melhorCusto = custoRota(matriz, seq);
  const ultimoMovel = destinoFixo ? seq.length - 2 : seq.length - 1;
  let melhorou = true;
  while (melhorou) {
    melhorou = false;
    for (let i = 1; i < ultimoMovel; i++) {
      for (let k = i + 1; k <= ultimoMovel; k++) {
        const candidata = [...seq.slice(0, i), ...seq.slice(i, k + 1).reverse(), ...seq.slice(k + 1)];
        const custo = custoRota(matriz, candidata);
        if (custo + 1e-9 < melhorCusto) {
          seq = candidata;
          melhorCusto = custo;
          melhorou = true;
        }
      }
    }
  }
  return seq;
}

/**
 * Ponto de entrada. `origem` e `destino` são índices da matriz (destino pode ser
 * null = termina no último intermediário que for melhor); os demais vértices são
 * intermediários. Devolve a sequência completa de índices e o algoritmo usado;
 * `ordem` é null quando não existe caminho usando apenas arestas existentes.
 */
export function menorCaminho(matriz, { origem, destino = null }) {
  const intermediarios = [...matriz.keys()].filter((v) => v !== origem && v !== destino);
  if (intermediarios.length <= LIMITE_EXATO) {
    return { ordem: heldKarp(matriz, origem, intermediarios, destino), algoritmo: "Held-Karp (ótimo)" };
  }
  let seq = vizinhoMaisProximo(matriz, origem, intermediarios);
  if (destino != null) seq.push(destino);
  seq = doisOpt(matriz, seq, destino != null);
  const viavel = custoRota(matriz, seq) < Infinity;
  return { ordem: viavel ? seq : null, algoritmo: "Vizinho mais próximo + 2-opt" };
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
