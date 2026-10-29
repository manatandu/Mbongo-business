/**
 * États SMT : compte de résultat, bilan, notes 1 à 3.
 * Résultat G = C − D + E − F, avec C = A − B.
 */
import { preparer, signe, valeurFC } from './contexte';
import { registre, type LigneRegistre } from './immobilisations';
import { somme, versFC } from './montants';
import { NATURES, type RubriqueResultat } from './natures';
import { totalFC, totalOuvertureFC } from './tiers';
import { calculerSoldes, ligneBilan } from './tresorerie';
import { ErreurDossier, verifierDossier } from './validation';
import { VERSION_MOTEUR } from './version';
import type { DateISO, DossierExercice, Entreprise, Exercice, LigneStock, Montant } from './types';


export interface CompteDeResultat {
  recettesVentes: Montant;
  autresRecettes: Montant;
  /** Total des recettes sur produits. */
  A: Montant;
  achats: Montant;
  loyers: Montant;
  salaires: Montant;
  impotsTaxes: Montant;
  interets: Montant;
  autresDepenses: Montant;
  /** Total des dépenses sur charges. */
  B: Montant;
  /** Excédent ou insuffisance de recettes : A − B. */
  C: Montant;
  /** Stock initial − stock final. */
  variationStocks: Montant;
  /** Créances au 1er janvier − créances au 31 décembre. */
  variationCreances: Montant;
  /** Dettes au 1er janvier − dettes au 31 décembre. */
  variationDettes: Montant;
  D: Montant;
  E: Montant;
  /** Dotations aux amortissements, y compris la valeur nette des biens sortis (D1). */
  F: Montant;
  /** Résultat de l'exercice. */
  G: Montant;
  details: {
    cessions: Montant;
    gainChange: Montant;
    perteChange: Montant;
    dotationsAmortissements: Montant;
    valeurNetteSorties: Montant;
  };
}

export interface Bilan {
  actif: { immobilisations: Montant; stocks: Montant; creances: Montant; caisse: Montant; banque: Montant; total: Montant };
  passif: { compteExploitant: Montant; resultat: Montant; emprunt: Montant; dettes: Montant; total: Montant };
  equilibre: boolean;
  compteExploitant: { ouverture: Montant; apports: Montant; prelevements: Montant };
}

export interface LigneNote1 {
  id: string;
  date: DateISO;
  designation: string;
  categorie: string;
  montant: Montant;
  dotation: Montant;
  cumul: Montant;
  valeurNette: Montant;
  dateSortie: DateISO | null;
  prixCession: Montant | null;
}

export interface Notes {
  note1: { lignes: LigneNote1[]; totalMontant: Montant; totalDotations: Montant; totalValeurNette: Montant };
  note2: { stockInitial: Montant; stockFinal: Montant; inventaireFait: boolean; lignes: LigneStock[] };
  note3: {
    creances: { cloture: Montant; ouverture: Montant; variation: number | null };
    dettes: { cloture: Montant; ouverture: Montant; variation: number | null };
  };
}

export interface Etats {
  entreprise: Entreprise;
  exercice: Exercice;
  auDate: DateISO;
  /** Vrai avant la clôture, sans inventaire, ou sans taux de clôture alors que des dollars existent. */
  provisoire: boolean;
  compteDeResultat: CompteDeResultat;
  bilan: Bilan;
  notes: Notes;
  /** Écart de réévaluation des comptes en dollars (D3), signé. */
  ecartChange: Montant;
  versionMoteur: string;
}

const variation = (cloture: Montant, ouverture: Montant): number | null =>
  ouverture === 0 ? null : (cloture - ouverture) / ouverture;

