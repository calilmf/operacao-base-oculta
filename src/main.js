import '@fontsource/orbitron/500.css';
import '@fontsource/orbitron/800.css';
import '@fontsource/exo-2/400.css';
import '@fontsource/exo-2/600.css';
import 'katex/dist/katex.min.css';
import './style.css';

import * as THREE from 'three';
import Lenis from 'lenis';
import gsap from 'gsap';
import katex from 'katex';

import { BASES, FRENTES, CUSTO, MAX_BASES, DEMANDA_TOTAL } from './data/problema.js';
import SOLUCAO_PADRAO from './data/solucao.json';
import { resolver, mesmaSolucao } from './solver.js';
import { createScene, corDoCusto } from './scene.js';

// ------------------------------------------------------------------
// Configuração
// ------------------------------------------------------------------
const params = new URLSearchParams(location.search);
const lite = params.has('lite') || (navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory || 8) <= 2;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DUR = reduced ? 0.01 : 1;

const $ = (s, el = document) => el.querySelector(s);
const tex = (s, display = false) => katex.renderToString(s, { displayMode: display, throwOnError: false });
const fmt = (n) => Math.round(n).toLocaleString('pt-BR');
const hex = (c) => `#${corDoCusto(c).getHexString()}`;
const idxFrente = (nome) => FRENTES.findIndex((f) => f.nome === nome);

// A solução OFICIAL vem do notebook (solucao.json). O solver do navegador só é usado
// para análises derivadas (dilemas e painel "e se...?") e é conferido contra ela.
const OFICIAL = window.SOLUCAO_COLAB?.solucao ?? SOLUCAO_PADRAO;
const DO_COLAB = !!window.SOLUCAO_COLAB;
const conferido = mesmaSolucao(resolver(), OFICIAL);
if (!conferido) console.warn('Solver do navegador difere do solucao.json do notebook!');

const abertas = OFICIAL.bases.map((b, i) => (b.aberta ? i : -1)).filter((i) => i >= 0);
const fechadas = OFICIAL.bases.map((b, i) => (b.aberta ? -1 : i)).filter((i) => i >= 0);

// melhor plano possível forçando cada base fechada a abrir
const dilemas = fechadas.map((i) => {
  const F = resolver({ forcarAbertas: [i] });
  const dMont = F.custo_montagem - OFICIAL.custo_montagem;
  const dTransp = F.custo_transporte - OFICIAL.custo_transporte;
  return { i, F, dMont, dTransp, dTotal: F.custo_total - OFICIAL.custo_total,
    rotas: F.rotas.filter((r) => r.de === BASES[i].nome) };
});

// ------------------------------------------------------------------
// Cena 3D
// ------------------------------------------------------------------
const scene = createScene($('#galaxia'), $('#labels'), { lite, reduced });
scene.applySolution(OFICIAL);

// ------------------------------------------------------------------
// Conteúdo dinâmico
// ------------------------------------------------------------------
const crew = [
  ['General Rodrigo', 'Comandante', 'Precisa decidir onde montar as bases e como abastecer as frentes.', 'Decisão'],
  ['Calil', 'Engenheiro-chefe', 'Custo de montagem e capacidade das 4 bases candidatas.', 'Custos fixos e capacidades'],
  ['Julia Paz', 'Embaixadora', 'Demanda mensal de caixas de cada frente de batalha.', 'Demandas'],
  ['Vitor', 'Piloto', 'Custo por caixa de cada rota pelo hiperespaço.', 'Custos de transporte'],
  ['Giovana', 'Espiã', 'No máximo 3 bases, ou o Império rastreia a frota.', 'Restrição de segurança'],
  ['Ana Gabs', 'Programadora do droide', 'Transformou tudo em modelo e rodou o solver.', 'Modelo + Python'],
];
$('#crew').innerHTML = crew.map(([n, p, d, m]) => `
  <div class="crew-card" data-anim>
    <div class="avatar">${n.split(' ').map((x) => x[0]).slice(-2).join('')}</div>
    <div><b>${n}</b><em>${p}</em><p>${d}</p><span class="tag">${m}</span></div>
  </div>`).join('');

$('#m-demanda').textContent = DEMANDA_TOTAL;
$('#m-max').textContent = `≤ ${MAX_BASES}`;

