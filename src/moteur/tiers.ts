/**
 * Journaux de suivi des créances impayées et des dettes à payer.
 * D4 : un règlement est une opération qui porte la référence de la facture ;
 * il peut y en avoir plusieurs, jamais au-delà de l'encours.
 */
import { compte, preparer, signe, type Contexte } from './contexte';
import { ecartJours } from './dates';
import { estMontant, estTaux, versFC } from './montants';
import { verifierDossier } from './validation';
import type { DateISO, DossierExercice, GenreTiers, Montant, Operation, PieceTiers } from './types';

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
  if (ligne.date > date) return 0;
  return ligne.montant - regleA(ctx, genre, ligne, date);
}

/** Reste dû au premier jour de l'exercice. */
export function encoursOuverture(ctx: Contexte, ligne: PieceTiers): Montant {
  return ligne.date < ctx.dossier.exercice.debut ? ligne.montant - (ligne.regleAvant ?? 0) : 0;
}

/** Valeur en francs d'un encours. Sans taux de valorisation, la facture garde son propre taux. */
export function valeurTiersFC(montant: Montant, ligne: PieceTiers, taux: number | null): Montant {
  return versFC(montant, ligne.devise, taux ?? ligne.taux);
}

export function totalOuvertureFC(ctx: Contexte, genre: GenreTiers): Montant {
  let total = 0;
  for (const l of lignesTiers(ctx.dossier, genre)) {
    total += valeurTiersFC(encoursOuverture(ctx, l), l, ctx.dossier.tauxOuverture);
  }
  return total;
}

export function totalFC(ctx: Contexte, genre: GenreTiers, date: DateISO, tauxValorisation: number | null): Montant {
  let total = 0;
  for (const l of lignesTiers(ctx.dossier, genre)) total += valeurTiersFC(encoursA(ctx, genre, l, date), l, tauxValorisation);
  return total;
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
