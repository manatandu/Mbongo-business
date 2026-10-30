// Produit les icônes PNG de l'appli installable à partir de public/icone.svg (Chromium pré-installé).
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const svg = fs.readFileSync(path.join(__dirname, '../public/icone.svg'), 'utf8');
  const navigateur = await chromium.launch();
  const page = await navigateur.newPage();
  const tailles = [
    ['icone-192.png', 192, false],
    ['icone-512.png', 512, false],
    ['icone-masquable-512.png', 512, true],
  ];
  for (const [nom, taille, masquable] of tailles) {
    // Une icône masquable garde son motif dans la zone sûre (80 %) ; le fond déborde jusqu'aux bords.
    const contenu = masquable
      ? `<div style="width:${taille}px;height:${taille}px;background:#0B2A52;display:grid;place-items:center"><div style="width:${taille * 0.8}px;height:${taille * 0.8}px">${svg.replace('rx="112"', 'rx="0"')}</div></div>`
      : `<div style="width:${taille}px;height:${taille}px">${svg}</div>`;
    await page.setViewportSize({ width: taille, height: taille });
    await page.setContent(`<html><body style="margin:0;background:transparent">${contenu}</body></html>`);
    await page.screenshot({ path: path.join(__dirname, '../public', nom), omitBackground: true });
  }
  await navigateur.close();
  console.log('Icônes produites.');
})();