// --- Dados ---
function barrasRotas(i) {
  return FRENTES.map((f, j) => {
    const c = CUSTO[i][j];
    return `<div class="barra"><span>${f.nome}</span><i style="width:${c * 10}%;background:${hex(c)}"></i><b>${c}</b></div>`;
  }).join('');
}
$('#dados-painel').innerHTML = BASES.map((b, i) => `
  <div class="passo" data-passo="${i}">
    <p class="kicker" data-anim>Relatório do Calil · base candidata ${i + 1} de 4</p>
    <h2 data-anim>${b.nome} <small>${b.tipo}</small></h2>
    <div class="stats dois" data-anim>
      <div><b>${b.custo}</b><span>mil créditos para montar</span></div>
      <div><b>${b.cap}</b><span>caixas por mês (capacidade)</span></div>
    </div>
    <p class="mini" data-anim>Rotas mapeadas pelo Vitor · custo por caixa (mil créditos)</p>
    <div class="barras" data-anim>${barrasRotas(i)}</div>
  </div>`).join('') + `
  <div class="passo" data-passo="4">
    <p class="kicker" data-anim>Relatório da Julia Paz · frentes de batalha</p>
    <h2 data-anim>${DEMANDA_TOTAL} caixas por mês</h2>
    <table class="tabela" data-anim>
      <tr><th></th>${FRENTES.map((f) => `<th>${f.nome}</th>`).join('')}</tr>
      <tr><td>Demanda</td>${FRENTES.map((f) => `<td><b>${f.demanda}</b></td>`).join('')}</tr>
      ${BASES.map((b, i) => `<tr><td>${b.nome}</td>${CUSTO[i].map((c) => `<td class="calor" style="--c:${hex(c)}">${c}</td>`).join('')}</tr>`).join('')}
    </table>
    <p class="mini" data-anim>As 20 rotas possíveis aparecem no mapa · <span class="grad"></span> barata → cara</p>
    <p class="alerta" data-anim><b>Alerta da Giovana:</b> cada base nova aumenta a chance de o Império rastrear a frota. No máximo <b>${MAX_BASES} bases</b>.</p>
  </div>`;

// --- Modelo (forma literal, gerada a partir dos dados) ---
const Y = (i) => `Y_${i + 1}`, X = (i, j) => `X_{${i + 1}${j + 1}}`;
const objLinhas = [
  BASES.map((b, i) => `${b.custo}${Y(i)}`).join(' + '),
  ...BASES.map((b, i) => '+ ' + FRENTES.map((f, j) => `${CUSTO[i][j]}${X(i, j)}`).join(' + ')),
];
const objTex = `\\begin{aligned}\\text{Min } Z = \\; & ${objLinhas[0]} \\\\ ${objLinhas.slice(1).map((l) => `& ${l}`).join(' \\\\ ')}\\end{aligned}`;
const eq = (t, rot) => `<div class="eq" data-anim>${tex(t)}<span>${rot}</span></div>`;

$('#modelo-painel').innerHTML = `
  <div class="passo" data-passo="0">
    <p class="kicker" data-anim>O modelo · Programação Linear Inteira Mista</p>
    <h2 data-anim>Variáveis de decisão</h2>
    <div class="indices" data-anim>
      <div><b>Bases (i)</b>${BASES.map((b, i) => `<span>${i + 1} = ${b.nome}</span>`).join('')}</div>
      <div><b>Frentes (j)</b>${FRENTES.map((f, j) => `<span>${j + 1} = ${f.nome}</span>`).join('')}</div>
    </div>
    ${eq('Y_1,\\ Y_2,\\ Y_3,\\ Y_4 \\in \\{0, 1\\}', 'abre (1) ou não (0) cada base, uma decisão de sim/não')}
    ${eq('X_{ij} \\in \\mathbb{Z},\\ X_{ij} \\ge 0', 'caixas enviadas da base i para a frente j')}
    <p class="mini" data-anim>Ex.: ${tex('X_{12}')} = caixas de Hoth para Naboo · ${tex('X_{35}')} = caixas de Dagobah para Lothal</p>
  </div>
  <div class="passo" data-passo="1">
    <p class="kicker" data-anim>O modelo</p>
    <h2 data-anim>Função objetivo</h2>
    <p data-anim>Minimizar o custo de <span class="hl a">montar as bases</span> + o custo de <span class="hl b">transportar as caixas</span>.</p>
    <div class="formula" data-anim>${tex(objTex, true)}</div>
  </div>
  <div class="passo" data-passo="2">
    <p class="kicker" data-anim>O modelo · restrições</p>
    <h2 data-anim>Demanda: cada frente recebe exatamente o que pediu</h2>
    ${FRENTES.map((f, j) => eq(`${BASES.map((_, i) => X(i, j)).join(' + ')} = ${f.demanda}`, f.nome)).join('')}
  </div>
  <div class="passo" data-passo="3">
    <p class="kicker" data-anim>O modelo · restrições</p>
    <h2 data-anim>Capacidade e segurança</h2>
    <p class="mini" data-anim>Base fechada (Y = 0) não manda nada; base aberta manda até a capacidade.</p>
    ${BASES.map((b, i) => eq(`${FRENTES.map((_, j) => X(i, j)).join(' + ')} \\le ${b.cap}${Y(i)}`, b.nome)).join('')}
    <p class="mini" data-anim>Alerta da Giovana:</p>
    ${eq(`Y_1 + Y_2 + Y_3 + Y_4 \\le ${MAX_BASES}`, 'segurança')}
  </div>
  <div class="passo" data-passo="4">
    <p class="kicker" data-anim>O modelo</p>
    <h2 data-anim>Por que Programação Inteira Mista?</h2>
    <div class="cards2">
      <div class="card" data-anim><b>Onde instalar</b><span>Decisão de sim/não → variável <b>binária</b> ${tex('Y_i')}. Não existe “meia base”.</span></div>
      <div class="card" data-anim><b>Como distribuir</b><span>Quantidade de caixas → variável <b>inteira</b> ${tex('X_{ij}')}. Não se envia meia caixa.</span></div>
    </div>
    <p data-anim>Abrir base custa caro, mas abrir poucas deixa as rotas longas e caras. O modelo encontra o equilíbrio entre as duas coisas, exatamente o dilema do General Rodrigo.</p>
  </div>`;

