/**
 * Contrôles automatiques des saisies, pour l'assistant et, en version simple, pour le commerçant.
 * Ils signalent ; ils ne corrigent jamais (loi n° 15/002, art. 43.1).
 */
import { estAnnuleeAu, preparer, type Contexte } from './contexte';
import { ajouterJours, jourSemaine, moisDe, moisEntre } from './dates';
import { calculerSoldes, soldesQuotidiens } from './tresorerie';
import { chiffreAffairesDepuisContexte, evaluerSeuil } from './seuils';
import { encoursA, situationDepuisContexte } from './tiers';
import { verifierDossier } from './validation';
import type { DateISO, DossierExercice, Montant, Operation } from './types';

export type NiveauAnomalie = 'information' | 'a_revoir' | 'a_traiter';

export type CodeAnomalie =
  | 'sans_piece'
  | 'jours_sans_vente'
  | 'solde_negatif'
  | 'decouvert_bancaire'
  | 'creance_ancienne'
  | 'seuil_smt_approche'
  | 'seuil_smt_depasse'
  | 'taux_a_confirmer'
  | 'mois_sans_saisie'
  | 'stock_non_inventorie'
  | 'taux_cloture_manquant';

export interface Anomalie {
  code: CodeAnomalie;
  niveau: NiveauAnomalie;
  message: string;
  /** Opérations, factures ou comptes concernés. */
  references: string[];
}

export interface ParametresControle {
  /** Jours fériés, exclus des jours ouvrés. */
  joursFeries?: DateISO[];
  /** Jours ouvrés d'affilée sans vente avant alerte. 5 par défaut. */
  joursSansVenteMax?: number;
  /** Ancienneté d'une créance avant alerte, en jours. 30 par défaut. */
  ageCreanceMax?: number;
  /** Francs congolais pour 1 FCFA. Sans lui, le seuil SMT n'est pas contrôlé. */
  fcfaVersCdf?: number | null;
}

const pluriel = (n: number, mot: string): string => `${n} ${mot}${n > 1 ? 's' : ''}`;

/** Une opération « vivante » : ni annulation, ni annulée à la date. */
const vivante = (ctx: Contexte, op: Operation, date: DateISO): boolean => !op.annule && !estAnnuleeAu(ctx, op.id, date);

