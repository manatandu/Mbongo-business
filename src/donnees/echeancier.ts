/**
 * Échéancier fiscal et social du petit commerçant : des rappels, jamais des montants ni des déclarations.
 * Les déclarations fiscales se font avec l'expert-comptable partenaire (loi n° 15/002, art. 43.6 à 43.8).
 * Dates relevées dans les skills fiscaux et sociaux (docs/cadre-petites-entreprises.md, § 3.6), à revoir chaque année.
 */
import { ajouterJours } from '../moteur/dates';
import { chiffreAffairesEstime, type DateISO, type DossierExercice } from '../moteur';

export type CleEcheance =
  | 'loyer'
  | 'onemDeclaration'
  | 'cotisations'
  | 'inpp'
  | 'impotPremier'
  | 'impotSolde'
  | 'forfaitMicro'
  | 'mainOeuvre'
  | 'salairesAnnuel';

export interface Echeance {
  date: DateISO;
  cle: CleEcheance;
  /** Texte de référence, affiché en petit. */
  texte: string;
}

/** Ce qui décide des rappels utiles : employer quelqu'un, louer sa boutique, la taille fiscale. */
export interface ProfilEcheancier {
  salaries: boolean;
  loyer: boolean;
  /** Fisc (loi n° 23/053) : micro-entreprise au plus 25 M CDF de CA, petite entreprise jusqu'à 300 M CDF. */
  regime: 'micro' | 'petite' | 'autre';
}

export const SEUIL_MICRO = 25_000_000;
export const SEUIL_PETITE = 300_000_000;

export function profilEcheancier(dossier: DossierExercice, date: DateISO): ProfilEcheancier {
  const natures = new Set(dossier.operations.map((o) => o.nature));
  const ca = chiffreAffairesEstime(dossier, date > dossier.exercice.fin ? dossier.exercice.fin : date);
  return {
    salaries: natures.has('salaires'),
    loyer: natures.has('loyers'),
    regime: ca <= SEUIL_MICRO ? 'micro' : ca <= SEUIL_PETITE ? 'petite' : 'autre',
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
const finDeMois = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).getUTCDate();

/** Échéances d'un mois donné (m de 1 à 12). */
function duMois(a: number, m: number, p: ProfilEcheancier): Echeance[] {
  const d = (j: number): DateISO => `${a}-${pad(m)}-${pad(Math.min(j, finDeMois(a, m)))}`;
  const r: Echeance[] = [];
  if (p.loyer) r.push({ date: d(10), cle: 'loyer', texte: 'arrêté provincial n° 015/2023 (Kinshasa)' });
  if (p.salaries) {
    r.push({ date: d(10), cle: 'onemDeclaration', texte: 'arrêté n° 028/2025, art. 2' });
    r.push({ date: d(15), cle: 'cotisations', texte: 'CNSS, AM 146 ; ONEM, AM 028/2025 ; LPF, art. 18' });
    if ([1, 4, 7, 10].includes(m)) r.push({ date: d(31), cle: 'inpp', texte: 'ordonnance n° 84/186, art. 3' });
  }
  if (m === 1) {
    if (p.regime === 'petite') r.push({ date: d(31), cle: 'impotPremier', texte: 'LPF, art. 57 quater' });
    if (p.salaries) r.push({ date: d(31), cle: 'mainOeuvre', texte: 'arrêté n° 087/2023, art. 3' });
  }
  if (m === 3 && p.salaries) r.push({ date: d(31), cle: 'salairesAnnuel', texte: 'LPF, art. 22 ter' });
  if (m === 4) {
    if (p.regime === 'petite') r.push({ date: d(30), cle: 'impotSolde', texte: 'LPF, art. 57 quater' });
    if (p.regime === 'micro') r.push({ date: d(30), cle: 'forfaitMicro', texte: 'AM n° 015/2025' });
  }
  return r;
}

/** Échéances entre `du` et `du` + `jours`, dans l'ordre. */
export function echeances(du: DateISO, jours: number, p: ProfilEcheancier): Echeance[] {
  const au = ajouterJours(du, jours);
  const r: Echeance[] = [];
  let a = Number(du.slice(0, 4));
  let m = Number(du.slice(5, 7));
  while (`${a}-${pad(m)}` <= au.slice(0, 7)) {
    r.push(...duMois(a, m, p).filter((e) => e.date >= du && e.date <= au));
    m++;
    if (m > 12) {
      m = 1;
      a++;
    }
  }
  return r.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
}
