// Dados do problema — os mesmos do notebook trabalho_star_wars.ipynb
// pos = posição do planeta no mapa 3D da galáxia (x, y, z)

export const BASES = [
  { nome: 'Hoth',    custo: 400, cap: 120, tipo: 'Planeta de gelo',      pos: [-12, 0.6, -6], raio: 1.25,
    cores: ['#8fa9c9', '#b9cfe6', '#e4eef8'], atmo: '#7fb8e8', modo: 0, seed: 1.7 },
  { nome: 'Yavin 4', custo: 500, cap: 150, tipo: 'Lua de selva',         pos: [2, -0.4, -6],  raio: 1.45,
    cores: ['#1f5e2c', '#3f8f3a', '#9bc46a'], atmo: '#8dffb0', modo: 0, seed: 4.2 },
  { nome: 'Dagobah', custo: 250, cap: 80,  tipo: 'Planeta-pântano',      pos: [-6, -0.8, 6],  raio: 1.1,
    cores: ['#2b3a24', '#4c5f33', '#7d8c56'], atmo: '#b8d68a', modo: 0, seed: 7.9 },
  { nome: 'Endor',   custo: 350, cap: 100, tipo: 'Lua florestal',        pos: [11, 0.9, 5],   raio: 1.2,
    cores: ['#1d4a2a', '#2f6b35', '#6b8e4e'], atmo: '#a6ffcf', modo: 0, seed: 2.3 },
];

export const FRENTES = [
  { nome: 'Tatooine', demanda: 40, tipo: 'Deserto',        pos: [-1, 1.2, 12],   raio: 0.9,
    cores: ['#c8955a', '#e2b878', '#f6dcaa'], atmo: '#ffd59a', modo: 0, seed: 3.1 },
  { nome: 'Naboo',    demanda: 50, tipo: 'Lagos e campos',  pos: [15, -0.6, -2],  raio: 0.95,
    cores: ['#2a6fb0', '#4f9f5a', '#cfe8b0'], atmo: '#8cc8ff', modo: 0, seed: 5.5 },
  { nome: 'Bespin',   demanda: 30, tipo: 'Gigante gasoso',  pos: [-8, 1.4, -13],  raio: 1.05,
    cores: ['#c77b4a', '#e8b07a', '#fbe1c0'], atmo: '#ffc28a', modo: 1, seed: 6.4 },
  { nome: 'Kashyyyk', demanda: 45, tipo: 'Floresta gigante', pos: [9, 0.3, -12],  raio: 0.95,
    cores: ['#2e4a1f', '#5a7a2c', '#a0a860'], atmo: '#c6f08a', modo: 0, seed: 8.8 },
  { nome: 'Lothal',   demanda: 35, tipo: 'Pradarias',       pos: [-14, -0.2, 9],  raio: 0.85,
    cores: ['#6f8a4a', '#a9b56a', '#e2d9a0'], atmo: '#e8f5a8', modo: 0, seed: 9.6 },
];

// custo por caixa (mil créditos) — linha = base, coluna = frente
export const CUSTO = [
  [8, 6, 3, 7, 9], // Hoth
  [4, 5, 7, 3, 6], // Yavin 4
  [3, 7, 8, 6, 2], // Dagobah
  [6, 2, 5, 4, 7], // Endor
];

// Quando a página é aberta pelo Google Colab, o notebook injeta os dados e a solução
// calculada pelo Pyomo em window.SOLUCAO_COLAB. Os números abaixo são então substituídos
// pelos do notebook (nomes e aparência dos planetas continuam os daqui).
const colab = typeof window !== 'undefined' ? window.SOLUCAO_COLAB : null;
let maxBases = 3;
if (colab && colab.problema) {
  const pr = colab.problema;
  pr.bases.forEach((b, i) => { if (BASES[i]) Object.assign(BASES[i], { nome: b.nome, custo: b.custo, cap: b.cap }); });
  pr.frentes.forEach((f, j) => { if (FRENTES[j]) Object.assign(FRENTES[j], { nome: f.nome, demanda: f.demanda }); });
  pr.custo.forEach((linha, i) => { CUSTO[i] = linha.slice(); });
  maxBases = pr.max_bases;
}
export const MAX_BASES = maxBases;

export const DEMANDA_TOTAL = FRENTES.reduce((s, f) => s + f.demanda, 0);
