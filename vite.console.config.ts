/**
 * Construction de la console de TRK Consulting, à part du logiciel : son propre dossier (dist-console),
 * sa propre adresse. Elle reprend la feuille de style et les composants du bureau.
 */
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'console',
  base: './',
  publicDir: false,
  plugins: [react()],
  css: { postcss: { plugins: [tailwindcss({ config: './tailwind.config.js' }), autoprefixer()] } },
  build: { outDir: '../dist-console', emptyOutDir: true, assetsInlineLimit: 0, copyPublicDir: false },
});
