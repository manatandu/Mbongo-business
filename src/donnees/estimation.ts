/**
 * Estimation de l'IRPP, faite par le commerçant sur ses propres chiffres, avec les taux écrits dans la loi.
 * Ce n'est pas une déclaration et ce n'est pas un avis : la déclaration est établie et vérifiée par l'expert-comptable
 * partenaire (loi n° 15/002, art. 43.6 à 43.8). TRK Consulting ne commente pas ce montant.
 *
 * Textes lus (skills fiscalite-rdc et fiscalite-rdc-socle) :
 * - loi n° 23/053, art. 127 : petites entreprises, 1 % du chiffre d'affaires annuel réalisé pour la vente,
 *   2 % pour les prestations de services ; activité mixte : CA cumulés, imposés suivant l'activité principale ;
 * - art. 128 et AM n° 015/CAB/MIN/FINANCES/2025 : micro-entreprises, forfait annuel égal à l'équivalent en CDF
 *   de 30 USD, payé au plus tard le 30 avril de l'année suivante ;
 * - art. 103 : exonération des revenus de l'exploitation des terres exclusivement affectées à des cultures vivrières,
 *   de moins de 10 ha : proposée seulement à qui cultive lui-même, « à confirmer par l'expert » ;
 * - art. 150 : arrondi à la centaine de francs ;
 * - LPF art. 57, al. 3, et 57 quater : petites entreprises, deux quotités, 60 % avec la déclaration au plus tard
 *   le 31 janvier, 40 % au plus tard le 30 avril de l'année qui suit ;
 * - art. 70 et AM n° 019/CAB/MIN/FINANCES/2025 : salarié d'une micro-entreprise, forfait annuel de 36 USD retenu par
 *   l'employeur, reversé par quart (9 USD) au plus tard le 15 du mois qui suit chaque trimestre ;
 * - salariés d'une petite entreprise : barème de l'art. 118, réductions des art. 123 à 125 ; pas estimé ici
 *   (il faudrait le salaire et la situation de famille de chacun : c'est la paie).
 * Les montants en dollars sont convertis au taux du jour saisi par le commerçant : l'arrêté renvoie à une
 * circulaire pour le taux, que Mbongo n'a pas. L'écran le dit.
 */
import type { DateISO, Montant } from '../moteur';
import type { Regime } from './regimes';

export type ActiviteFiscale = 'vente' | 'services' | 'agricole';

export interface ProfilFiscal {
  /** « agricole » : je cultive moi-même ma terre (art. 104 et 105). Une revendeuse de vivres est « vente ». */
  activite: ActiviteFiscale;
  /** Agricole : toutes mes terres servent seulement à des cultures vivrières (art. 103, « exclusivement »). */
  vivrieresSeules?: boolean;
  /** Agricole : moins de dix hectares en tout (art. 103). */
  moinsDe10ha?: boolean;
  /** Nombre de salariés, pour la retenue forfaitaire d'une micro-entreprise. */
  salaries: number;
}

/**
 * Loi n° 23/053, art. 150 : décimale arrondie à l'unité (vers le haut à partir de 5), puis tranche de 50 FC ou plus
 * ramenée à la centaine supérieure, moins de 50 FC à la centaine inférieure.
 */
export const arrondiFiscal = (x: number): Montant => Math.round(Math.round(x) / 100) * 100;

export const FORFAIT_MICRO_USD = 30;
export const FORFAIT_SALARIE_MICRO_USD = 36;
export const TAUX_PETITE: Record<'vente' | 'services', number> = { vente: 0.01, services: 0.02 };

export interface Quotite {
  part: number;
  date: DateISO;
  montant: Montant;
}

export type EstimationIrpp =
  | { cas: 'exonerePossible' }
  | { cas: 'reel' }
  | { cas: 'forfait'; usd: number; cdf: Montant | null; date: DateISO }
  | { cas: 'proportionnel'; taux: number; ca: Montant; montant: Montant; projectionCa: Montant | null; projection: Montant | null; quotites: Quotite[] };

