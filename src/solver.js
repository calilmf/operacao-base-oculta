// Solver exato do mesmo modelo, rodando no navegador.
// Estratégia: enumera todas as combinações de bases abertas (Y) e, para cada uma,
// resolve o transporte (X) por fluxo de custo mínimo. Com 4 bases são só 15 combinações,
// então o ótimo encontrado é o ótimo global — o mesmo que o GLPK encontra no notebook.
import { BASES, FRENTES, CUSTO, MAX_BASES, DEMANDA_TOTAL } from './data/problema.js';

const INF = 1e12;

function fluxoCustoMinimo(abertas) {
  const m = BASES.length, n = FRENTES.length;
  const N = m + n + 2, s = 0, t = N - 1;
  const g = Array.from({ length: N }, () => []);
  const add = (u, v, cap, cost) => {
    g[u].push({ v, cap, cost, rev: g[v].length });
    g[v].push({ v: u, cap: 0, cost: -cost, rev: g[u].length - 1 });
  };
  for (const i of abertas) add(s, 1 + i, BASES[i].cap, 0);
  for (const i of abertas) for (let j = 0; j < n; j++) add(1 + i, 1 + m + j, INF, CUSTO[i][j]);
  for (let j = 0; j < n; j++) add(1 + m + j, t, FRENTES[j].demanda, 0);

  let fluxo = 0, custo = 0;
  while (fluxo < DEMANDA_TOTAL) {
    // Bellman-Ford no grafo residual
    const dist = Array(N).fill(INF), pv = Array(N).fill(-1), pe = Array(N).fill(-1);
    dist[s] = 0;
    for (let k = 0; k < N; k++) {
      let mudou = false;
      for (let u = 0; u < N; u++) {
        if (dist[u] >= INF) continue;
        g[u].forEach((e, idx) => {
          if (e.cap > 0 && dist[u] + e.cost < dist[e.v]) {
            dist[e.v] = dist[u] + e.cost; pv[e.v] = u; pe[e.v] = idx; mudou = true;
          }
        });
      }
      if (!mudou) break;
    }
    if (dist[t] >= INF) return null; // inviável
    let f = DEMANDA_TOTAL - fluxo;
    for (let v = t; v !== s; v = pv[v]) f = Math.min(f, g[pv[v]][pe[v]].cap);
    for (let v = t; v !== s; v = pv[v]) {
      const e = g[pv[v]][pe[v]];
      e.cap -= f; g[v][e.rev].cap += f;
    }
    fluxo += f; custo += f * dist[t];
  }
  const x = BASES.map(() => FRENTES.map(() => 0));
  for (const i of abertas) {
    for (const e of g[1 + i]) {
      const j = e.v - 1 - m;
      if (j >= 0 && j < n) x[i][j] = g[e.v][e.rev].cap; // fluxo = capacidade da aresta reversa
    }
  }
  return { custo, x };
}

/**
 * Resolve o modelo. Retorna no MESMO formato do solucao.json exportado do notebook.
 * opcoes: { custos: [4 custos de montagem], maxBases, forcarAbertas: [idx], forcarFechadas: [idx] }
 */
export function resolver(opcoes = {}) {
  const custos = opcoes.custos ?? BASES.map((b) => b.custo);
  const maxBases = opcoes.maxBases ?? MAX_BASES;
  const forcarAbertas = opcoes.forcarAbertas ?? [];
  const forcarFechadas = opcoes.forcarFechadas ?? [];
  const m = BASES.length;

  let melhor = null;
  for (let mask = 1; mask < 1 << m; mask++) {
    const abertas = [...Array(m).keys()].filter((i) => (mask >> i) & 1);
    if (abertas.length > maxBases) continue;
    if (forcarAbertas.some((i) => !((mask >> i) & 1))) continue;
    if (forcarFechadas.some((i) => (mask >> i) & 1)) continue;
    if (abertas.reduce((s, i) => s + BASES[i].cap, 0) < DEMANDA_TOTAL) continue;
    const r = fluxoCustoMinimo(abertas);
    if (!r) continue;
    const montagem = abertas.reduce((s, i) => s + custos[i], 0);
    const total = montagem + r.custo;
    if (!melhor || total < melhor.total - 1e-9) melhor = { abertas, montagem, transporte: r.custo, x: r.x, total };
  }

  if (!melhor) {
    return { status: 'infeasible', restricao_seguranca: { limite: maxBases, usado: 0 } };
  }

  const rotas = [];
  BASES.forEach((b, i) => FRENTES.forEach((f, j) => {
    if (melhor.x[i][j] > 0) rotas.push({ de: b.nome, para: f.nome, caixas: melhor.x[i][j], custo_unit: CUSTO[i][j] });
  }));

  return {
    status: 'optimal',
    custo_total: melhor.total,
    custo_montagem: melhor.montagem,
    custo_transporte: melhor.transporte,
    bases: BASES.map((b, i) => ({
      nome: b.nome,
      aberta: melhor.abertas.includes(i) ? 1 : 0,
      capacidade: b.cap,
      enviado: melhor.x[i].reduce((s, v) => s + v, 0),
    })),
    rotas,
    restricao_seguranca: { limite: maxBases, usado: melhor.abertas.length },
  };
}

/** Compara duas soluções (para conferir o solver do navegador contra o Pyomo/GLPK). */
export function mesmaSolucao(a, b) {
  if (a.status !== b.status || Math.abs(a.custo_total - b.custo_total) > 1e-6) return false;
  const chave = (s) => s.rotas.map((r) => `${r.de}>${r.para}:${r.caixas}`).sort().join('|');
  return chave(a) === chave(b);
}