// --- Resolução ---
const codigo = [
  ['c', '# Ana Gabs programa o droide estrategista'],
  ['', 'model = pyo.ConcreteModel()'],
  ['', 'model.Y = pyo.Var([1, 2, 3, 4], within=pyo.Binary)'],
  ['', 'model.X = pyo.Var([1, 2, 3, 4], [1, 2, 3, 4, 5], within=pyo.NonNegativeIntegers)'],
  ['', ''],
  ['', `obj_sum = (${BASES.map((b, i) => `${b.custo}*model.Y[${i + 1}]`).join(' + ')}`],
  ['', `           + ${CUSTO[0].slice(0, 3).map((c, j) => `${c}*model.X[1,${j + 1}]`).join(' + ')} + ...`],
  ['', 'model.obj = pyo.Objective(expr=obj_sum, sense=pyo.minimize)'],
  ['', ''],
  ['', `model.C1 = pyo.Constraint(expr=model.X[1,1] + model.X[2,1] + model.X[3,1] + model.X[4,1] == ${FRENTES[0].demanda})`],
  ['c', '# ... C2 a C9: demanda e capacidade, todas escritas na forma literal'],
  ['', `model.C10 = pyo.Constraint(expr=model.Y[1] + model.Y[2] + model.Y[3] + model.Y[4] <= ${MAX_BASES})`],
  ['', ''],
  ['', "opt = SolverFactory('glpk')"],
  ['', 'results = opt.solve(model)'],
];
$('#resolucao-painel').innerHTML = `
  <div class="passo" data-passo="0">
    <p class="kicker" data-anim>Resolução · Python + Pyomo + GLPK</p>
    <pre class="codigo">${codigo.map(([k, l]) => `<code class="${k}">${l.replace(/</g, '&lt;') || ' '}</code>`).join('')}</pre>
  </div>
  <div class="passo" data-passo="1">
    <p class="kicker" data-anim>Saída do solver</p>
    <pre class="codigo saida">
<code>&gt;&gt;&gt; print(results.solver.status, results.solver.termination_condition)</code>
<code class="ok">${OFICIAL.status === 'optimal' ? 'ok optimal' : OFICIAL.status}</code>
<code> </code>
<code>&gt;&gt;&gt; print('Valor ótimo encontrado:', pyo.value(model.obj()))</code>
<code class="ok grande">Valor ótimo encontrado: ${OFICIAL.custo_total.toFixed(1)} mil créditos</code></pre>
    <p class="mini" data-anim>“optimal” = o GLPK provou que não existe plano mais barato (gap = 0).</p>
    <p class="selo" data-anim>${DO_COLAB ? '● Dados ao vivo: solução calculada agora pelo notebook no Google Colab' : '○ Solução salva do notebook (abra pelo Colab para dados ao vivo)'}</p>
  </div>`;

