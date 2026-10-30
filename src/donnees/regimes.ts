/**
 * Régime d'imposition IRPP et TVA d'une entreprise individuelle, d'après ses chiffres d'affaires successifs.
 * Le logiciel informe ; l'expert-comptable partenaire confirme le régime (loi n° 15/002, art. 43.6 à 43.8).
 *
 * Textes lus (skill fiscalite-rdc, code général 2026) :
 * - loi n° 23/053, art. 107 (micro-entreprise : CA HT annuel au plus 25 000 000 FC), art. 109 (petite entreprise :
 *   de 25 000 001 à 300 000 000 FC), art. 112 (régime réel au-delà) ;
 * - art. 113, al. 1 : le régime immédiatement inférieur ne s'applique que lorsque le CA est resté sous la limite
 *   du régime pendant deux exercices consécutifs ; al. 2 : le régime supérieur s'applique immédiatement ;
 * - OL n° 10/001 (TVA), art. 14 : assujettissement à partir de 80 000 000 FC de CA annuel ; après une baisse,
 *   l'assujetti conserve sa qualité les deux années suivant celle de la constatation de la diminution.
 *
 * Deux points que les textes laissent ouverts, tranchés dans le sens prudent (le régime le plus élevé dure le plus) :
 * - art. 113 : la descente vaut-elle dès le second exercice sous la limite ? Mbongo attend deux exercices terminés ;
 * - art. 14 TVA : l'année de la constatation est celle où le CA passe sous 80 M ; la qualité court encore les deux
 *   années suivantes. L'expert-comptable confirme dans les deux cas, et l'écran le dit.
 */
import { versFC, type DateISO, type Devise, type Montant } from '../moteur';

export const SEUIL_MICRO = 25_000_000;
export const SEUIL_PETITE = 300_000_000;
export const SEUIL_TVA = 80_000_000;

export type Regime = 'micro' | 'petite' | 'reel';
const ORDRE: Regime[] = ['micro', 'petite', 'reel'];
/** Limite basse de chaque régime : en dessous, on « devient inférieur » au sens de l'art. 113. */
const LIMITE_BASSE: Record<Regime, Montant> = { micro: 0, petite: SEUIL_MICRO, reel: SEUIL_PETITE };

/** Régime que donnerait le seul chiffre d'affaires d'une année (art. 107, 109, 112). */
export const regimeDuChiffre = (ca: Montant): Regime => (ca <= SEUIL_MICRO ? 'micro' : ca <= SEUIL_PETITE ? 'petite' : 'reel');

export interface AnneeCA {
  annee: number;
  ca: Montant;
  /** Année en cours : CA arrêté à la date du jour. */
  enCours?: boolean;
}

export interface RegimeFiscal {
  regime: Regime;
  /** Le CA de l'année est sous la limite du régime, mais l'art. 113 maintient le régime. */
  maintenu: boolean;
  /** Pas d'année précédente connue dans Mbongo : le régime peut être plus élevé que celui affiché. */
  sansHistorique: boolean;
  /** TVA : dépassée cette année, qualité gardée après une baisse (art. 14), ou non concernée. */
  tva: 'depasse' | 'gardee' | 'non';
  /** Dernière année où le CA a atteint 80 M CDF, quand la qualité d'assujetti est gardée. */
  tvaAnnee?: number;
}

/**
 * Suit les années dans l'ordre. Montée immédiate ; descente d'un cran seulement après deux exercices terminés
 * de suite sous la limite basse du régime.
 */
export function regimeFiscal(annees: AnneeCA[]): RegimeFiscal {
  const liste = [...annees].sort((a, b) => a.annee - b.annee);
  if (!liste.length) return { regime: 'micro', maintenu: false, sansHistorique: true, tva: 'non' };
  let regime = regimeDuChiffre(liste[0]!.ca);
  for (let i = 1; i < liste.length; i++) {
    // Descente d'un cran : les deux exercices terminés qui précèdent sont restés sous la limite du régime (al. 1).
    const sous = (a: AnneeCA | undefined) => a !== undefined && !a.enCours && a.ca <= LIMITE_BASSE[regime];
    if (regime !== 'micro' && sous(liste[i - 1]) && sous(liste[i - 2])) regime = ORDRE[ORDRE.indexOf(regime) - 1]!;
    // Montée immédiate dès que le chiffre de l'année dépasse la limite (al. 2).
    const du = regimeDuChiffre(liste[i]!.ca);
    if (ORDRE.indexOf(du) > ORDRE.indexOf(regime)) regime = du;
  }
  const derniere = liste[liste.length - 1]!;
  // TVA : l'année de la baisse (première sous 80 M après la dernière au-dessus) et les deux suivantes gardent la qualité.
  const derniereAuDessus = liste
    .slice(0, -1)
    .filter((a) => a.ca >= SEUIL_TVA)
    .at(-1);
  return {
    regime,
    maintenu: ORDRE.indexOf(regimeDuChiffre(derniere.ca)) < ORDRE.indexOf(regime),
    sansHistorique: liste.length === 1,
    ...(derniere.ca >= SEUIL_TVA
      ? { tva: 'depasse' as const }
      : derniereAuDessus && derniere.annee - derniereAuDessus.annee <= 3
        ? { tva: 'gardee' as const, tvaAnnee: derniereAuDessus.annee }
        : { tva: 'non' as const }),
  };
}

interface OpVente {
  id: string;
  date: DateISO;
  nature: string;
  montant: Montant;
  devise: Devise;
  taux: number | null;
  annule?: string;
  reglementDe?: unknown;
}

interface FactureVente {
  date: DateISO;
  nature: string;
  montant: Montant;
  devise: Devise;
  taux: number | null;
}

/**
 * Chiffre d'affaires réalisé d'une année : ventes au comptant et ventes à crédit facturées dans l'année.
 * Les encaissements de créances ne sont pas recomptés ; une vente annulée sort du total.
 */
export function chiffreAffairesRealise(annee: number, operations: OpVente[], factures: FactureVente[], jusquA?: DateISO): Montant {
  const dans = (d: DateISO) => d.startsWith(`${annee}-`) && (!jusquA || d <= jusquA);
  let ca = 0;
  for (const o of operations) {
    if (o.nature !== 'ventes' || o.reglementDe || !dans(o.date)) continue;
    ca += (o.annule ? -1 : 1) * versFC(o.montant, o.devise, o.taux);
  }
  for (const f of factures) if (f.nature === 'ventes' && dans(f.date)) ca += versFC(f.montant, f.devise, f.taux);
  return ca;
}
