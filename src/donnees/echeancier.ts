/**
 * Échéancier fiscal et social du petit commerçant : des rappels, jamais des montants ni des déclarations.
 * Fiscalité limitée à l'IRPP des micro et petites entreprises.
 * Les déclarations fiscales se font avec l'expert-comptable partenaire (loi n° 15/002, art. 43.6 à 43.8).
 * Dates relevées dans les skills fiscaux et sociaux (docs/cadre-petites-entreprises.md, § 3.6), à revoir chaque année.
 */
import { ajouterJours } from '../moteur/dates';
import type { DateISO, DossierExercice } from '../moteur';
import type { RegimeConfirme } from './fiscal-expert';
import { chiffreAffairesRealise, regimeFiscal, type AnneeCA, type Regime } from './regimes';

export type CleEcheance =
  | 'loyer'
  | 'onemDeclaration'
  | 'cotisations'
  | 'cotisationsMicro'
  | 'irppSalaries'
  | 'inpp'
  | 'impotPremier'
  | 'impotSolde'
  | 'forfaitMicro'
  | 'mainOeuvre'
  | 'salairesAnnuel'
  | 'arreteEtats';

export interface Echeance {
  date: DateISO;
  cle: CleEcheance;
  /** Texte de référence, affiché en petit. */
  texte: string;
}

/** Ce qui décide des rappels utiles : employer quelqu'un, louer sa boutique, la taille fiscale. */
export interface ProfilAnnee {
  salaries: boolean;
  loyer: boolean;
  /** IRPP (loi n° 23/053, art. 107, 109 et 113) : régime suivi d'année en année. Rien au-delà : le SMT s'arrête avant 300 M CDF. */
  regime: 'micro' | 'petite';
}

/**
 * Profil de l'année ouverte, et celui de l'année d'avant : en janvier, les paiements portent sur décembre et sur
 * l'année close (retenue, quatrième trimestre, 60 % de l'IRPP) ; la déclaration des salaires de mars et l'IRPP d'avril
 * aussi. Sans `precedent`, l'année d'avant est supposée pareille.
 */
export interface ProfilEcheancier extends ProfilAnnee {
  annee?: number;
  precedent?: ProfilAnnee;
}

export { SEUIL_MICRO } from './regimes';

export interface ContexteFiscal {
  /** Chiffre d'affaires des années précédentes tenues dans Mbongo (Chargement.caAnterieurs). */
  anterieurs?: AnneeCA[];
  /** Natures saisies l'année d'avant : un employeur reste employeur en janvier, avant sa première paie notée. */
  naturesAnterieures?: string[];
  /** Régimes confirmés par l'expert-comptable, par année : ils priment sur le régime déduit des chiffres. */
  confirmes?: Pick<RegimeConfirme, 'annee' | 'regime' | 'tva'>[];
}

const versDeux = (r: Regime): 'micro' | 'petite' => (r === 'micro' ? 'micro' : 'petite');

export function profilEcheancier(dossier: DossierExercice, date: DateISO, ctx: ContexteFiscal = {}): ProfilEcheancier {
  const { annee } = dossier.exercice;
  const anterieurs = ctx.anterieurs ?? [];
  const natures = new Set(dossier.operations.map((o) => o.nature));
  const avant = new Set(ctx.naturesAnterieures ?? []);
  const ref = date > dossier.exercice.fin ? dossier.exercice.fin : date;
  const ca = chiffreAffairesRealise(annee, dossier.operations, dossier.creances, ref);
  const confirme = (a: number) => ctx.confirmes?.find((c) => c.annee === a)?.regime;
  const regime = confirme(annee) ?? regimeFiscal([...anterieurs, { annee, ca, enCours: ref < dossier.exercice.fin }]).regime;
  const precedents = anterieurs.filter((x) => x.annee < annee);
  const regimePrecedent = confirme(annee - 1) ?? (precedents.length ? regimeFiscal(precedents).regime : regime);
  return {
    annee,
    salaries: natures.has('salaires') || avant.has('salaires'),
    loyer: natures.has('loyers') || avant.has('loyers'),
    regime: versDeux(regime),
    precedent: { salaries: avant.has('salaires'), loyer: avant.has('loyers'), regime: versDeux(regimePrecedent) },
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
const finDeMois = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).getUTCDate();

/** Échéances d'un mois donné (m de 1 à 12). `p` : profil de l'année `a` ; `av` : profil de l'année `a - 1`. */
function duMois(a: number, m: number, p: ProfilAnnee, av: ProfilAnnee): Echeance[] {
  const d = (j: number): DateISO => `${a}-${pad(m)}-${pad(Math.min(j, finDeMois(a, m)))}`;
  const r: Echeance[] = [];
  // En janvier, on paie pour décembre et pour l'année close : c'est le profil de l'année d'avant qui compte.
  const mensuel = m === 1 ? av : p;
  if (mensuel.loyer) r.push({ date: d(10), cle: 'loyer', texte: 'arrêté provincial n° 015/2023 (Kinshasa)' });
  if (mensuel.salaries) {
    r.push({ date: d(10), cle: 'onemDeclaration', texte: 'arrêté n° 028/2025, art. 2' });
    // Petite entreprise : l'IRPP retenu sur les salaires part chaque mois avec les cotisations (LPF, art. 18).
    // Micro-entreprise : cotisations sociales chaque mois, l'IRPP au forfait chaque trimestre (AM n° 019/2025).
    r.push(
      mensuel.regime === 'petite'
        ? { date: d(15), cle: 'cotisations', texte: 'CNSS, AM 146 ; ONEM, AM 028/2025 ; LPF, art. 18' }
        : { date: d(15), cle: 'cotisationsMicro', texte: 'CNSS, AM 146 ; ONEM, AM 028/2025' },
    );
    if (mensuel.regime === 'micro' && [1, 4, 7, 10].includes(m)) r.push({ date: d(15), cle: 'irppSalaries', texte: 'AM n° 019/2025' });
    if ([1, 4, 7, 10].includes(m)) r.push({ date: d(31), cle: 'inpp', texte: 'ordonnance n° 84/186, art. 3' });
  }
  if (m === 1) {
    if (av.regime === 'petite') r.push({ date: d(31), cle: 'impotPremier', texte: 'LPF, art. 57 quater' });
    if (av.salaries) r.push({ date: d(31), cle: 'mainOeuvre', texte: 'arrêté n° 087/2023, art. 3' });
  }
  if (m === 3 && av.salaries && av.regime === 'petite') r.push({ date: d(31), cle: 'salairesAnnuel', texte: 'LPF, art. 22 ter' });
  if (m === 4) {
    // Pour tous : les états de l'année passée sont arrêtés au plus tard le 30 avril (AUDCIF, art. 23).
    r.push({ date: d(30), cle: 'arreteEtats', texte: 'AUDCIF, art. 23' });
    // L'IRPP d'avril porte sur les revenus de l'année close.
    if (av.regime === 'petite') r.push({ date: d(30), cle: 'impotSolde', texte: 'LPF, art. 57 quater' });
    if (av.regime === 'micro') r.push({ date: d(30), cle: 'forfaitMicro', texte: 'AM n° 015/2025' });
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
    // Profil d'une année : celui du dossier, celui d'avant, ou, au-delà, le même qu'aujourd'hui.
    const de = (x: number): ProfilAnnee => (p.annee !== undefined && x < p.annee ? (p.precedent ?? p) : p);
    r.push(...duMois(a, m, de(a), de(a - 1)).filter((e) => e.date >= du && e.date <= au));
    m++;
    if (m > 12) {
      m = 1;
      a++;
    }
  }
  return r.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
}
