import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Chemins relatifs : l'appli marche dans n'importe quel dossier d'un hébergement statique.
  base: './',
  plugins: [react()],
  build: {
    // Deux entrées : le téléphone du commerçant ne télécharge jamais le bureau.
    rollupOptions: { input: { app: 'index.html', bureau: 'bureau.html' } },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
  },
});
