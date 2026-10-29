/**
 * Essai en mode avion de l'appli du commerçant, sur un téléphone d'entrée de gamme simulé
 * (écran de 360 px, processeur ralenti quatre fois).
 *
 * 1. Première ouverture avec internet : l'appli se met en cache.
 * 2. Mode avion : l'appli s'ouvre quand même, charge la démonstration, enregistre une vente.
 * 3. Toujours en mode avion, on rouvre l'appli : la vente est toujours là.
 * 4. Le bureau n'est pas dans le cache du téléphone.
 *
 * Usage : npm run build && npm run essai:hors-ligne [dossier-des-captures]
 */
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

const PORT = 4174;
const URL_APPLI = `http://localhost:${PORT}/`;
const captures = process.argv[2];

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
let echecs = 0;
function verifier(condition, message) {
  console.log(`${condition ? 'OK   ' : 'ÉCHEC'} ${message}`);
  if (!condition) echecs++;
}

async function serveur() {
  // Vite lancé directement (pas par npx) : à la fin, on arrête bien le serveur lui-même.
  const p = spawn(path.join(__dirname, '..', 'node_modules', '.bin', 'vite'), ['preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(URL_APPLI)).ok) return p;
    } catch {
      // pas encore prêt
    }
    await attendre(200);
  }
  p.kill();
  throw new Error('Le serveur de prévisualisation ne répond pas. La construction a-t-elle été faite (npm run build) ?');
}

(async () => {
  const srv = await serveur();
  const navigateur = await chromium.launch();
  try {
    const ctx = await navigateur.newContext({ viewport: { width: 360, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR' });
    const page = await ctx.newPage();
    const erreurs = [];
    page.on('pageerror', (e) => erreurs.push(String(e)));
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    // 1. Première ouverture, avec internet.
    await page.goto(URL_APPLI);
    await page.waitForSelector('text=Voir la démonstration');
    const sw = await page.evaluate(async () => {
      const r = await navigator.serviceWorker.ready;
      return Boolean(r.active);
    });
    verifier(sw, "service worker actif après la première ouverture");
    const manifeste = await page.evaluate(async () => (await fetch(document.querySelector('link[rel="manifest"]').href)).json());
    verifier(manifeste.display === 'standalone' && manifeste.icons.length === 3, 'manifeste complet (plein écran, trois icônes)');
    await attendre(1500); // le temps de remplir le cache

    // 2. Mode avion.
    await ctx.setOffline(true);
    let debut = Date.now();
    await page.reload();
    await page.waitForSelector('text=Voir la démonstration', { timeout: 15_000 });
    verifier(true, `l'appli s'ouvre sans réseau (${Date.now() - debut} ms)`);

    debut = Date.now();
    await page.click('text=Voir la démonstration');
    await page.waitForSelector('text=Argent disponible', { timeout: 30_000 });
    verifier(true, `démonstration chargée sans réseau (${Date.now() - debut} ms)`);
    if (captures) await page.screenshot({ path: `${captures}/hl-1-accueil.png` });

    await page.goto(`${URL_APPLI}#/saisir/recette`);
    await page.fill('input.montant', '123456');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Enregistré dans le journal', { timeout: 10_000 });
    verifier(true, 'vente enregistrée sans réseau');

    // 3. On ferme et on rouvre, toujours sans réseau.
    await page.reload();
    await page.goto(`${URL_APPLI}#/journal`);
    const trouvee = await page.getByText(/123\s456/).first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
    verifier(trouvee, 'la vente est toujours dans le journal après réouverture');
    if (captures) await page.screenshot({ path: `${captures}/hl-2-journal.png` });

    await page.goto(`${URL_APPLI}#/reglages`);
    const message = await page.waitForSelector('text=Mbongo marche sans internet sur ce téléphone.', { timeout: 10_000 }).then(() => true, () => false);
    verifier(message, 'Réglages : « Mbongo marche sans internet sur ce téléphone. »');
    if (captures) await page.screenshot({ path: `${captures}/hl-3-reglages.png`, fullPage: true });

    // 4. Le bureau n'est pas téléchargé par le téléphone.
    const enCache = await page.evaluate(async () => {
      const urls = [];
      for (const nom of await caches.keys()) for (const r of await (await caches.open(nom)).keys()) urls.push(r.url);
      return urls;
    });
    verifier(!enCache.some((u) => /bureau|excel/.test(u)), `ni bureau ni export Excel dans le cache (${enCache.length} fichiers en cache)`);

    verifier(erreurs.length === 0, `aucune erreur dans la page${erreurs.length ? ' : ' + erreurs.join(' | ') : ''}`);
  } finally {
    await navigateur.close();
    srv.kill();
  }
  console.log(echecs ? `\n${echecs} échec(s).` : '\nTout passe en mode avion.');
  process.exit(echecs ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
