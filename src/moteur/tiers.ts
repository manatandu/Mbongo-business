/**
 * Journaux de suivi des créances impayées et des dettes à payer.
 * D4 : un règlement est une opération qui porte la référence de la facture ;
 * il peut y en avoir plusieurs, jamais au-delà de l'encours.
 */
import { compte, preparer, signe, type Contexte } from './contexte';
import { ecartJours } from './dates';
import { estMontant, estTaux, versFC } from './montants';
import { verifierDossier } from './validation';
import type { DateISO, DossierExercice, GenreTiers, Montant, Operation, PieceTiers, SecteurSMT } from './types';

export const lignesTiers = (d: DossierExercice, genre: GenreTiers): PieceTiers[] =>
  genre === 'creance' ? d.creances : d.dettes;

/** Total réglé sur une facture à une date, y compris la part réglée avant l'ouverture. */
export function regleA(ctx: Contexte, genre: GenreTiers, ligne: PieceTiers, date: DateISO): Montant {
  let regle = ligne.regleAvant ?? 0;
  for (const op of ctx.operations) {
    if (op.date > date) break;
    if (op.reglementDe?.genre === genre && op.reglementDe.ligne === ligne.id) regle += signe(op) * op.montant;
  }
  return regle;
}

/** Reste dû à une date. Une facture postérieure à la date n'existe pas encore. */
export function encoursA(ctx: Contexte, genre: GenreTiers, ligne: PieceTiers, date: DateISO): Montant {
  if (ligne.date > date || (ligne.perdueLe && ligne.perdueLe <= date)) return 0;
  return ligne.montant - regleA(ctx, genre, ligne, date);
}

/** Reste dû au premier jour de l'exercice. */
export function encoursOuverture(ctx: Contexte, ligne: PieceTiers): Montant {
  if (ligne.perdueLe && ligne.perdueLe < ctx.dossier.exercice.debut) return 0;
  return ligne.date < ctx.dossier.exercice.debut ? ligne.montant - (ligne.regleAvant ?? 0) : 0;
}

/**
 * Valeur en francs d'un encours. Sans taux de valorisation, la facture garde son propre taux.
 * Avec un taux (clôture, ouverture) et le genre, prudence de l'AUDCIF, art. 54 : « Les gains latents n'interviennent
 * pas dans la formation du résultat ». Une créance en dollars vaut la plus petite des deux valeurs (taux de la facture,
 * taux de clôture), une dette la plus grande : une perte probable est prise, un gain latent ne l'est pas.
 */
export function valeurTiersFC(montant: Montant, ligne: PieceTiers, taux: number | null, genre?: GenreTiers): Montant {
  const courant = versFC(montant, ligne.devise, taux ?? ligne.taux);
  if (!genre || taux === null || ligne.devise !== 'USD' || ligne.taux === null) return courant;
  const historique = versFC(montant, 'USD', ligne.taux);
  return genre === 'creance' ? Math.min(courant, historique) : Math.max(courant, historique);
}

export function totalOuvertureFC(ctx: Contexte, genre: GenreTiers): Montant {
  let total = 0;
  for (const l of lignesTiers(ctx.dossier, genre)) {
    total += valeurTiersFC(encoursOuverture(ctx, l), l, ctx.dossier.tauxOuverture, genre);
  }
  return total;
}

export function totalFC(ctx: Contexte, genre: GenreTiers, date: DateISO, tauxValorisation: number | null): Montant {
  let total = 0;
  for (const l of lignesTiers(ctx.dossier, genre)) total += valeurTiersFC(encoursA(ctx, genre, l, date), l, tauxValorisation, genre);
  return total;
}

/** Ligne de la note 3 : un client ou un fournisseur, ce qu'il doit (ou ce qu'on lui doit) au 31 décembre et au 1er janvier. */
export interface LigneNote3 {
  nom: string;
  cloture: Montant;
  ouverture: Montant;
  /** (clôture − ouverture) / ouverture ; null si rien au 1er janvier. */
  variation: number | null;
}

/** Note 3 détaillée par tiers (modèle du Titre X). Les lignes s'additionnent exactement aux totaux du bilan. */
export function note3ParTiers(ctx: Contexte, genre: GenreTiers, date: DateISO, tauxValorisation: number | null): LigneNote3[] {
  const parNom = new Map<string, LigneNote3>();
  for (const l of lignesTiers(ctx.dossier, genre)) {
    const cle = l.nom.trim().toLowerCase();
    const ligne = parNom.get(cle) ?? { nom: l.nom.trim(), cloture: 0, ouverture: 0, variation: null };
    ligne.cloture += valeurTiersFC(encoursA(ctx, genre, l, date), l, tauxValorisation, genre);
    ligne.ouverture += valeurTiersFC(encoursOuverture(ctx, l), l, ctx.dossier.tauxOuverture, genre);
    parNom.set(cle, ligne);
  }
  return [...parNom.values()]
    .filter((x) => x.cloture !== 0 || x.ouverture !== 0)
    .map((x) => ({ ...x, variation: x.ouverture === 0 ? null : (x.cloture - x.ouverture) / x.ouverture }))
    .sort((a, b) => a.nom.localeCompare(b.nom));
}

export interface SituationTiers {
  ligne: PieceTiers;
  regle: Montant;
  encours: Montant;
  /** Jours écoulés depuis la facture. */
  ageJours: number;
  soldee: boolean;
}

/** État du journal de suivi à une date : factures existantes, réglé, reste dû, ancienneté. */
export function situationTiers(dossier: DossierExercice, genre: GenreTiers, date: DateISO): SituationTiers[] {
  verifierDossier(dossier);
  const ctx = preparer(dossier);
  return situationDepuisContexte(ctx, genre, date);
}