// --- Resultados ---
const xMat = BASES.map((b) => FRENTES.map((f) => OFICIAL.rotas.find((r) => r.de === b.nome && r.para === f.nome)?.caixas ?? 0));
const linhasCusto = [
  ...abertas.map((i) => ({ t: `Montagem de ${BASES[i].nome}`, v: BASES[i].custo, k: 'a' })),
  ...OFICIAL.rotas.map((r) => ({ t: `${r.de} → ${r.para} · ${r.caixas} × ${r.custo_unit}`, v: r.caixas * r.custo_unit, k: 'b', c: r.custo_unit })),
];
$('#resultados-painel').innerHTML = `
  <div class="passo" data-passo="0">
    <p class="kicker" data-anim>Resultado · variáveis Y</p>
    <h2 data-anim>Abrir só ${abertas.length} das ${BASES.length} bases</h2>
    <div class="ys">${OFICIAL.bases.map((b, i) => `
      <div class="y ${b.aberta ? 'on' : 'off'}" data-anim>${tex(`${Y(i)} = ${b.aberta}`)}<b>${b.nome}</b><span>${b.aberta ? 'aberta' : 'fechada'}</span></div>`).join('')}
    </div>
    <p data-anim>No mapa, as bases fechadas se apagam e as abertas ganham um anel de capacidade.</p>
  </div>
  <div class="passo" data-passo="1">
    <p class="kicker" data-anim>Resultado · variáveis X</p>
    <h2 data-anim>Caixas por rota</h2>
    <table class="tabela" data-anim>
      <tr><th></th>${FRENTES.map((f) => `<th>${f.nome}</th>`).join('')}</tr>
      ${BASES.map((b, i) => `<tr class="${OFICIAL.bases[i].aberta ? '' : 'apagada'}"><td>${b.nome}</td>${xMat[i].map((v, j) => `<td class="${v ? 'x-on' : ''}" ${v ? `style="--c:${hex(CUSTO[i][j])}"` : ''}>${v}</td>`).join('')}</tr>`).join('')}
      <tr class="tot"><td>Recebido</td>${FRENTES.map((f, j) => `<td>${xMat.reduce((s, r) => s + r[j], 0)}/${f.demanda}</td>`).join('')}</tr>
    </table>
    <p class="mini" data-anim>No mapa: <b>a cor da rota indica o custo por caixa</b> (azul = barata, laranja = cara)</p>
  </div>
  <div class="passo" data-passo="2">
    <p class="kicker" data-anim>Resultado · função objetivo</p>
    <h2 data-anim>Custo total</h2>
    <ul class="extrato">${linhasCusto.map((l) => `<li class="${l.k}" ${l.c ? `style="--c:${hex(l.c)}"` : ''}><span>${l.t}</span><b>+${fmt(l.v)}</b></li>`).join('')}</ul>
    <div class="total"><span>Z =</span><b id="contador">0</b><small>mil créditos</small></div>
    <p class="mini"><span class="hl a">montagem ${fmt(OFICIAL.custo_montagem)}</span> + <span class="hl b">transporte ${fmt(OFICIAL.custo_transporte)}</span></p>
  </div>`;
$('#legenda-rotas').innerHTML = `<div><span class="grad"></span><small>custo por caixa: ${Math.min(...CUSTO.flat())} → ${Math.max(...CUSTO.flat())}</small></div>`;

// --- Interpretação ---
function balanca(d) {
  const economiza = (d.dMont < 0 ? -d.dMont : 0) + (d.dTransp < 0 ? -d.dTransp : 0);
  const custa = (d.dMont > 0 ? d.dMont : 0) + (d.dTransp > 0 ? d.dTransp : 0);
  const ang = Math.max(-14, Math.min(14, ((custa - economiza) / Math.max(custa, economiza, 1)) * 60));
  return { economiza, custa, ang };
}
const nomesAbertas = (sol) => sol.bases.filter((b) => b.aberta).map((b) => b.nome).join(' + ');
const conclusoesHTML = dilemas.map((d, k) => {
  const b = BASES[d.i], bl = balanca(d);
  const itemE = [], itemC = [];
  (d.dMont < 0 ? itemE : itemC).push(`montagem ${d.dMont < 0 ? '−' : '+'}${fmt(Math.abs(d.dMont))}`);
  (d.dTransp < 0 ? itemE : itemC).push(`transporte ${d.dTransp < 0 ? '−' : '+'}${fmt(Math.abs(d.dTransp))}`);
  return `
  <div class="passo" data-passo="${k}">
    <p class="kicker" data-anim>Interpretação · e se ${b.nome} abrisse?</p>
    <h2 data-anim>O dilema de ${b.nome}</h2>
    <p data-anim>O melhor plano possível com ${b.nome} aberta é <b>${nomesAbertas(d.F)}</b>. As rotas que ${b.nome} assumiria aparecem destacadas no mapa: ${d.rotas.map((r) => `${r.para} (${r.custo_unit}/caixa)`).join(', ')}.</p>
    <div class="balanca" data-anim style="--ang:${bl.ang}deg">
      <svg viewBox="0 0 320 150" aria-hidden="true">
        <polygon points="160,140 145,150 175,150" class="pe"/>
        <line x1="160" y1="140" x2="160" y2="40" class="haste"/>
        <g class="braco"><line x1="40" y1="40" x2="280" y2="40"/>
          <g class="prato e"><line x1="40" y1="40" x2="40" y2="78"/><path d="M5 78 h70 a35 14 0 0 1 -70 0z"/></g>
          <g class="prato c"><line x1="280" y1="40" x2="280" y2="78"/><path d="M245 78 h70 a35 14 0 0 1 -70 0z"/></g>
        </g>
      </svg>
      <div class="pratos"><div class="e"><b>−${fmt(bl.economiza)}</b><span>economiza<br>${itemE.join('<br>') || 'nada'}</span></div>
      <div class="c"><b>+${fmt(bl.custa)}</b><span>custa a mais<br>${itemC.join('<br>') || 'nada'}</span></div></div>
    </div>
    <p class="veredito" data-anim>Saldo: <b>+${fmt(d.dTotal)} mil créditos</b> (${fmt(d.F.custo_total)} contra ${fmt(OFICIAL.custo_total)}) → manter ${b.nome} fechada${d.dTotal <= 10 ? '. <b>Vitória por um triz!</b>' : '.'}</p>
  </div>`;
}).join('');

