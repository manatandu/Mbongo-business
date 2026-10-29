/** Chargement du jeu de démonstration dans la base locale, sans réseau ni compte. */
import { valider, type DateISO } from '../moteur';
import { creerJeuDemo } from '../demo/jeu-demo';
import type { BaseMbongo } from './base';
import { retirerEntreprise } from './entreprise';
import { nouvelId } from './ids';
import { ecrireReglage } from './reglages';
import type { Trace } from './types';

/** Remplace toute démonstration existante par un jeu neuf, daté par rapport à aujourd'hui. */
export async function chargerDemo(db: BaseMbongo, aujourdhui: DateISO): Promise<string> {
  for (const e of await db.entreprises.toArray()) if (e.demo) await retirerEntreprise(db, e.id);

  const jeu = creerJeuDemo(aujourdhui, () => nouvelId());
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
  return jeu.entreprise.id;
}
