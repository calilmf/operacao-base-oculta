// Dados do problema — os mesmos do notebook trabalho_star_wars.ipynb
// pos = posição do planeta no mapa 3D da galáxia (x, y, z)

export const BASES = [
  { nome: 'Hoth',    custo: 400, cap: 120, tipo: 'Planeta de gelo',      pos: [-12, 0.6, -6], raio: 1.25,
    cores: ['#8fa9c9', '#b9cfe6', '#e4eef8'], atmo: '#7fb8e8', modo: 0, seed: 1.7 },
  { nome: 'Yavin 4', custo: 500, cap: 150, tipo: 'Lua de selva',         pos: [2, -0.4, -6],  raio: 1.45,
    cores: ['#1f5e2c', '#3f8f3a', '#9bc46a'], atmo: '#8dffb0', modo: 0, seed: 4.2 },
  { nome: 'Dagobah', custo: 250, cap: 80,  tipo: 'Planeta-pântano',      pos: [-6, -0.8, 6],  raio: 1.1,
    cores: ['#1c3d3f', '#3e7a72', '#a9d6c8'], atmo: '#7fe8d6', modo: 0, seed: 7.9 },
  { nome: 'Endor',   custo: 350, cap: 100, tipo: 'Lua florestal',        pos: [11, 0.9, 5],   raio: 1.2,
    cores: ['#3a1d4f', '#6e3f96', '#cfa2ec'], atmo: '#d9a8ff', modo: 0, seed: 2.3 },
];

export const FRENTES = [
  { nome: 'Tatooine', demanda: 40, tipo: 'Deserto',        pos: [-1, 1.2, 12],   raio: 0.9,
    cores: ['#b07a2e', '#deb050', '#f8e3a0'], atmo: '#ffe08a', modo: 0, seed: 3.1 },
  { nome: 'Naboo',    demanda: 50, tipo: 'Lagos e campos',  pos: [15, -0.6, -2],  raio: 0.95,
    cores: ['#1b4f9e', '#4a9a52', '#f2f6ff'], atmo: '#8cc8ff', modo: 2, seed: 5.5 },
  { nome: 'Bespin',   demanda: 30, tipo: 'Gigante gasoso',  pos: [-8, 1.4, -13],  raio: 1.05,
    cores: ['#b8505a', '#e8907e', '#fcd9c6'], atmo: '#ff9fa0', modo: 1, seed: 6.4 },
  { nome: 'Kashyyyk', demanda: 45, tipo: 'Floresta gigante', pos: [9, 0.3, -12],  raio: 0.95,
    cores: ['#4a140e', '#a33a22', '#ec8a52'], atmo: '#ff7d5a', modo: 0, seed: 8.8 },
  { nome: 'Lothal',   demanda: 35, tipo: 'Pradarias',       pos: [-14, -0.2, 9],  raio: 0.85,
    cores: ['#14256e', '#3a5cd6', '#a8bcff'], atmo: '#7f9cff', modo: 1, seed: 9.6 },
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