const seg = OFICIAL.restricao_seguranca;
const maiorCap = Math.max(...BASES.map((b) => b.cap));
const capInfo = abertas.map((i) => ({ b: BASES[i], s: OFICIAL.bases[i] }));
const folgaCap = capInfo.reduce((s, c) => s + c.s.capacidade - c.s.enviado, 0);
$('#conclusoes-painel').innerHTML = conclusoesHTML + `
  <div class="passo" data-passo="2">
    <p class="kicker" data-anim>Interpretação · o alerta da Giovana</p>
    <h2 data-anim>${seg.usado} de ${seg.limite} sinais no radar do Império</h2>
    <div class="radar" data-anim>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r="90"/><circle cx="100" cy="100" r="60"/><circle cx="100" cy="100" r="30"/>
        <line x1="10" y1="100" x2="190" y2="100"/><line x1="100" y1="10" x2="100" y2="190"/>
        <g class="varredura"><path d="M100 100 L100 10 A90 90 0 0 1 163.6 36.4 Z"/></g>
        ${Array.from({ length: seg.limite }, (_, k) => {
          const a = (k / seg.limite) * Math.PI * 2 - 1.2, r = 55;
          return `<circle class="sinal ${k < seg.usado ? 'on' : 'off'}" cx="${100 + Math.cos(a) * r}" cy="${100 + Math.sin(a) * r}" r="${k < seg.usado ? 8 : 7}"/>`;
        }).join('')}
      </svg>
    </div>
    <p data-anim>O limite era de <b>${seg.limite} bases</b> e o plano ótimo usa <b>${seg.usado}</b>: a restrição ficou com <b>folga de ${seg.limite - seg.usado}</b>. O plano mais barato também é o mais seguro.</p>
    <p class="mini" data-anim>E não dá para operar com uma base só: a maior capacidade (${maiorCap} caixas) não cobre as ${DEMANDA_TOTAL} caixas de demanda.</p>
  </div>
  <div class="passo" data-passo="3">
    <p class="kicker" data-anim>Interpretação · capacidade</p>
    <h2 data-anim>Quanto cada base trabalha</h2>
    ${capInfo.map(({ b, s }) => `
      <div class="cap" data-anim><div class="cap-top"><b>${b.nome}</b><span>${s.enviado} / ${s.capacidade} caixas · ${Math.round((s.enviado / s.capacidade) * 100)}%</span></div>
      <div class="cap-barra"><i style="--p:${(s.enviado / s.capacidade) * 100}%"></i></div></div>`).join('')}
    <p data-anim>Sobram <b>${folgaCap} caixas</b> de capacidade no total: margem para a demanda crescer sem abrir outra base. ${capInfo.map(({ b, s }) => (s.enviado / s.capacidade > 0.9 ? `${b.nome} está quase no limite e é a primeira a precisar de reforço.` : '')).join(' ')}</p>
    <p class="mini" data-anim>Todas as ${FRENTES.length} frentes recebem 100% da demanda (${DEMANDA_TOTAL}/${DEMANDA_TOTAL} caixas).</p>
  </div>`;

// --- E se...? ---
$('#ese-painel').innerHTML = `
  <p class="kicker" data-anim>Laboratório do droide · e se...?</p>
  <h2 data-anim>Mude os dados, o mapa se resolve de novo</h2>
  <div class="controles" data-anim>
    ${BASES.map((b, i) => `<label><span>Montagem ${b.nome}</span><input type="range" min="0" max="900" step="10" value="${b.custo}" data-base="${i}"><output>${b.custo}</output></label>`).join('')}
    <label><span>Máximo de bases</span><input type="range" min="1" max="4" step="1" value="${MAX_BASES}" id="ese-max"><output>${MAX_BASES}</output></label>
  </div>
  <div class="ese-botoes" data-anim>
    <button id="ese-teste">Testar: Yavin 4 custa 510</button>
    <button id="ese-reset">Voltar ao original</button>
  </div>
  <div id="ese-saida" class="ese-saida" data-anim></div>
  <p class="mini" data-anim>${conferido ? '✓' : '⚠'} O solver do navegador (enumeração das bases + fluxo de custo mínimo) ${conferido ? 'chega ao mesmo ótimo do Pyomo/GLPK' : 'NÃO conferiu com o notebook'}.</p>`;

