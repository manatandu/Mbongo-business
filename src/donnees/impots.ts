/**
 * « Mes impôts » : ce que la loi fiscale dit de l'entreprise, d'après ses propres saisies. Aucun montant d'impôt.
 * Périmètre : l'IRPP des micro et petites entreprises (loi n° 23/053, art. 105 à 127), entreprise individuelle.
 * Le calcul de l'impôt, la déclaration et le choix d'un régime sont des actes de l'expert-comptable partenaire
 * (loi n° 15/002, art. 43.6 à 43.8) : le logiciel informe, il ne décide rien. Voir docs/cadre-petites-entreprises.md, § 3.
 */
import { chiffreAffairesEstime, type DateISO, type DossierExercice, type Montant } from '../moteur';
import { moisEntre } from '../moteur/dates';
import { echeances, profilEcheancier, SEUIL_MICRO, type Echeance } from './echeancier';

/** Au-delà, l'entreprise sort du régime de la petite entreprise (loi n° 23/053, art. 109). */
export const SEUIL_PETITE = 300_000_000;
/** Assujettissement à la TVA (OL n° 10/001, art. 14) : hors du périmètre de Mbongo, à voir avec l'expert. */
export const SEUIL_TVA = 80_000_000;

export type CleSeuil = 'micro' | 'tva' | 'petite';

export interface SeuilFiscal {
  cle: CleSeuil;
  montant: Montant;
  /** Part atteinte (0 à 1 et plus). */
  part: number;
}

export interface SituationImpots {
  ca: Montant;
  regime: 'micro' | 'petite' | 'au_dela';
  seuils: SeuilFiscal[];
  parMois: { mois: string; ca: Montant }[];
  /** Dépenses rangées en « Impôts et taxes » cette année, annulations déduites. */
  payes: { id: string; date: DateISO; libelle: string; montant: Montant; devise: string; piece: boolean }[];
  echeances: Echeance[];
}

const FISCALES = new Set(['impotPremier', 'impotSolde', 'forfaitMicro', 'irppSalaries']);

export function situationImpots(dossier: DossierExercice, date: DateISO): SituationImpots {
  const ref = date > dossier.exercice.fin ? dossier.exercice.fin : date;
  const ca = chiffreAffairesEstime(dossier, ref);
  const parMois: SituationImpots['parMois'] = [];
  let avant = 0;
  for (const m of moisEntre(dossier.exercice.debut.slice(0, 7), ref.slice(0, 7))) {
    const fin = m === ref.slice(0, 7) ? ref : finDuMois(m);
    const cumul = chiffreAffairesEstime(dossier, fin);
    parMois.push({ mois: m, ca: cumul - avant });
    avant = cumul;
  }
  const annulees = new Set(dossier.operations.flatMap((o) => (o.annule ? [o.annule] : [])));
  const payes = dossier.operations
    .filter((o) => o.nature === 'impots_taxes' && !o.annule && !annulees.has(o.id) && o.date <= ref)
    .map((o) => ({ id: o.id, date: o.date, libelle: o.libelle, montant: o.montant, devise: o.devise, piece: o.piece }));
  return {
    ca,
    regime: ca <= SEUIL_MICRO ? 'micro' : ca <= SEUIL_PETITE ? 'petite' : 'au_dela',
    seuils: [
      { cle: 'micro', montant: SEUIL_MICRO, part: ca / SEUIL_MICRO },
      { cle: 'tva', montant: SEUIL_TVA, part: ca / SEUIL_TVA },
      { cle: 'petite', montant: SEUIL_PETITE, part: ca / SEUIL_PETITE },
    ],
    parMois,
    payes,
    echeances: echeances(date, 366, profilEcheancier(dossier, date)).filter((e) => FISCALES.has(e.cle)),
  };
}

function finDuMois(m: string): DateISO {
  const [a, mm] = m.split('-').map(Number) as [number, number];
  return `${m}-${String(new Date(Date.UTC(a, mm, 0)).getUTCDate()).padStart(2, '0')}`;
}
