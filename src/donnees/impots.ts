/**
 * « Mes impôts » : ce que la loi fiscale dit de l'entreprise, d'après ses propres saisies. Aucun montant d'impôt.
 * Périmètre : l'IRPP des micro et petites entreprises (loi n° 23/053, art. 105 à 128), entreprise individuelle.
 * Le calcul de l'impôt, la déclaration et le choix d'un régime sont des actes de l'expert-comptable partenaire
 * (loi n° 15/002, art. 43.6 à 43.8) : le logiciel informe, il ne décide rien. Règles de régime : regimes.ts.
 */
import type { DateISO, DossierExercice, Montant } from '../moteur';
import { moisEntre } from '../moteur/dates';
import { echeances, profilEcheancier, type Echeance } from './echeancier';
import { chiffreAffairesRealise, regimeFiscal, SEUIL_MICRO, SEUIL_PETITE, SEUIL_TVA, type AnneeCA, type RegimeFiscal } from './regimes';

export type CleSeuil = 'micro' | 'tva' | 'petite';

export interface SeuilFiscal {
  cle: CleSeuil;
  montant: Montant;
  /** Part atteinte par le chiffre de l'année (0 à 1 et plus). */
  part: number;
}

export interface SituationImpots extends RegimeFiscal {
  ca: Montant;
  /** Années précédentes tenues dans Mbongo, puis l'année en cours. */
  historique: AnneeCA[];
  seuils: SeuilFiscal[];
  parMois: { mois: string; ca: Montant }[];
  /** Dépenses rangées en « Impôts et taxes » cette année, annulations déduites. */
  payes: { id: string; date: DateISO; libelle: string; montant: Montant; devise: string; piece: boolean }[];
  echeances: Echeance[];
}

const FISCALES = new Set(['impotPremier', 'impotSolde', 'forfaitMicro', 'irppSalaries']);

export function situationImpots(dossier: DossierExercice, date: DateISO, anterieurs: AnneeCA[] = []): SituationImpots {
  const { annee, fin } = dossier.exercice;
  const ref = date > fin ? fin : date;
  const caA = (jusquA: DateISO) => chiffreAffairesRealise(annee, dossier.operations, dossier.creances, jusquA);
  const ca = caA(ref);
  const historique = [...anterieurs, { annee, ca, ...(ref < fin ? { enCours: true } : {}) }].sort((a, b) => a.annee - b.annee);

  const parMois: SituationImpots['parMois'] = [];
  let avant = 0;
  for (const m of moisEntre(dossier.exercice.debut.slice(0, 7), ref.slice(0, 7))) {
    const cumul = caA(m === ref.slice(0, 7) ? ref : finDuMois(m));
    parMois.push({ mois: m, ca: cumul - avant });
    avant = cumul;
  }
  const annulees = new Set(dossier.operations.flatMap((o) => (o.annule ? [o.annule] : [])));
  const payes = dossier.operations
    .filter((o) => o.nature === 'impots_taxes' && !o.annule && !annulees.has(o.id) && o.date <= ref)
    .map((o) => ({ id: o.id, date: o.date, libelle: o.libelle, montant: o.montant, devise: o.devise, piece: o.piece }));
  return {
    ca,
    historique,
    ...regimeFiscal(historique),
    seuils: [
      { cle: 'micro', montant: SEUIL_MICRO, part: ca / SEUIL_MICRO },
      { cle: 'tva', montant: SEUIL_TVA, part: ca / SEUIL_TVA },
      { cle: 'petite', montant: SEUIL_PETITE, part: ca / SEUIL_PETITE },
    ],
    parMois,
    payes,
    echeances: echeances(date, 366, profilEcheancier(dossier, date, anterieurs)).filter((e) => FISCALES.has(e.cle)),
  };
}

function finDuMois(m: string): DateISO {
  const [a, mm] = m.split('-').map(Number) as [number, number];
  return `${m}-${String(new Date(Date.UTC(a, mm, 0)).getUTCDate()).padStart(2, '0')}`;
}