let eseSolucao = OFICIAL;
function rodarEse() {
  const custos = [...document.querySelectorAll('#ese-painel input[data-base]')].map((el) => +el.value);
  const maxBases = +$('#ese-max').value;
  document.querySelectorAll('#ese-painel input').forEach((el) => { el.nextElementSibling.textContent = el.value; });
  const s = resolver({ custos, maxBases });
  eseSolucao = s;
  const saida = $('#ese-saida');
  if (s.status !== 'optimal') {
    saida.innerHTML = `<b class="erro">Missão impossível</b><span>Com no máximo ${maxBases} base(s) não há capacidade para ${DEMANDA_TOTAL} caixas.</span>`;
  } else {
    const delta = s.custo_total - OFICIAL.custo_total;
    const mudou = !mesmaSolucao({ ...s, custo_total: 0 }, { ...OFICIAL, custo_total: 0 });
    saida.innerHTML = `<b>Z = ${fmt(s.custo_total)}</b><span>${delta === 0 ? 'igual ao original' : `${delta > 0 ? '+' : '−'}${fmt(Math.abs(delta))} vs. original`}</span>
      <span>Bases: <b>${nomesAbertas(s)}</b>${mudou ? ' · <em>o plano mudou!</em>' : ''}</span>`;
  }
  if (atual?.cam === 'ese') scene.applySolution(eseSolucao);
}
document.querySelectorAll('#ese-painel input').forEach((el) => el.addEventListener('input', rodarEse));
$('#ese-reset').addEventListener('click', () => {
  document.querySelectorAll('#ese-painel input[data-base]').forEach((el) => { el.value = BASES[+el.dataset.base].custo; });
  $('#ese-max').value = MAX_BASES; rodarEse();
});
$('#ese-teste').addEventListener('click', () => {
  $('#ese-painel input[data-base="1"]').value = 510; rodarEse();
});
let atual = null;
rodarEse();

// ------------------------------------------------------------------
// Câmera e estado visual de cada parada
// ------------------------------------------------------------------
const V = (...a) => new THREE.Vector3(...a);
const UP = V(0, 1, 0);
const centro = V(0, 0, 0);
function enquadrar(P, dist, elev, azim, lado) {
  const e = THREE.MathUtils.degToRad(elev), a = THREE.MathUtils.degToRad(azim);
  const pos = P.clone().add(V(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)).multiplyScalar(dist));
  const dir = P.clone().sub(pos).normalize();
  const right = dir.clone().cross(UP).normalize();
  const look = P.clone().sub(right.multiplyScalar(lado * dist * 0.3));
  return { pos, look };
}
const pBase = (i) => V(...BASES[i].pos);
const meio = (ids) => ids.reduce((s, i) => s.add(pBase(i)), V()).multiplyScalar(1 / ids.length);

function camera(nome) {
  if (nome === 'hero') return { pos: V(0, 95, 150), look: V(0, -6, 0) };
  if (nome === 'creditos') return { pos: V(0, 170, 250), look: V(0, -6, 0) };
  if (nome === 'tripulacao') return enquadrar(centro, 80, 32, 25, 0);
  if (nome === 'missao') return enquadrar(centro, 46, 58, 0, 1);
  if (nome.startsWith('dados-') && nome !== 'dados-frentes') return enquadrar(pBase(+nome.slice(6)), 10, 24, 12, 1);
  if (nome === 'dados-frentes') return enquadrar(centro, 44, 55, -10, 1);
  if (nome.startsWith('modelo-')) return enquadrar(centro, 60, 18, 30 + +nome.slice(7) * 10, 0);
  if (nome.startsWith('resolucao-')) return enquadrar(centro, 52, 30, 70 + +nome.slice(10) * 12, -1);
  if (nome === 'res-bases') return enquadrar(centro, 42, 62, 0, 1);
  if (nome === 'res-rotas') return enquadrar(centro, 42, 56, -8, 1);
  if (nome === 'res-custo') return enquadrar(centro, 44, 50, -16, 1);
  if (nome.startsWith('conc-d')) return enquadrar(centro, 44, 64, +nome.slice(6) ? 10 : -10, 1);
  if (nome === 'conc-seg') return enquadrar(centro, 54, 82, 0, 1);
  if (nome === 'conc-cap') return enquadrar(meio(abertas), 24, 45, 20, 1);
  if (nome === 'mundo') return enquadrar(centro, 120, 28, 40, 0);
  if (nome === 'ese') return enquadrar(centro, 46, 58, 0, -1);
  return enquadrar(centro, 50, 40, 0, 0);
}

