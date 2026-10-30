/**
 * En-tête commun des états, au bureau, à l'impression et dans l'Excel (Titre X, ch. 2 ; AUDCIF, art. 22.7) :
 * entité, numéro d'identification, exercice du … au …, durée en mois, statut, date d'édition.
 */
import type { DateISO, Etats } from '../moteur';
import { formuleArrete, type IdentiteExpert } from '../donnees/bureau';

const jj = (d: DateISO) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

/** Statut des états et marque des données de démonstration. */
export interface Mentions {
  arreteLe?: DateISO | null;
  /** Expert-comptable partenaire qui a revu les états arrêtés. */
  expert?: IdentiteExpert | null;
  /** Date d'édition du document. */
  editeLe?: DateISO;
  fictif?: boolean;
}

/** Durée de l'exercice en mois entiers, arrondie au mois le plus proche (12 pour un exercice civil). */
export function dureeMois(debut: DateISO, fin: DateISO): number {
  const [ad, md, jd] = debut.split('-').map(Number) as [number, number, number];
  const [af, mf, jf] = fin.split('-').map(Number) as [number, number, number];
  // Le lendemain de la fin, moins le début, en mois et fraction de mois.
  const mois = (af - ad) * 12 + (mf - md) + (jf + 1 - jd) / 30;
  return Math.max(1, Math.round(mois));
}

export const statutEtats = (m: Mentions): string => (m.arreteLe ? formuleArrete(m.arreteLe, m.expert ?? null) : 'Non arrêtés');

/** Les champs de l'en-tête, dans l'ordre : libellé, valeur. */
export function champsEntete(e: Etats, m: Mentions): [string, string][] {
  const { debut, fin } = e.exercice;
  const champs: [string, string][] = [
    ['Entité', e.entreprise.nom],
    ["N° d'identification", e.entreprise.nif || 'néant'],
    ['Exercice', `du ${jj(debut)} au ${jj(fin)}`],
    ['Durée', `${dureeMois(debut, fin)} mois`],
    ['Situation', e.provisoire ? `provisoire au ${jj(e.auDate)}` : 'définitive'],
    ['Statut', statutEtats(m)],
  ];
  if (m.editeLe) champs.push(['Édité le', jj(m.editeLe)]);
  return champs;
}
