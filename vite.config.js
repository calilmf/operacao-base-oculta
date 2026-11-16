import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Gera um único apresentacao.html autocontido (JS, CSS e fontes embutidos),
// que o notebook do Colab baixa, preenche com a solução do Pyomo e abre.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { assetsInlineLimit: 100000000, chunkSizeWarningLimit: 4000 },
});
