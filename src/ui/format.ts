/** Affichage et lecture des montants et des dates, à la française. */
import type { DateISO, Devise, Montant } from '../moteur';

const entier = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Espace normale à la place de l'espace fine insécable : plus lisible sur les petits écrans Android.
const espaces = (s: string): string => s.replace(/[  ]/g, ' ');

/** 1234567 → « 1 234 567 », −5 → « −5 ». */
export const fmt = (n: number): string => (n < 0 ? '−' : '') + espaces(entier.format(Math.abs(n)));

/** Montant dans sa devise : « 12 500 FC » ou « 123,45 $ » (le dollar est stocké en centimes). */
export function fmtMontant(m: Montant, devise: Devise): string {
  if (devise === 'CDF') return `${fmt(m)} FC`;
  return `${m < 0 ? '−' : ''}${espaces(cents.format(Math.abs(m) / 100))} $`;
}

/** Montant nu, sans symbole, dans sa devise. */
export function fmtNu(m: Montant, devise: Devise): string {
  return devise === 'CDF' ? fmt(m) : (m < 0 ? '−' : '') + espaces(cents.format(Math.abs(m) / 100));
}

export const fmtDate = (d: DateISO): string => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
export const fmtJourMois = (d: DateISO): string => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

/**
 * Lit un montant tapé au clavier. Francs : entier, les points et espaces sont des séparateurs de milliers.
 * Dollars : jusqu'à deux décimales, virgule ou point. Renvoie des centimes pour le dollar, ou null.
 */
export function lireMontant(texte: string, devise: Devise): Montant | null {
  const brut = texte.replace(/[\s  ]/g, '');
  if (!brut) return null;
  if (devise === 'CDF') {
    const chiffres = brut.replace(/[.,](?=\d{3}(\D|$))/g, '');
    return /^\d+$/.test(chiffres) ? Number(chiffres) : null;
  }
  const m = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(brut);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
}

/** Lit un taux, avec virgule ou point. */
export function lireTaux(texte: string): number | null {
  const n = Number(texte.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Date du jour sur le téléphone, en heure locale. */
export function aujourdhuiLocal(maintenant = new Date()): DateISO {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${maintenant.getFullYear()}-${p(maintenant.getMonth() + 1)}-${p(maintenant.getDate())}`;
}
