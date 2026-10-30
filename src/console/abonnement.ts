/**
 * Règles des abonnements de la console TRK : formules, tarifs, dates, état d'un abonnement.
 * Module pur, testé (tests/console/abonnement.test.ts). Les rappels SMS sont calculés dans la base
 * (supabase/migrations), avec les mêmes fenêtres que `etatAbonnement`.
 */
import { ajouterJours, ecartJours } from '../moteur/dates';
import type { DateISO } from '../moteur/types';

/**
 * Formules vendues par TRK Consulting. Les missions de l'expert-comptable partenaire n'en font pas partie :
 * il les facture et les encaisse lui-même (loi n° 15/002, art. 50 : honoraires « exclusifs de toute autre
 * rémunération, même indirecte, d'un tiers »). La base refuse toute nouvelle formule « expert »
 * (supabase/migrations/20261101_sans_formule_expert.sql).
 */
export type FormuleTRK = 'essentiel' | 'suivi';
/** Formule lue dans la base : « expert » ne reste que sur d'anciennes lignes. */
export type Formule = FormuleTRK | 'expert';

export const FORMULES: readonly FormuleTRK[] = ['essentiel', 'suivi'];

/** Tarifs 2026 en francs congolais (page Mbongo Business). */
export const TARIFS: Record<FormuleTRK, number> = { essentiel: 25_000, suivi: 50_000 };
export const MISE_EN_PLACE = 30_000;

export const LIBELLE_FORMULE: Record<Formule, string> = { essentiel: 'Essentiel', suivi: 'Suivi', expert: 'Ancienne formule (plus vendue)' };

export const estFormuleTRK = (f: Formule | null | undefined): f is FormuleTRK => f === 'essentiel' || f === 'suivi';

/** Tarif mensuel d'une formule de TRK ; 0 pour une ancienne formule ou aucune. */
export const tarifMensuel = (f: Formule | null | undefined): number => (estFormuleTRK(f) ? TARIFS[f] : 0);

/** Fin d'un abonnement de `mois` mois qui commence le `debut` : la veille du même jour, `mois` mois plus tard. */
export function finAbonnement(debut: DateISO, mois: number): DateISO {
  const a = Number(debut.slice(0, 4));
  const m = Number(debut.slice(5, 7));
  const j = Number(debut.slice(8, 10));
  const cible = new Date(Date.UTC(a, m - 1 + mois, 1));
  const dernierJour = new Date(Date.UTC(cible.getUTCFullYear(), cible.getUTCMonth() + 1, 0)).getUTCDate();
  cible.setUTCDate(Math.min(j, dernierJour));
  return ajouterJours(cible.toISOString().slice(0, 10), -1);
}

/** Un renouvellement commence le lendemain de la fin, ou aujourd'hui si l'abonnement est déjà fini depuis longtemps. */
export function debutRenouvellement(fin: DateISO, aujourdhui: DateISO): DateISO {
  const lendemain = ajouterJours(fin, 1);
  return ecartJours(lendemain, aujourdhui) > 30 ? aujourdhui : lendemain;
}

export type EtatAbonnement = 'aucun' | 'en_cours' | 'bientot' | 'echeance' | 'retard' | 'fini';

/** Fenêtres identiques aux rappels SMS : 10 jours avant, le jour même, 30 jours de retard. */
export function etatAbonnement(joursRestants: number | null): EtatAbonnement {
  if (joursRestants === null) return 'aucun';
  if (joursRestants > 10) return 'en_cours';
  if (joursRestants > 0) return 'bientot';
  if (joursRestants === 0) return 'echeance';
  if (joursRestants >= -30) return 'retard';
  return 'fini';
}

/** Numéro congolais au format international : « 0983 510 725 » ou « 983510725 » donnent « +243983510725 ». */
export function normaliserTelephone(saisi: string): string | null {
  const chiffres = saisi.replace(/[\s.\-()]/g, '');
  let n = chiffres;
  if (n.startsWith('00')) n = '+' + n.slice(2);
  if (/^0\d{9}$/.test(n)) n = '+243' + n.slice(1);
  if (/^\d{9}$/.test(n)) n = '+243' + n;
  return /^\+\d{8,15}$/.test(n) ? n : null;
}

/** « +243983510725 » s'affiche « +243 983 510 725 ». */
export function afficherTelephone(t: string): string {
  const m = /^\+243(\d{3})(\d{3})(\d{3})$/.exec(t);
  return m ? `+243 ${m[1]} ${m[2]} ${m[3]}` : t;
}
