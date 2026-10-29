/**
 * Soldes et journaux de trésorerie : un journal par caisse, par banque,
 * par compte de monnaie électronique et par tontine (AUDCIF, Titre X, note 4).
 */
import {
  COLONNES_DEPENSE,
  COLONNES_RECETTE,
  NATURES,
  type ColonneDepense,
  type ColonneRecette,
} from './natures';
import { compte, mouvements, ouverture, preparer, signe, montantRecu, type Contexte } from './contexte';
import { moisEntre } from './dates';
import { verifierDossier } from './validation';
import type { CompteTresorerie, DateISO, Devise, DossierExercice, Montant, TypeCompte } from './types';

/** Ligne du bilan : Caisse pour une caisse, Banque (en + ou en −) pour tout le reste. */
export const ligneBilan = (type: TypeCompte): 'caisse' | 'banque' => (type === 'caisse' ? 'caisse' : 'banque');

export interface SoldeCompte {
  compte: CompteTresorerie;
  /** Dans la devise du compte. */
  natif: Montant;
  /** Somme des mouvements valorisés en francs à leur taux (valeur historique). */
  fcHistorique: Montant;
}

export function calculerSoldes(ctx: Contexte, date: DateISO): Map<string, SoldeCompte> {
  const soldes = new Map<string, SoldeCompte>();
  for (const c of ctx.dossier.comptes) {
    const o = ouverture(ctx, c.id);
    soldes.set(c.id, { compte: c, natif: o.natif, fcHistorique: o.fc });
  }
  for (const op of ctx.operations) {
    if (op.date > date) break;
    for (const m of mouvements(ctx, op)) {
      const s = soldes.get(m.compte);
      if (s) {
        s.natif += m.natif;
        s.fcHistorique += m.fc;
      }
    }
  }
  return soldes;
}

/** Soldes de chaque compte à une date (fin d'exercice par défaut). */
export function soldesTresorerie(dossier: DossierExercice, date?: DateISO): SoldeCompte[] {
  verifierDossier(dossier);
  return [...calculerSoldes(preparer(dossier), date ?? dossier.exercice.fin).values()];
}

/** Solde de fin de journée d'un compte, pour chaque jour où il bouge. */
export function soldesQuotidiens(ctx: Contexte, id: string, jusquA: DateISO): { date: DateISO; solde: Montant }[] {
  let solde = ouverture(ctx, id).natif;
  const jours: { date: DateISO; solde: Montant }[] = [];
  for (const op of ctx.operations) {
    if (op.date > jusquA) break;
    for (const m of mouvements(ctx, op)) {
      if (m.compte !== id) continue;
      solde += m.natif;
      const dernier = jours[jours.length - 1];
      if (dernier && dernier.date === op.date) dernier.solde = solde;
      else jours.push({ date: op.date, solde });
    }
  }
  return jours;
}

export interface LigneJournal {
  date: DateISO;
  operation: string;
  libelle: string;
  /** Une annulation s'inscrit en négatif dans la colonne de l'opération qu'elle contre-passe. */
  recette: Montant;
  depense: Montant;
  solde: Montant;
  piece: boolean;
  annulation: boolean;
}

export interface JournalTresorerie {
  compte: CompteTresorerie;
  devise: Devise;
  mois: string;
  reportANouveau: Montant;
  lignes: LigneJournal[];
  totalRecettes: Montant;
  totalDepenses: Montant;
  soldeAReporter: Montant;
  ventilation: {
    recettes: Record<ColonneRecette, Montant>;
    depenses: Record<ColonneDepense, Montant>;
  };
}

/** Journal de trésorerie mensuel d'un compte, dans la devise du compte. */
export function journalMensuel(dossier: DossierExercice, compteId: string, mois: string): JournalTresorerie {
  verifierDossier(dossier);
  const ctx = preparer(dossier);
  const c = compte(ctx, compteId);
  const { debut, fin } = dossier.exercice;
  if (!moisEntre(debut.slice(0, 7), fin.slice(0, 7)).includes(mois)) {
    throw new Error(`Le mois ${mois} est hors de l'exercice ${dossier.exercice.annee}.`);
  }

  const recettes = Object.fromEntries(COLONNES_RECETTE.map((k) => [k, 0])) as Record<ColonneRecette, Montant>;
  const depenses = Object.fromEntries(COLONNES_DEPENSE.map((k) => [k, 0])) as Record<ColonneDepense, Montant>;
  let report = ouverture(ctx, compteId).natif;
  const lignes: LigneJournal[] = [];
  let solde = 0;
  let totalRecettes = 0;
  let totalDepenses = 0;

  for (const op of ctx.operations) {
    const touche = op.compte === compteId || op.compteDestination === compteId;
    if (!touche || op.date.slice(0, 7) > mois) continue;
    if (op.date.slice(0, 7) < mois) {
      for (const m of mouvements(ctx, op)) if (m.compte === compteId) report += m.natif;
      continue;
    }
    const s = signe(op);
    let recette = 0;
    let depense = 0;
    if (op.type === 'recette') {
      recette = s * op.montant;
      recettes[NATURES[op.nature].colonne as ColonneRecette] += recette;
    } else if (op.type === 'depense') {
      depense = s * op.montant;
      depenses[NATURES[op.nature].colonne as ColonneDepense] += depense;
    } else if (op.compte === compteId) {
      depense = s * op.montant;
      depenses.transferts += depense;
    } else {
      recette = s * montantRecu(ctx, op);
      recettes.transferts += recette;
    }
    totalRecettes += recette;
    totalDepenses += depense;
    lignes.push({ date: op.date, operation: op.id, libelle: op.libelle, recette, depense, solde: 0, piece: op.piece, annulation: s < 0 });
  }

  solde = report;
  for (const l of lignes) {
    solde += l.recette - l.depense;
    l.solde = solde;
  }

  return {
    compte: c,
    devise: c.devise,
    mois,
    reportANouveau: report,
    lignes,
    totalRecettes,
    totalDepenses,
    soldeAReporter: solde,
    ventilation: { recettes, depenses },
  };
}