const BASE_ST = { cand: 0, sol: 0, dim: 0, labels: 0, rings: 0, res: false, focus: [], focusBase: null, destaques: [] };
function estadoVisual(nome) {
  const s = { ...BASE_ST };
  const res = { dim: 1, rings: 1, labels: 1, res: true };
  if (nome === 'missao') Object.assign(s, { labels: 1 });
  else if (nome === 'dados-frentes') Object.assign(s, { labels: 1, cand: 1, focus: FRENTES.map((f) => f.nome) });
  else if (nome.startsWith('dados-')) { const i = +nome.slice(6); Object.assign(s, { labels: 1, cand: 1, focus: [BASES[i].nome], focusBase: i }); }
  else if (nome.startsWith('modelo-')) Object.assign(s, { cand: 0.35 });
  else if (nome.startsWith('resolucao-')) Object.assign(s, { cand: 0.2 });
  else if (nome === 'res-bases') Object.assign(s, res);
  else if (nome === 'res-rotas' || nome === 'res-custo') Object.assign(s, res, { sol: 1 });
  else if (nome.startsWith('conc-d')) {
    const d = dilemas[+nome.slice(6)];
    Object.assign(s, res, { sol: 0.45, dim: 0.35, rings: 0.4, focus: [BASES[d.i].nome, ...d.rotas.map((r) => r.para)],
      destaques: d.rotas.map((r) => [d.i, idxFrente(r.para)]) });
  } else if (nome === 'conc-seg') Object.assign(s, res, { sol: 1, labels: 0.5 });
  else if (nome === 'conc-cap') Object.assign(s, res, { sol: 1, focus: abertas.map((i) => BASES[i].nome) });
  else if (nome === 'mundo') Object.assign(s, { sol: 0.5, dim: 1, res: true });
  else if (nome === 'ese') Object.assign(s, res, { sol: 1 });
  else if (nome === 'creditos') Object.assign(s, { sol: 0.6, dim: 1, res: true });
  return s;
}

// ------------------------------------------------------------------
// Paradas (stops) e scroll
// ------------------------------------------------------------------
const secoes = [...document.querySelectorAll('.sec')];
const stops = [];
secoes.forEach((sec) => {
  const nomes = sec.dataset.stops.split(',');
  sec.style.setProperty('--n', nomes.length);
  nomes.forEach((cam, k) => stops.push({ sec, k, cam, camera: camera(cam), estado: estadoVisual(cam) }));
});
const yStop = (s) => s.sec.offsetTop + s.k * window.innerHeight;

// trilha do HUD
$('#hud-trilha').innerHTML = secoes.map((s, i) => `<li><button data-sec="${i}" title="${s.dataset.titulo}"><span>${s.dataset.titulo}</span></button></li>`).join('');

const lenis = new Lenis({ lerp: reduced ? 1 : 0.085, wheelMultiplier: 0.9 });

const smooth = (x) => x * x * (3 - 2 * x);
const lerpNum = (a, b, t) => a + (b - a) * t;
let alvoIdx = 0;

function ativar(stop) {
  if (atual === stop) return;
  const anterior = atual;
  atual = stop;
  // painéis com passos: mostra o passo da parada ativa
  const passos = stop.sec.querySelectorAll('.passo');
  let raiz = stop.sec.querySelector('.palco');
  if (passos.length) {
    passos.forEach((p) => p.classList.toggle('ativo', +p.dataset.passo === stop.k));
    raiz = stop.sec.querySelector(`.passo[data-passo="${stop.k}"]`) || raiz;
  }
  const mudouSecao = !anterior || anterior.sec !== stop.sec;
  if (mudouSecao || passos.length) animarEntrada(raiz, stop);
  secoes.forEach((s) => s.classList.toggle('atual', s === stop.sec));
  document.querySelectorAll('#hud-trilha button').forEach((b, i) => b.classList.toggle('on', secoes[i] === stop.sec));
  // solução exibida: o painel "e se" mostra a solução alterada; o resto sempre mostra a oficial
  scene.applySolution(stop.cam === 'ese' ? eseSolucao : OFICIAL);
}

