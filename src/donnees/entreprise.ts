/** Création de l'entreprise sur le téléphone et choix de l'exercice ouvert. */
import type { Devise, Montant, SecteurSMT, TypeCompte } from '../moteur';
import { TABLES_ENTREPRISE, type BaseMbongo } from './base';
import { nouvelId } from './ids';
import { ecrireReglage, lireReglage } from './reglages';
import type { LigneEntreprise, LigneExercice } from './types';

export interface CompteACreer {
  type: TypeCompte;
  libelle: string;
  devise: Devise;
  /** Solde au 1er janvier, dans la devise du compte. */
  solde: Montant;
}

export interface DonneesEntreprise {
  nom: string;
  activite: string;
  secteur: SecteurSMT;
  commune: string;
  nif: string;
  responsable: string;
  telephone: string;
  annee: number;
  comptes: CompteACreer[];
  stockInitial: Montant;
  /** Requis si un compte en dollars a un solde d'ouverture. */
  tauxOuverture: number | null;
  demo?: boolean;
}

export async function creerEntreprise(db: BaseMbongo, d: DonneesEntreprise): Promise<{ entrepriseId: string; exerciceId: string }> {
  if (!d.nom.trim()) throw new Error("Indiquez le nom de l'entreprise.");
  if (!d.comptes.some((c) => c.type === 'caisse')) throw new Error('Il faut au moins une caisse.');
  const entrepriseId = nouvelId();
  const exerciceId = nouvelId();
  const comptes = d.comptes.map((c, ordre) => ({ id: nouvelId(), entrepriseId, ordre, type: c.type, libelle: c.libelle, devise: c.devise }));
  const soldesOuverture = Object.fromEntries(comptes.map((c, i) => [c.id, d.comptes[i]?.solde ?? 0]));
  await db.transaction('rw', [db.entreprises, db.exercices, db.comptes, db.reglages], async () => {
    await db.entreprises.add({
      id: entrepriseId,
      nom: d.nom.trim(),
      activite: d.activite.trim(),
      secteur: d.secteur,
      commune: d.commune.trim(),
      nif: d.nif.trim(),
      responsable: d.responsable.trim(),
      telephone: d.telephone.trim(),
      demo: d.demo ?? false,
      creeLe: new Date().toISOString(),
    });
    await db.comptes.bulkAdd(comptes);
    await db.exercices.add({
      id: exerciceId,
      entrepriseId,
      annee: d.annee,
      debut: `${d.annee}-01-01`,
      fin: `${d.annee}-12-31`,
      statut: 'ouvert',
      soldesOuverture,
      tauxOuverture: d.tauxOuverture,
      empruntOuverture: 0,
      stockInitial: d.stockInitial,
      stockFinal: null,
      tauxCloture: null,
    });
    await ecrireReglage(db, 'entrepriseActive', entrepriseId);
  });
  return { entrepriseId, exerciceId };
}

/** Retire de l'appareil une entreprise et toutes ses données. Réservé aux données de démonstration. */
export async function retirerEntreprise(db: BaseMbongo, entrepriseId: string): Promise<void> {
  const e = await db.entreprises.get(entrepriseId);
  if (!e) return;
  if (!e.demo) throw new Error("Les données réelles d'une entreprise ne s'effacent pas depuis l'appli.");
  const exercices = await db.exercices.where('entrepriseId').equals(entrepriseId).primaryKeys();
  await db.transaction('rw', [db.entreprises, db.exercices, db.inventaires, db.reglages, ...TABLES_ENTREPRISE.map((t) => db.table(t))], async () => {
    for (const t of TABLES_ENTREPRISE) await db.table(t).where('entrepriseId').equals(entrepriseId).delete();
    await db.inventaires.where('exerciceId').anyOf(exercices).delete();
    await db.exercices.where('entrepriseId').equals(entrepriseId).delete();
    await db.entreprises.delete(entrepriseId);
    if ((await lireReglage<string | null>(db, 'entrepriseActive', null)) === entrepriseId) await db.reglages.delete('entrepriseActive');
  });
}

export async function entrepriseActive(db: BaseMbongo): Promise<LigneEntreprise | undefined> {
  const id = await lireReglage<string | null>(db, 'entrepriseActive', null);
  return id ? db.entreprises.get(id) : undefined;
}

/** Exercice de l'année demandée, ou à défaut le plus récent avant elle. */
export async function exerciceCourant(db: BaseMbongo, entrepriseId: string, annee: number): Promise<LigneExercice | undefined> {
  const tous = await db.exercices.where('entrepriseId').equals(entrepriseId).toArray();
  return tous.filter((e) => e.annee <= annee).sort((a, b) => b.annee - a.annee)[0] ?? tous.sort((a, b) => a.annee - b.annee)[0];
}