export interface EstimationSalaries {
  nombre: number;
  /** Micro-entreprise : forfait. Petite entreprise : barème, non estimé. */
  cas: 'forfait' | 'bareme' | 'aucun';
  usdAn?: number;
  usdTrimestre?: number;
  cdfAn?: Montant | null;
}

export interface EstimationImpots {
  irpp: EstimationIrpp;
  salaries: EstimationSalaries;
  /** Taux du dollar utilisé pour les forfaits, ou null s'il n'y en a pas. */
  taux: number | null;
}

const enCDF = (usd: number, taux: number | null): Montant | null => (taux ? arrondiFiscal(usd * taux) : null);

/**
 * `ca` : chiffre d'affaires réalisé de l'année à la date ; `date` et `fin` servent à la projection sur l'année
 * quand elle n'est pas finie (même rythme jusqu'au 31 décembre, marqué comme projection à l'écran).
 */
export function estimerImpots(p: { regime: Regime; ca: Montant; annee: number; debut: DateISO; date: DateISO; fin: DateISO; profil: ProfilFiscal; taux: number | null }): EstimationImpots {
  const suivante = p.annee + 1;
  const ref = p.date > p.fin ? p.fin : p.date;
  let irpp: EstimationIrpp;
  // Exonération seulement pour qui cultive lui-même des terres exclusivement vivrières, de moins de 10 ha, et à
  // confirmer par l'expert (l'art. 103 vise les revenus de « l'exploitation des terres », pas le commerce de vivres).
  if (p.profil.activite === 'agricole' && p.profil.vivrieresSeules && p.profil.moinsDe10ha) irpp = { cas: 'exonerePossible' };
  else if (p.regime === 'reel') irpp = { cas: 'reel' };
  else if (p.regime === 'micro') irpp = { cas: 'forfait', usd: FORFAIT_MICRO_USD, cdf: enCDF(FORFAIT_MICRO_USD, p.taux), date: `${suivante}-04-30` };
  else {
    // Bénéfices agricoles imposés comme la vente de la récolte (art. 104 ; art. 127, 1°).
    const taux = TAUX_PETITE[p.profil.activite === 'services' ? 'services' : 'vente'];
    const jours = (a: DateISO, b: DateISO) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000) + 1;
    const enCours = ref < p.fin;
    const projectionCa = enCours ? Math.round((p.ca * jours(p.debut, p.fin)) / jours(p.debut, ref)) : null;
    const base = projectionCa ?? p.ca;
    const total = arrondiFiscal(base * taux);
    const premiere = arrondiFiscal(total * 0.6);
    irpp = {
      cas: 'proportionnel',
      taux,
      ca: p.ca,
      montant: arrondiFiscal(p.ca * taux),
      projectionCa,
      projection: projectionCa === null ? null : total,
      quotites: [
        { part: 0.6, date: `${suivante}-01-31`, montant: premiere },
        { part: 0.4, date: `${suivante}-04-30`, montant: total - premiere },
      ],
    };
  }
  const n = Math.max(0, Math.floor(p.profil.salaries));
  const salaries: EstimationSalaries =
    n === 0
      ? { nombre: 0, cas: 'aucun' }
      : p.regime === 'micro'
        ? { nombre: n, cas: 'forfait', usdAn: n * FORFAIT_SALARIE_MICRO_USD, usdTrimestre: (n * FORFAIT_SALARIE_MICRO_USD) / 4, cdfAn: enCDF(n * FORFAIT_SALARIE_MICRO_USD, p.taux) }
        : { nombre: n, cas: 'bareme' };
  return { irpp, salaries, taux: p.taux };
}

/** Activité proposée d'après le secteur SMT de l'entreprise ; le commerçant la corrige. */
export const activiteParDefaut = (secteur: string): ActiviteFiscale => (secteur === 'services' ? 'services' : 'vente');
