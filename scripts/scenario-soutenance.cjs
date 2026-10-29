/**
 * Scénario de la soutenance, rejoué de bout en bout (docs/soutenance.md).
 * Téléphone du commerçant (360 px) et bureau (1366 px), sur la boutique fictive.
 * Produit une capture par étape, pour le mémoire et les diapositives, et deux vidéos (plan B).
 *
 * Usage : npm run build && npm run scenario [dossier] (par défaut : soutenance/)
 * Variables : DATE=2027-06-20 rejoue le scénario à cette date ; LENT=1 laisse le temps de lire la vidéo.
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { attendre, lancerServeur } = require('./serveur.cjs');

const PORT = 4176;
const BASE = `http://localhost:${PORT}/`;
const SORTIE = path.resolve(process.argv[2] || 'soutenance');
const PAUSE = process.env.LENT ? 1800 : 400;

(async () => {
  fs.mkdirSync(path.join(SORTIE, 'video'), { recursive: true });
  const srv = await lancerServeur(PORT);
  const navigateur = await chromium.launch();
  const ctx = await navigateur.newContext({
    deviceScaleFactor: 2,
    locale: 'fr-FR',
    acceptDownloads: true,
    recordVideo: { dir: path.join(SORTIE, 'video'), size: { width: 1366, height: 768 } },
  });
  if (process.env.DATE) await ctx.clock.setFixedTime(new Date(`${process.env.DATE}T10:00:00`));
  const tel = await ctx.newPage();
  await tel.setViewportSize({ width: 360, height: 760 });
  const bur = await ctx.newPage();
  await bur.setViewportSize({ width: 1366, height: 768 });
  const erreurs = [];
  for (const p of [tel, bur]) p.on('pageerror', (e) => erreurs.push(String(e)));

  let n = 0;
  async function etape(page, nom, action, { pleinePage = false } = {}) {
    n++;
    const fichier = `${String(n).padStart(2, '0')}-${nom}.png`;
    try {
      await action();
      await attendre(PAUSE);
      await page.screenshot({ path: path.join(SORTIE, fichier), fullPage: pleinePage });
      console.log(`OK    ${fichier}`);
    } catch (x) {
      await page.screenshot({ path: path.join(SORTIE, `ECHEC-${fichier}`) }).catch(() => {});
      throw new Error(`Étape ${n} (${nom}) : ${x.message}`);
    }
  }
  const tap = (txt) => tel.getByText(txt, { exact: true }).first().click();

  try {
    const annee = Number((process.env.DATE || new Date().toISOString()).slice(0, 4));

    // 1. Le commerçant, sur son téléphone.
    await etape(tel, 'bienvenue', async () => {
      await tel.goto(BASE);
      await tel.waitForSelector('text=Voir la démonstration');
    });
    await etape(tel, 'accueil', async () => {
      await tap('Voir la démonstration');
      await tel.waitForSelector('text=Argent disponible');
    });
    await etape(tel, 'vente-du-jour', async () => {
      await tap('+ Recette');
      await tel.fill('input.montant', '85000');
    });
    await etape(tel, 'vente-enregistree', async () => {
      await tel.click('button[type="submit"]');
      await tel.waitForSelector('text=Enregistré dans le journal');
    });
    await etape(tel, 'vente-a-credit', async () => {
      await tel.goto(`${BASE}#/saisir/recette`);
      await tap('Vente à crédit');
      await tel.fill('input.montant', '240000');
      await tel.getByRole('textbox', { name: 'Client', exact: true }).fill('Papa Mukendi (fictif)');
      await tel.getByLabel('N° de facture').fill('F-4021');
      await tel.click('button[type="submit"]');
      await tel.waitForSelector('text=Ajouté aux créances');
      await tel.goto(`${BASE}#/clients`);
      await tel.waitForSelector('text=Papa Mukendi (fictif)');
    });
    await etape(tel, 'encaissement-partiel', async () => {
      const ligne = tel.locator('.ligne', { hasText: 'Papa Mukendi (fictif)' });
      await ligne.getByRole('button', { name: 'Encaisser' }).click();
      await ligne.getByLabel(/Montant/).fill('100000');
      await ligne.locator('.actions').getByRole('button', { name: 'Encaisser' }).click();
      await tel.waitForSelector('text=Encaissement enregistré');
      await tel.waitForSelector('text=/reste 140\\s000/');
    });
    await etape(tel, 'journal', async () => {
      await tel.goto(`${BASE}#/journal`);
      await tel.waitForSelector('text=Début du mois');
    });
    await etape(
      tel,
      'etats-telephone',
      async () => {
        await tel.goto(`${BASE}#/etats`);
        await tel.waitForSelector('text=Non arrêtés.');
      },
      { pleinePage: true },
    );
    await etape(tel, 'accueil-lingala', async () => {
      await tel.goto(`${BASE}#/reglages`);
      await tap('Lingala');
      await tel.goto(`${BASE}#/`);
      await tel.waitForSelector('.hero');
    });
    await tel.goto(`${BASE}#/reglages`);
    await tap('Français');

    // 2. Le bureau de la structure.
    await etape(bur, 'bureau-clients', async () => {
      await bur.goto(`${BASE}bureau.html`);
      await bur.waitForSelector('td:has-text("Alimentation Maman Nsimba")');
    });
    await etape(bur, 'bureau-controles', async () => {
      await bur.click('td:has-text("Alimentation Maman Nsimba")');
      await bur.waitForSelector('text=À vérifier');
    });
    await etape(
      bur,
      'bureau-etats',
      async () => {
        await bur.getByRole('tab', { name: 'États SMT' }).click();
        await bur.waitForSelector('text=Arrêté par');
        const [fichier] = await Promise.all([bur.waitForEvent('download'), bur.click('text=Exporter en Excel')]);
        await fichier.saveAs(path.join(SORTIE, fichier.suggestedFilename()));
      },
      { pleinePage: true },
    );
    await etape(bur, 'bureau-expert-conditions', async () => {
      await bur.selectOption('header select', 'expert');
      await bur.locator('text=Arrêté par').scrollIntoViewIfNeeded();
    });

    // 3. La fin de l'année : inventaire, nouvelle année, arrêté.
    const passee = annee - 1;
    await etape(tel, 'fin-annee', async () => {
      await tel.goto(`${BASE}#/reglages`);
      await tap("Voir la fin d'année (année passée)");
      await tel.waitForSelector(`text=L'année ${passee} est finie`);
    });
    await etape(tel, 'inventaire', async () => {
      await tap("Faire l'inventaire");
      await tel.waitForSelector('text=Inventaire du stock');
      await tel.waitForSelector('input[value="Riz, sac de 25 kg"]');
    });
    await etape(tel, 'nouvelle-annee-prete', async () => {
      tel.once('dialog', (d) => d.accept());
      await tap("Valider l'inventaire");
      await tel.waitForSelector('text=Inventaire validé');
      await tel.goto(`${BASE}#/`);
      await tel.waitForSelector('text=Stock compté');
    });
    await etape(tel, 'nouvelle-annee', async () => {
      await tap(`Commencer ${annee}`);
      await tel.waitForSelector(`text=L'année ${annee} est commencée`);
    });
    await etape(bur, 'bureau-annee-a-arreter', async () => {
      await bur.goto(`${BASE}bureau.html#/`);
      await bur.waitForSelector(`text=États ${passee} à arrêter`);
    });
    await etape(
      bur,
      'etats-arretes',
      async () => {
        await bur.click('td:has-text("Alimentation Maman Nsimba")');
        await bur.selectOption('select[aria-label="Exercice"]', String(passee));
        await bur.getByRole('tab', { name: 'États SMT' }).click();
        await bur.click(`text=Arrêter les états ${passee}`);
        await bur.waitForSelector('text=/Arrêtés le/');
      },
      { pleinePage: true },
    );

    if (erreurs.length) throw new Error(`Erreurs dans la page : ${erreurs.join(' | ')}`);
    console.log(`\nScénario complet : ${n} étapes. Captures et classeur Excel dans ${SORTIE}`);
  } catch (x) {
    console.error(`\nÉCHEC ${x.message}`);
    process.exitCode = 1;
  } finally {
    const videos = [
      [tel, 'telephone.webm'],
      [bur, 'bureau.webm'],
    ];
    await ctx.close();
    for (const [p, nom] of videos) {
      const v = p.video();
      if (v) fs.renameSync(await v.path(), path.join(SORTIE, 'video', nom));
    }
    await navigateur.close();
    srv.kill();
  }
})();
