# Operação Base Oculta

Trabalho de MMQD (Atividade Extra: Modelagem Criativa). Problema de localização de instalações e distribuição, resolvido por Programação Linear Inteira Mista com Python, Pyomo e GLPK.

A apresentação é uma página com tema espacial: rolar a página (ou usar ← →) leva a frota pela galáxia, e as animações do resultado (bases abertas, rotas, custo total) são geradas a partir da solução do modelo.

## Como apresentar pelo Google Colab

1. Rode o notebook até as células de Resolução e Resultados.
2. Rode a célula de `colab/celula_apresentacao.py`. Ela lê a solução que o Pyomo calculou, baixa o `apresentacao.html` deste repositório, injeta os dados e abre a página (link para tela cheia e prévia embutida).

Se um custo for alterado no notebook, a apresentação mostra o novo resultado.

## Arquivos

- `apresentacao.html`: página pronta, num arquivo só (abre direto no navegador, com a solução original).
- `colab/celula_apresentacao.py`: célula do Colab.
- `src/`, `index.html`: código-fonte (Vite, Three.js, GSAP, KaTeX).

## Gerar de novo

```
npm install
npm run build
cp dist/index.html apresentacao.html
```
