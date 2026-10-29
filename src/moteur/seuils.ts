/**
 * Seuils d'éligibilité au SMT (AUDCIF, art. 13).
 * Le logiciel alerte ; la bascule au Système normal relève de l'expert-comptable partenaire.
 */
import { preparer, signe, valeurFC, type Contexte } from './contexte';
import { encoursA, encoursOuverture, valeurTiersFC } from './tiers';
import type { DateISO, DossierExercice, Montant, SecteurSMT } from './types';

/** Chiffre d'affaires hors taxes annuel à ne pas atteindre, en francs congolais, par secteur. */
export type SeuilsSMT = Readonly<Record<SecteurSMT, Montant>>;

/** Part du seuil à partir de laquelle on prévient. */
export const PART_ALERTE_SEUIL = 0.8;

export type NiveauSeuil = 'sous_le_seuil' | 'approche' | 'depasse';

export function evaluerSeuil(chiffreAffaires: Montant, seuil: Montant): { seuil: Montant; ratio: number; niveau: NiveauSeuil } {
  const ratio = chiffreAffaires / seuil;
  const niveau: NiveauSeuil = ratio >= 1 ? 'depasse' : ratio >= PART_ALERTE_SEUIL ? 'approche' : 'sous_le_seuil';
  return { seuil, ratio, niveau };
}

/**
 * Chiffre d'affaires approché à une date : ventes encaissées,
 * plus la hausse des créances clients sur ventes. Une baisse n'est pas déduite (prudence).
 */
export function chiffreAffairesDepuisContexte(ctx: Contexte, date: DateISO): Montant {
  let ventes = 0;
  for (const op of ctx.operations) {
    if (op.date > date) break;
    if (op.nature === 'ventes') ventes += signe(op) * valeurFC(ctx, op);
  }
  let hausse = 0;
  for (const l of ctx.dossier.creances) {
    if (l.nature !== 'ventes') continue;
    hausse += valeurTiersFC(encoursA(ctx, 'creance', l, date), l, null);
    hausse -= valeurTiersFC(encoursOuverture(ctx, l), l, ctx.dossier.tauxOuverture);
  }
  return ventes + Math.max(0, hausse);
}

export function chiffreAffairesEstime(dossier: DossierExercice, date: DateISO): Montant {
  return chiffreAffairesDepuisContexte(preparer(dossier), date);
}
