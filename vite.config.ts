import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Chemins relatifs : l'appli marche dans n'importe quel dossier d'un hébergement statique.
  base: './',
  plugins: [
    react(),
    // Appli installable qui s'ouvre sans réseau. Seule l'appli du commerçant est mise en cache :
    // le téléphone ne télécharge ni le bureau ni l'export Excel.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icone.svg', 'icone-192.png'],
      manifest: {
        name: 'Mbongo',
        short_name: 'Mbongo',
        description: 'Caisse, clients, fournisseurs et états du Système minimal de trésorerie, pour les petits commerçants.',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0b2a52',
        background_color: '#e9eef4',
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icone-masquable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Les icônes et le manifeste sont ajoutés par le plugin.
        globPatterns: ['index.html', 'assets/*.{js,css,woff2}'],
        globIgnores: ['**/bureau*', '**/excel-*'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/bureau\.html/],
        cleanupOutdatedCaches: true,
        // Prend la main dès la première visite : le bouton « Mettre à jour » marche même avant une réouverture.
        clientsClaim: true,
      },
    }),
  ],
  build: {
    rollupOptions: {
      // Deux entrées : le téléphone du commerçant ne télécharge jamais le bureau.
      input: { app: 'index.html', bureau: 'bureau.html' },
      output: {
        // Des morceaux à noms stables : la bibliothèque Excel à part, pour l'exclure du cache du téléphone ;
        // le code commun à l'appli et au bureau (React, Dexie, moteur) sous un seul nom.
        manualChunks: (id) => (/write-excel-file|fflate/.test(id) ? 'excel' : /node_modules|src\/(moteur|donnees|demo)\//.test(id) && !/workbox/.test(id) ? 'commun' : undefined),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
  },
});
