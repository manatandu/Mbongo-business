/** Chargement du jeu de démonstration dans la base locale, sans réseau ni compte. */
import { valider, type DateISO } from '../moteur';
import { creerJeuDemo } from '../demo/jeu-demo';
import type { BaseMbongo } from './base';
import { retirerEntreprise } from './entreprise';
import { nouvelId } from './ids';
import { ecrireReglage } from './reglages';
import { enregistrerInventaire } from './saisie';
import type { Trace } from './types';

/** Inventaire compté le 31 décembre dans la boutique fictive, prêt à être validé. */
const INVENTAIRE_DEMO: [string, number, number][] = [
  ['Riz, sac de 25 kg', 40, 62_000],
  ['Huile, bidon de 5 L', 60, 18_500],
  ['Sucre, sac de 50 kg', 12, 98_000],
  ['Farine de maïs, sac de 25 kg', 30, 31_000],
  ['Lait en poudre, boîte', 80, 7_500],
  ['Savon, carton', 25, 24_000],
  ['Sardines, carton', 10, 52_000],
];

/**
 * Remplace toute démonstration existante par un jeu neuf, daté par rapport à aujourd'hui.
 * `finAnnee` : l'année passée entière, inventaire compté mais pas validé, pour montrer le passage à l'année suivante et l'arrêté.
 */
export async function chargerDemo(db: BaseMbongo, aujourdhui: DateISO, finAnnee = false): Promise<string> {
  for (const e of await db.entreprises.toArray()) if (e.demo) await retirerEntreprise(db, e.id);

  const jeu = creerJeuDemo(finAnnee ? `${Number(aujourdhui.slice(0, 4)) - 1}-12-31` : aujourdhui, () => nouvelId());
  const erreurs = valider(jeu.dossier);
  if (erreurs.length) throw new Error(`Jeu de démonstration invalide : ${erreurs.join(' ')}`);

  const trace: Trace = { entrepriseId: jeu.entreprise.id, auteur: 'demo', creeLe: jeu.entreprise.creeLe, envoi: 'local' };
  await db.transaction('rw', [db.entreprises, db.exercices, db.comptes, db.operations, db.tiers, db.immobilisations, db.taux, db.reglages], async () => {
    await db.entreprises.add(jeu.entreprise);
    await db.exercices.add(jeu.exercice);
    await db.comptes.bulkAdd(jeu.comptes);
    // Ordre de saisie conservé à date égale.
    await db.operations.bulkAdd(jeu.operations.map((o, i) => ({ ...o, ...trace, creeLe: `${o.date}T08:${String(Math.floor(i / 60) % 60).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}.000Z` })));
    await db.tiers.bulkAdd(jeu.tiers.map((t) => ({ ...t, ...trace })));
    await db.immobilisations.bulkAdd(jeu.immobilisations.map((i) => ({ ...i, ...trace })));
    await db.taux.bulkPut(jeu.taux);
    await ecrireReglage(db, 'entrepriseActive', jeu.entreprise.id);
  });
  if (finAnnee) {
    await enregistrerInventaire(
      db,
      jeu.exercice.id,
      INVENTAIRE_DEMO.map(([designation, quantite, prixUnitaire], k) => ({ reference: `L${k + 1}`, designation, quantite, prixUnitaire, montant: quantite * prixUnitaire })),
    );
  }
  return jeu.entreprise.id;
}