/** Calcule les états de l'exercice, à la clôture ou à une date intermédiaire. */
export function calculerEtats(dossier: DossierExercice, options: { auDate?: DateISO } = {}): Etats {
  verifierDossier(dossier);
  const { debut, fin, annee } = dossier.exercice;
  const ref = options.auDate ?? fin;
  if (ref < debut || ref > fin) throw new ErreurDossier([`La date ${ref} est hors de l'exercice ${annee}.`]);

  const ctx = preparer(dossier);
  const aLaCloture = ref === fin;
  const tauxValorisation = aLaCloture ? dossier.tauxCloture : null;

  // Recettes et dépenses de l'exercice, en francs
  const rubriques: Record<RubriqueResultat, Montant> = {
    ventes: 0,
    autres_recettes: 0,
    achats: 0,
    loyers: 0,
    salaires: 0,
    impots_taxes: 0,
    interets: 0,
    autres_depenses: 0,
  };
  let cessions = 0;
  let apports = 0;
  let prelevements = 0;
  let empruntsRecus = 0;
  let remboursements = 0;
  for (const op of ctx.operations) {
    if (op.date > ref) break;
    if (op.type === 'transfert') continue;
    const v = signe(op) * valeurFC(ctx, op);
    const rubrique = NATURES[op.nature].rubrique;
    if (rubrique) rubriques[rubrique] += v;
    if (op.nature === 'cession_materiel') cessions += v;
    else if (op.nature === 'apport') apports += v;
    else if (op.nature === 'prelevement') prelevements += v;
    else if (op.nature === 'emprunt_recu') empruntsRecus += v;
    else if (op.nature === 'remboursement_emprunt') remboursements += v;
  }

  // Trésorerie, avec réévaluation des comptes en dollars à la clôture (D3)
  const soldes = calculerSoldes(ctx, ref);
  let caisse = 0;
  let banque = 0;
  let ecartChange = 0;
  let ouvertureTresorerie = 0;
  let dollarsPresents = false;
  for (const s of soldes.values()) {
    let valeur = s.fcHistorique;
    if (s.compte.devise === 'USD') {
      // Zéro dollar vaut zéro franc, quel que soit le taux : l'écart d'un change est alors acquis.
      if (s.natif === 0) valeur = 0;
      else {
        dollarsPresents = true;
        if (tauxValorisation !== null) valeur = versFC(s.natif, 'USD', tauxValorisation);
      }
    }
    ecartChange += valeur - s.fcHistorique;
    if (ligneBilan(s.compte.type) === 'caisse') caisse += valeur;
    else banque += valeur;
    ouvertureTresorerie += versFC(dossier.soldesOuverture[s.compte.id] ?? 0, s.compte.devise, dossier.tauxOuverture);
  }
  const gainChange = Math.max(0, ecartChange);
  const perteChange = Math.max(0, -ecartChange);

  // Tiers, stocks, immobilisations
  const CI = totalOuvertureFC(ctx, 'creance');
  const CF = totalFC(ctx, 'creance', ref, tauxValorisation);
  const DI = totalOuvertureFC(ctx, 'dette');
  const DF = totalFC(ctx, 'dette', ref, tauxValorisation);
  dollarsPresents ||= [...dossier.creances, ...dossier.dettes].some((l) => l.devise === 'USD' && l.date <= ref);
  const SI = dossier.stockInitial;
  const inventaireFait = aLaCloture && dossier.stockFinal !== null;
  const SF = inventaireFait ? (dossier.stockFinal as Montant) : SI;

  const reg: LigneRegistre[] = registre(ctx, ref);
  const immoOuverture = somme(reg.map((l) => l.vncOuverture));
  const immoCloture = somme(reg.map((l) => l.vncCloture));
  const dotations = somme(reg.map((l) => l.dotation));
  const valeurNetteSorties = somme(reg.map((l) => l.sortie?.vnc ?? 0));

  // Compte de résultat
  const A = rubriques.ventes + rubriques.autres_recettes + gainChange;
  const B =
    rubriques.achats +
    rubriques.loyers +
    rubriques.salaires +
    rubriques.impots_taxes +
    rubriques.interets +
    rubriques.autres_depenses +
    perteChange;
  const C = A - B;
  const variationStocks = SI - SF;
  const variationCreances = CI - CF;
  const variationDettes = DI - DF;
  const D = variationStocks + variationCreances;
  const E = variationDettes;
  const F = dotations + valeurNetteSorties;
  const G = C - D + E - F;

  // Bilan
  const ceOuverture = ouvertureTresorerie + SI + CI + immoOuverture - DI - dossier.empruntOuverture;
  const compteExploitant = ceOuverture + apports - prelevements;
  const emprunt = dossier.empruntOuverture + empruntsRecus - remboursements;
  const totalActif = immoCloture + SF + CF + caisse + banque;
  const totalPassif = compteExploitant + G + emprunt + DF;

  return {
    entreprise: dossier.entreprise,
    exercice: dossier.exercice,
    auDate: ref,
    provisoire: !inventaireFait || (dollarsPresents && dossier.tauxCloture === null),
    compteDeResultat: {
      recettesVentes: rubriques.ventes,
      autresRecettes: rubriques.autres_recettes + gainChange,
      A,
      achats: rubriques.achats,
      loyers: rubriques.loyers,
      salaires: rubriques.salaires,
      impotsTaxes: rubriques.impots_taxes,
      interets: rubriques.interets,
      autresDepenses: rubriques.autres_depenses + perteChange,
      B,
      C,
      variationStocks,
      variationCreances,
      variationDettes,
      D,
      E,
      F,
      G,
      details: { cessions, gainChange, perteChange, dotationsAmortissements: dotations, valeurNetteSorties },
    },
    bilan: {
      actif: { immobilisations: immoCloture, stocks: SF, creances: CF, caisse, banque, total: totalActif },
      passif: { compteExploitant, resultat: G, emprunt, dettes: DF, total: totalPassif },
      equilibre: totalActif === totalPassif,
      compteExploitant: { ouverture: ceOuverture, apports, prelevements },
    },
    notes: {
      note1: {
        lignes: reg.map((l) => ({
          id: l.immobilisation.id,
          date: l.immobilisation.date,
          designation: l.immobilisation.designation,
          categorie: l.immobilisation.categorie,
          montant: l.montant,
          dotation: l.dotation,
          cumul: l.cumul,
          valeurNette: l.vncCloture,
          dateSortie: l.sortie?.date ?? null,
          prixCession: l.sortie?.prixCession ?? null,
        })),
        totalMontant: somme(reg.map((l) => l.montant)),
        totalDotations: dotations,
        totalValeurNette: immoCloture,
      },
      note2: { stockInitial: SI, stockFinal: SF, inventaireFait, lignes: dossier.lignesStock ?? [] },
      note3: {
        creances: { cloture: CF, ouverture: CI, variation: variation(CF, CI) },
        dettes: { cloture: DF, ouverture: DI, variation: variation(DF, DI) },
      },
    },
    ecartChange,
    versionMoteur: VERSION_MOTEUR,
  };
}