export function situationDepuisContexte(ctx: Contexte, genre: GenreTiers, date: DateISO): SituationTiers[] {
  return lignesTiers(ctx.dossier, genre)
    .filter((l) => l.date <= date)
    .map((l) => {
      const regle = regleA(ctx, genre, l, date);
      const encours = l.montant - regle;
      return { ligne: l, regle, encours, ageJours: ecartJours(l.date, date), soldee: encours === 0 };
    });
}

/**
 * Date à partir de laquelle la créance ne se réclame plus en justice.
 * - Client particulier : un an après la vente (Code civil, livre III, art. 653). Une reconnaissance de dette ou une
 *   citation interrompt ce délai (art. 638 et 640).
 * - Client commerçant, vente de marchandises : deux ans (AUDCG, art. 301 ; art. 234 : ventes entre commerçants).
 * - Client commerçant, services : cinq ans (AUDCG, art. 16), les services n'étant pas une vente commerciale (art. 235 b).
 * Le délai part de la vente : le jour où le vendeur peut agir (AUDCG, art. 17).
 */
export function prescription(l: PieceTiers, secteur: SecteurSMT = 'negoce'): DateISO {
  const ans = l.client !== 'commercant' ? 1 : secteur === 'services' ? 5 : 2;
  const [a, m, j] = l.date.split('-');
  return `${Number(a) + ans}-${m}-${m === '02' && j === '29' ? '28' : j}`;
}

/** Durée du délai, pour l'afficher. */
export const delaiAns = (l: PieceTiers, secteur: SecteurSMT = 'negoce'): 1 | 2 | 5 => (l.client !== 'commercant' ? 1 : secteur === 'services' ? 5 : 2);

export interface DossierCreance {
  ligne: PieceTiers;
  /** Paiements reçus, dans l'ordre, dans la devise de la facture. Une annulation est négative. */
  paiements: { date: DateISO; compte: string; montant: Montant }[];
  regle: Montant;
  reste: Montant;
  ageJours: number;
  prescription: DateISO;
}

/** Tout ce qu'il faut pour réclamer une créance : la facture, les paiements, le reste dû, le délai. */
export function dossierCreance(dossier: DossierExercice, ligneId: string, date: DateISO): DossierCreance {
  verifierDossier(dossier);
  const ctx = preparer(dossier);
  const ligne = dossier.creances.find((l) => l.id === ligneId);
  if (!ligne) throw new Error(`Créance inconnue : ${ligneId}`);
  const paiements = ctx.operations
    .filter((op) => op.date <= date && op.reglementDe?.genre === 'creance' && op.reglementDe.ligne === ligneId)
    .map((op) => ({ date: op.date, compte: compte(ctx, op.compte).libelle, montant: signe(op) * op.montant }));
  const regle = regleA(ctx, 'creance', ligne, date);
  return { ligne, paiements, regle, reste: ligne.montant - regle, ageJours: ecartJours(ligne.date, date), prescription: prescription(ligne, dossier.entreprise.secteur) };
}

export interface ParametresReglement {
  id: string;
  date: DateISO;
  compte: string;
  /** Par défaut : tout l'encours. */
  montant?: Montant;
  /** Requis pour une facture en dollars. */
  taux?: number | null;
  libelle?: string;
  piece?: boolean;
}

function reglement(dossier: DossierExercice, genre: GenreTiers, ligneId: string, p: ParametresReglement): Operation {
  verifierDossier(dossier);
  const ctx = preparer(dossier);
  const ligne = lignesTiers(dossier, genre).find((l) => l.id === ligneId);
  const quoi = genre === 'creance' ? 'Créance' : 'Dette';
  if (!ligne) throw new Error(`${quoi} introuvable : ${ligneId}`);
  const c = compte(ctx, p.compte);
  if (c.devise !== ligne.devise) {
    throw new Error(`${quoi} ${ligne.facture || ligne.id} en ${ligne.devise} : choisissez un compte en ${ligne.devise}.`);
  }
  if (p.date < ligne.date) throw new Error(`Le règlement ne peut pas précéder la facture du ${ligne.date}.`);
  const reste = encoursA(ctx, genre, ligne, p.date);
  const montant = p.montant ?? reste;
  if (!estMontant(montant) || montant <= 0) throw new Error('Saisissez un montant supérieur à zéro.');
  if (montant > reste) throw new Error(`Montant supérieur au reste dû (${reste}).`);
  const taux = ligne.devise === 'USD' ? (p.taux ?? null) : null;
  if (ligne.devise === 'USD' && !estTaux(taux)) throw new Error('Indiquez le taux du jour pour un règlement en dollars.');
  const action = genre === 'creance' ? 'Encaissement' : 'Règlement';
  return {
    id: p.id,
    date: p.date,
    type: genre === 'creance' ? 'recette' : 'depense',
    compte: p.compte,
    nature: ligne.nature,
    libelle: p.libelle ?? `${action}${ligne.facture ? ` facture ${ligne.facture}` : ''}, ${ligne.nom}`,
    montant,
    devise: ligne.devise,
    taux,
    piece: p.piece ?? true,
    reglementDe: { genre, ligne: ligne.id },
  };
}

/** Opération de trésorerie à ajouter quand un client paie, en tout ou en partie. */
export const encaisser = (dossier: DossierExercice, creanceId: string, p: ParametresReglement): Operation =>
  reglement(dossier, 'creance', creanceId, p);

/** Opération de trésorerie à ajouter quand le commerçant paie un fournisseur. */
export const regler = (dossier: DossierExercice, detteId: string, p: ParametresReglement): Operation =>
  reglement(dossier, 'dette', detteId, p);