function animarEntrada(raiz, stop) {
  const els = raiz.querySelectorAll('[data-anim]');
  gsap.killTweensOf(els);
  gsap.fromTo(els, { autoAlpha: 0, y: 24, filter: 'blur(6px)' },
    { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.7 * DUR, stagger: 0.07 * DUR, ease: 'power3.out', delay: 0.1 * DUR });
  if (stop.cam === 'resolucao-0') {
    const linhas = raiz.querySelectorAll('.codigo code');
    gsap.fromTo(linhas, { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: 0.25 * DUR, stagger: 0.12 * DUR, ease: 'power1.out' });
  }
  if (stop.cam === 'resolucao-1') {
    const linhas = raiz.querySelectorAll('.codigo code');
    gsap.fromTo(linhas, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 * DUR, stagger: 0.35 * DUR });
  }
  if (stop.cam === 'res-custo') {
    const itens = raiz.querySelectorAll('.extrato li');
    const cont = $('#contador');
    const o = { v: 0 };
    let acum = 0;
    const tl = gsap.timeline();
    cont.textContent = '0';
    gsap.set(itens, { autoAlpha: 0, x: -16 });
    linhasCusto.forEach((l, k) => {
      const de = acum; acum += l.v;
      tl.to(itens[k], { autoAlpha: 1, x: 0, duration: 0.3 * DUR }, k * 0.45 * DUR + 0.3 * DUR);
      tl.fromTo(o, { v: de }, { v: acum, duration: 0.4 * DUR, ease: 'power1.out',
        onUpdate: () => { cont.textContent = fmt(o.v); } }, k * 0.45 * DUR + 0.3 * DUR);
    });
  }
  if (stop.cam.startsWith('conc-d')) {
    const braco = raiz.querySelector('.braco');
    const ang = getComputedStyle(raiz.querySelector('.balanca')).getPropertyValue('--ang');
    gsap.fromTo(braco, { rotation: 0, svgOrigin: '160 40' }, { rotation: parseFloat(ang), svgOrigin: '160 40', duration: 1.6 * DUR, ease: 'elastic.out(1, 0.45)', delay: 0.8 * DUR });
  }
  if (stop.cam === 'conc-cap') {
    gsap.fromTo(raiz.querySelectorAll('.cap-barra i'), { scaleX: 0 }, { scaleX: 1, duration: 1.2 * DUR, stagger: 0.2 * DUR, ease: 'power2.out', delay: 0.4 * DUR, transformOrigin: 'left' });
  }
}

function tick(time) {
  lenis.raf(time);
  const y = lenis.scroll;
  // segmento entre duas paradas
  let k = 0;
  while (k < stops.length - 1 && yStop(stops[k + 1]) <= y) k++;
  const a = stops[k], b = stops[Math.min(k + 1, stops.length - 1)];
  const ya = yStop(a), yb = yStop(b);
  const t = a === b ? 0 : THREE.MathUtils.clamp((y - ya) / (yb - ya), 0, 1);
  const ts = smooth(t);
  const pos = a.camera.pos.clone().lerp(b.camera.pos, ts);
  const look = a.camera.look.clone().lerp(b.camera.look, ts);
  const perto = t < 0.5 ? a : b;
  const est = { ...perto.estado };
  ['cand', 'sol', 'dim', 'labels', 'rings'].forEach((key) => { est[key] = lerpNum(a.estado[key], b.estado[key], ts); });
  // deriva lenta da câmera para a cena nunca ficar parada
  const d = reduced ? 0 : time / 1000;
  pos.x += Math.sin(d * 0.15) * 0.6; pos.y += Math.sin(d * 0.11) * 0.4;
  scene.setView(pos, look, est);
  ativar(perto);
  if (!lenis.isScrolling) alvoIdx = stops.indexOf(perto);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// ------------------------------------------------------------------
// Navegação por teclado / passador de slides / HUD
// ------------------------------------------------------------------
function irPara(i) {
  alvoIdx = THREE.MathUtils.clamp(i, 0, stops.length - 1);
  lenis.scrollTo(yStop(stops[alvoIdx]), { duration: reduced ? 0 : 1.8, easing: (x) => 1 - Math.pow(1 - x, 3), force: true });
}
window.addEventListener('keydown', (e) => {
  if (e.target.closest('input, button')) { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; if (e.target.matches('input')) return; }
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); irPara(alvoIdx + 1); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); irPara(alvoIdx - 1); }
  else if (e.key === 'Home') { e.preventDefault(); irPara(0); }
  else if (e.key === 'End') { e.preventDefault(); irPara(stops.length - 1); }
  else if (e.key.toLowerCase() === 'f') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); }
  else if (e.key.toLowerCase() === 'l') { params.has('lite') ? params.delete('lite') : params.set('lite', '1'); location.search = params.toString(); }
});
$('#hud-trilha').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  irPara(stops.findIndex((s) => s.sec === secoes[+b.dataset.sec]));
});
window.addEventListener('resize', () => lenis.resize());
