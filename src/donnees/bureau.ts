/**
 * Bureau de la structure : l'assistant consulte et contrôle, l'expert-comptable partenaire arrête les états.
 * L'assistant n'écrit rien dans le dossier du commerçant (loi n° 15/002, art. 43.1).
 */
import { calculerEtats, controler, type DateISO } from '../moteur';
import type { BaseMbongo } from './base';
import type { Chargement } from './dossier';
import { PARAMETRES_CONTROLE } from './parametres';
import { ErreurSaisie } from './saisie';

/** Résumé d'un dossier pour la liste des clients. */
export function resumeDossier(c: Chargement, aujourdhui: DateISO) {
  const ref = aujourdhui > c.exercice.fin ? c.exercice.fin : aujourdhui;
  const anomalies = controler(c.dossier, ref, PARAMETRES_CONTROLE).filter((a) => a.niveau !== 'information');
  const etats = calculerEtats(c.dossier, { auDate: ref });
  const derniere = c.dossier.operations.reduce((m, o) => (o.date > m ? o.date : m), '');
  return {
    derniereSaisie: derniere || null,
    ventes: etats.compteDeResultat.recettesVentes,
    resultat: etats.compteDeResultat.G,
    aTraiter: anomalies.filter((a) => a.niveau === 'a_traiter').length,
    aRevoir: anomalies.filter((a) => a.niveau === 'a_revoir').length,
    anomalies,
  };
}

/** Ce qui empêche encore l'arrêté ; liste vide : l'expert peut arrêter. */
export function obstaclesArrete(c: Chargement, aujourdhui: DateISO): string[] {
  const { dossier, exercice } = c;
  const obstacles: string[] = [];
  if (aujourdhui < exercice.fin) obstacles.push(`L'exercice se termine le 31/12/${exercice.annee}.`);
  if (exercice.stockFinal === null) obstacles.push("Le commerçant n'a pas encore validé l'inventaire du stock.");
  const dollars = dossier.comptes.some((x) => x.devise === 'USD') || [...dossier.creances, ...dossier.dettes].some((l) => l.devise === 'USD');
  if (dollars && exercice.tauxCloture === null) obstacles.push('Saisissez le taux du dollar au 31 décembre.');
  return obstacles;
}

export async function definirTauxCloture(db: BaseMbongo, exerciceId: string, taux: number): Promise<void> {
  if (!(taux > 0)) throw new ErreurSaisie(['Taux invalide.']);
  const ex = await db.exercices.get(exerciceId);
  if (!ex) throw new ErreurSaisie(['Exercice introuvable.']);
  if (ex.statut === 'arrete') throw new ErreurSaisie(['Les états sont arrêtés.']);
  await db.exercices.update(exerciceId, { tauxCloture: taux });
}

/** L'expert arrête les états : le téléphone ne peut plus saisir sur cet exercice. */
export async function arreterEtats(db: BaseMbongo, c: Chargement, aujourdhui: DateISO): Promise<void> {
  const obstacles = obstaclesArrete(c, aujourdhui);
  if (obstacles.length) throw new ErreurSaisie(obstacles);
  await db.exercices.update(c.exercice.id, { statut: 'arrete', arreteLe: aujourdhui });
}

/** L'expert annule son arrêté (une saisie oubliée, par exemple) : le commerçant peut de nouveau saisir. */
export async function annulerArrete(db: BaseMbongo, exerciceId: string): Promise<void> {
  await db.exercices.update(exerciceId, { statut: 'ouvert', arreteLe: null });
}
