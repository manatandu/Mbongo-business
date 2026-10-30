/**
 * Ce que seul l'expert-comptable partenaire décide, au bureau, et que l'appli du commerçant lit :
 * - l'activation de l'estimation de l'IRPP pour ce client (loi n° 15/002, art. 43.6 et 43.7 : sans elle, rien ne s'affiche) ;
 * - le régime d'imposition confirmé pour une année (option pour le réel, art. 110 ; option ou qualité TVA, OL 10/001,
 *   art. 14 ; chiffre d'affaires d'avant Mbongo). Il prime sur le régime déduit des chiffres.
 * Limite connue : tant que les saisies ne passent pas par le serveur, ce réglage vit dans la base de l'appareil ;
 * au bureau de démonstration (même navigateur), l'appli le voit aussitôt.
 */
import type { DateISO } from '../moteur';
import type { BaseMbongo } from './base';
import type { Regime } from './regimes';
import { ecrireReglage, lireReglage } from './reglages';

export interface ActivationEstimation {
  active: boolean;
  /** Nom de l'expert-comptable inscrit qui l'a activée, affiché à l'écran du commerçant. */
  expert: string;
  le: DateISO;
}

export interface RegimeConfirme {
  annee: number;
  regime: Regime;
  /** Assujetti à la TVA cette année-là, selon l'expert. */
  tva: boolean;
  expert: string;
  le: DateISO;
}

const cleEstimation = (entrepriseId: string) => `estimationIrpp:${entrepriseId}`;
const cleRegime = (entrepriseId: string, annee: number) => `regimeConfirme:${entrepriseId}:${annee}`;

export const activationEstimation = (db: BaseMbongo, entrepriseId: string): Promise<ActivationEstimation | null> => lireReglage<ActivationEstimation | null>(db, cleEstimation(entrepriseId), null);

export async function activerEstimation(db: BaseMbongo, entrepriseId: string, active: boolean, expert: string, le: DateISO): Promise<void> {
  if (active && !expert.trim()) throw new Error("Indiquez le nom de l'expert-comptable inscrit.");
  await ecrireReglage(db, cleEstimation(entrepriseId), { active, expert: expert.trim(), le });
}

export const regimeConfirme = (db: BaseMbongo, entrepriseId: string, annee: number): Promise<RegimeConfirme | null> => lireReglage<RegimeConfirme | null>(db, cleRegime(entrepriseId, annee), null);

export async function confirmerRegime(db: BaseMbongo, entrepriseId: string, r: RegimeConfirme): Promise<void> {
  if (!r.expert.trim()) throw new Error("Indiquez le nom de l'expert-comptable inscrit.");
  await ecrireReglage(db, cleRegime(entrepriseId, r.annee), { ...r, expert: r.expert.trim() });
}

export const retirerRegimeConfirme = (db: BaseMbongo, entrepriseId: string, annee: number): Promise<void> => db.reglages.delete(cleRegime(entrepriseId, annee));
