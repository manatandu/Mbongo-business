/**
 * Montants entiers et conversion de devises.
 * Seul endroit du moteur où l'on arrondit.
 */
import type { Devise, Montant } from './types';

/** Précision retenue pour un taux : quatre décimales. */
const PRECISION_TAUX = 10_000;

export function estMontant(v: unknown): v is Montant {
  return typeof v === 'number' && Number.isSafeInteger(v);
}

export function estTaux(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

/**
 * montant × taux ÷ diviseur, arrondi au plus proche (la moitié s'arrondit en s'éloignant de zéro).
 * Calcul exact en entiers longs : aucun flottant sur un montant.
 */
export function appliquerTaux(montant: Montant, taux: number, diviseur: number): Montant {
  if (montant === 0) return 0;
  const t = BigInt(Math.round(taux * PRECISION_TAUX));
  const d = BigInt(diviseur) * BigInt(PRECISION_TAUX);
  const produit = BigInt(Math.abs(montant)) * t;
  const q = Number((produit + d / 2n) / d);
  return montant < 0 ? -q : q;
}

/** Centimes de dollar en francs congolais. */
export function centimesEnFrancs(centimes: Montant, taux: number): Montant {
  return appliquerTaux(centimes, taux, 100);
}

/** Valeur en francs d'un montant exprimé dans sa devise. */
export function versFC(montant: Montant, devise: Devise, taux: number | null): Montant {
  if (devise === 'CDF' || montant === 0) return montant;
  if (!estTaux(taux)) throw new Error('Taux de change manquant pour un montant en dollars.');
  return centimesEnFrancs(montant, taux);
}

export function somme(valeurs: Iterable<Montant>): Montant {
  let total = 0;
  for (const v of valeurs) total += v;
  return total;
}
