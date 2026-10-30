/**
 * Copie de sauvegarde : un fichier JSON avec toutes les lignes d'une entreprise, et sa reprise sur un autre téléphone.
 * Les données sont en ajout seulement : reprendre une copie, c'est ajouter les lignes qui manquent (même identifiant
 * = même ligne). Rien n'est écrasé. Les photos des pièces ne sont pas dans la copie (trop lourdes).
 */
import type { BaseMbongo } from './base';
import { ecrireReglage, lireReglage } from './reglages';
import type { LigneEntreprise, LigneExercice } from './types';

export const FORMAT_COPIE = 'mbongo-copie-2';

const TABLES = ['exercices', 'comptes', 'operations', 'tiers', 'immobilisations', 'sorties', 'articles', 'mouvementsStock'] as const;
type TableCopie = (typeof TABLES)[number] | 'inventaires' | 'taux';

export interface Copie {
  format: string;
  creeLe: string;
  entreprise: LigneEntreprise;
  reglages?: { cle: string; valeur: unknown }[];
  [table: string]: unknown;
}

const cleDerniere = (entrepriseId: string) => `derniereCopie:${entrepriseId}`;

export async function faireCopie(db: BaseMbongo, entrepriseId: string): Promise<Copie> {
  const entreprise = await db.entreprises.get(entrepriseId);
  if (!entreprise) throw new Error('Entreprise introuvable.');
  const copie: Copie = { format: FORMAT_COPIE, creeLe: new Date().toISOString(), entreprise };
  for (const t of TABLES) copie[t] = await db.table(t).where('entrepriseId').equals(entrepriseId).toArray();
  const exercices = copie.exercices as LigneExercice[];
  copie.inventaires = await db.inventaires.where('exerciceId').anyOf(exercices.map((e) => e.id)).toArray();
  copie.taux = await db.taux.toArray();
  copie.reglages = (await db.reglages.toArray()).filter((r) => r.cle.endsWith(`:${entrepriseId}`) && !r.cle.startsWith('derniereCopie'));
  await ecrireReglage(db, cleDerniere(entrepriseId), copie.creeLe);
  return copie;
}

/** Date de la dernière copie faite sur ce téléphone, ou null. */
export const derniereCopie = (db: BaseMbongo, entrepriseId: string): Promise<string | null> => lireReglage<string | null>(db, cleDerniere(entrepriseId), null);

/** Ajoute ce qui manque. Renvoie le nombre de lignes ajoutées. L'entreprise reprise devient l'entreprise ouverte. */
export async function reprendreCopie(db: BaseMbongo, texte: string): Promise<number> {
  let copie: Copie;
  try {
    copie = JSON.parse(texte) as Copie;
  } catch {
    throw new Error("Ce fichier n'est pas une copie de Mbongo.");
  }
  if (!/^mbongo-copie-[12]$/.test(String(copie.format)) || !copie.entreprise?.id) throw new Error("Ce fichier n'est pas une copie de Mbongo.");
  const id = copie.entreprise.id;
  let ajoutees = 0;
  const tables: TableCopie[] = [...TABLES, 'inventaires', 'taux'];
  await db.transaction('rw', [db.entreprises, db.reglages, ...tables.map((t) => db.table(t))], async () => {
    if (!(await db.entreprises.get(id))) {
      await db.entreprises.add(copie.entreprise);
      ajoutees++;
    }
    for (const t of tables) {
      const lignes = Array.isArray(copie[t]) ? (copie[t] as { id: string; entrepriseId?: string }[]) : [];
      // Une ligne d'une autre entreprise n'a rien à faire ici.
      const propres = lignes.filter((l) => l && typeof l.id === 'string' && (l.entrepriseId === undefined || l.entrepriseId === id));
      const existants = new Set((await db.table(t).bulkGet(propres.map((l) => l.id))).flatMap((l: { id: string } | undefined) => (l ? [l.id] : [])));
      const nouvelles = propres.filter((l) => !existants.has(l.id));
      if (nouvelles.length) await db.table(t).bulkAdd(nouvelles);
      ajoutees += nouvelles.length;
    }
    for (const r of copie.reglages ?? []) if (r.cle.endsWith(`:${id}`) && !(await db.reglages.get(r.cle))) await db.reglages.put(r);
    await ecrireReglage(db, 'entrepriseActive', id);
  });
  return ajoutees;
}