export function controler(dossier: DossierExercice, auDate: DateISO, p: ParametresControle = {}): Anomalie[] {
  verifierDossier(dossier);
  const ctx = preparer(dossier);
  const { debut, fin } = dossier.exercice;
  const ref = auDate > fin ? fin : auDate;
  const ops = ctx.operations.filter((o) => o.date <= ref);
  const anomalies: Anomalie[] = [];

  // Pièces justificatives
  const sansPiece = ops.filter((o) => vivante(ctx, o, ref) && !o.piece);
  if (sansPiece.length) {
    anomalies.push({
      code: 'sans_piece',
      niveau: 'a_revoir',
      message: `${pluriel(sansPiece.length, 'opération')} sans pièce justificative.`,
      references: sansPiece.map((o) => o.id),
    });
  }

  // Jours ouvrés d'affilée sans vente saisie, en remontant depuis la date.
  // Un mois repris d'un cahier de caisse est couvert en entier.
  const feries = new Set(p.joursFeries ?? []);
  const joursVente = new Set<DateISO>();
  const moisRepris = new Set<string>();
  for (const o of ops) {
    if (o.nature !== 'ventes' || !vivante(ctx, o, ref)) continue;
    joursVente.add(o.date);
    if (o.reprise) moisRepris.add(moisDe(o.date));
  }
  let serie = 0;
  for (let j = ref; j >= debut; j = ajouterJours(j, -1)) {
    if (joursVente.has(j) || moisRepris.has(moisDe(j))) break;
    if (jourSemaine(j) !== 0 && !feries.has(j)) serie++;
  }
  if (serie >= (p.joursSansVenteMax ?? 5)) {
    anomalies.push({
      code: 'jours_sans_vente',
      niveau: 'a_revoir',
      message: `${pluriel(serie, 'jour')} ouvré${serie > 1 ? 's' : ''} sans vente saisie. Demander une saisie quotidienne de la caisse.`,
      references: [],
    });
  }

  // Soldes négatifs : une caisse ou un compte mobile ne peut pas l'être ; une banque peut être à découvert.
  for (const c of dossier.comptes) {
    const negatifs = soldesQuotidiens(ctx, c.id, ref).filter((j) => j.solde < 0);
    const ouvertureNegative = (dossier.soldesOuverture[c.id] ?? 0) < 0;
    if (!negatifs.length && !ouvertureNegative) continue;
    const premier = negatifs[0]?.date ?? debut;
    const minimum: Montant = Math.min(dossier.soldesOuverture[c.id] ?? 0, ...negatifs.map((j) => j.solde));
    const banque = c.type === 'banque';
    anomalies.push({
      code: banque ? 'decouvert_bancaire' : 'solde_negatif',
      niveau: banque ? 'a_revoir' : 'a_traiter',
      message: banque
        ? `${c.libelle} à découvert depuis le ${premier} (au plus bas ${minimum} ${c.devise}). Vérifier avec le relevé.`
        : `${c.libelle} négatif depuis le ${premier} (au plus bas ${minimum} ${c.devise}) : opération oubliée ou erreur de compte.`,
      references: [c.id],
    });
  }

  // Créances anciennes
  const age = p.ageCreanceMax ?? 30;
  const anciennes = situationDepuisContexte(ctx, 'creance', ref).filter((s) => s.encours > 0 && s.ageJours > age);
  if (anciennes.length) {
    anomalies.push({
      code: 'creance_ancienne',
      niveau: 'a_traiter',
      message: `${pluriel(anciennes.length, 'créance')} de plus de ${age} jours : ${anciennes
        .map((s) => `${s.ligne.nom} (${s.encours} ${s.ligne.devise})`)
        .join(' ; ')}.`,
      references: anciennes.map((s) => s.ligne.id),
    });
  }

  // Seuil SMT
  if (p.fcfaVersCdf) {
    const ca = chiffreAffairesDepuisContexte(ctx, ref);
    const s = evaluerSeuil(dossier.entreprise.secteur, ca, p.fcfaVersCdf);
    const part = Math.round(s.ratio * 100);
    if (s.niveau === 'depasse') {
      anomalies.push({
        code: 'seuil_smt_depasse',
        niveau: 'a_traiter',
        message: `Chiffre d'affaires de ${ca} FC, ${part} % du seuil SMT (${s.seuil} FC). Passage au Système normal à voir avec l'expert-comptable partenaire.`,
        references: [],
      });
    } else if (s.niveau === 'approche') {
      anomalies.push({
        code: 'seuil_smt_approche',
        niveau: 'a_revoir',
        message: `Chiffre d'affaires de ${ca} FC, ${part} % du seuil SMT (${s.seuil} FC).`,
        references: [],
      });
    }
  }

  // Taux de change non confirmés par l'expert
  const aConfirmer = ops.filter((o) => {
    if (!vivante(ctx, o, ref) || ctx.confirmations.has(o.id)) return false;
    const source = ctx.comptes.get(o.compte);
    const dest = o.compteDestination ? ctx.comptes.get(o.compteDestination) : undefined;
    if (o.type !== 'transfert') return source?.devise === 'USD';
    return source?.devise === 'USD' && dest?.devise === 'USD';
  });
  if (aConfirmer.length) {
    anomalies.push({
      code: 'taux_a_confirmer',
      niveau: 'information',
      message: `${pluriel(aConfirmer.length, 'opération')} en dollars dont le taux reste à confirmer par l'expert-comptable avant l'arrêté.`,
      references: aConfirmer.map((o) => o.id),
    });
  }

  // Mois écoulés sans aucune saisie
  const moisAvecSaisie = new Set(ops.map((o) => moisDe(o.date)));
  const moisVides = moisEntre(moisDe(debut), moisDe(ref)).filter((m) => m < moisDe(ref) && !moisAvecSaisie.has(m));
  if (moisVides.length) {
    anomalies.push({
      code: 'mois_sans_saisie',
      niveau: 'a_revoir',
      message: `${pluriel(moisVides.length, 'mois')} sans aucune saisie : ${moisVides.join(', ')}. Reprendre le cahier de caisse.`,
      references: moisVides,
    });
  }

  // Fin d'exercice
  if (ref === fin) {
    if (dossier.stockFinal === null) {
      anomalies.push({ code: 'stock_non_inventorie', niveau: 'a_traiter', message: "Inventaire du stock de fin d'exercice à faire.", references: [] });
    }
    const dollars =
      [...calculerSoldes(ctx, ref).values()].some((s) => s.compte.devise === 'USD' && s.natif !== 0) ||
      [...dossier.creances.map((l) => ['creance', l] as const), ...dossier.dettes.map((l) => ['dette', l] as const)].some(
        ([g, l]) => l.devise === 'USD' && encoursA(ctx, g, l, ref) > 0,
      );
    if (dollars && dossier.tauxCloture === null) {
      anomalies.push({ code: 'taux_cloture_manquant', niveau: 'a_traiter', message: 'Taux de clôture du dollar à saisir avant les états définitifs.', references: [] });
    }
  }

  return anomalies;
}
