/**
 * Contrôles automatiques des saisies, pour l'assistant et, en version simple, pour le commerçant.
 * Ils signalent ; ils ne corrigent jamais (loi n° 15/002, art. 43.1).
 */
import { compte, estAnnuleeAu, preparer, type Contexte } from './contexte';
import { ajouterJours, jourSemaine, moisDe, moisEntre } from './dates';
import { calculerSoldes, soldesQuotidiens } from './tresorerie';
import { chiffreAffairesDepuisContexte, evaluerSeuil, type SeuilsSMT } from './seuils';
import { delaiAns, encoursA, prescription, situationDepuisContexte } from './tiers';
import { verifierDossier } from './validation';
import type { DateISO, Devise, DossierExercice, Montant, Operation } from './types';

export type NiveauAnomalie = 'information' | 'a_revoir' | 'a_traiter';

export type CodeAnomalie =
  | 'sans_piece'
  | 'jours_sans_vente'
  | 'solde_negatif'
  | 'decouvert_bancaire'
  | 'creance_ancienne'
  | 'creance_prescription'
  | 'creance_prescrite'
  | 'seuil_smt_approche'
  | 'seuil_smt_depasse'
  | 'mois_sans_saisie'
  | 'especes_10000'
  | 'salaire_impot_en_caisse'
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
  /** Seuils du SMT en francs congolais (AUDCIF, art. 13). Sans eux, le seuil n'est pas contrôlé. */
  seuilsSMT?: SeuilsSMT | null;
  /** Équivalent en francs de 10 000 USD, pour les paiements en espèces (loi n° 22/068, art. 23). Sans lui, seul le dollar est contrôlé. */
  seuilEspecesCDF?: Montant;
}

const pluriel = (n: number, mot: string): string => `${n} ${mot}${n > 1 ? 's' : ''}`;

/** Montant lisible dans un message : « 180 000 CDF », « 120,00 USD ». */
function lisible(m: Montant, devise: Devise): string {
  const signe = m < 0 ? '−' : '';
  const a = Math.abs(m);
  const groupe = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (devise === 'CDF') return `${signe}${groupe(a)} CDF`;
  return `${signe}${groupe(Math.floor(a / 100))},${String(a % 100).padStart(2, '0')} USD`;
}

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
        ? `${c.libelle} à découvert depuis le ${premier} (au plus bas ${lisible(minimum, c.devise)}). Vérifier avec le relevé.`
        : `${c.libelle} négatif depuis le ${premier} (au plus bas ${lisible(minimum, c.devise)}) : opération oubliée ou erreur de compte.`,
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
        .map((s) => `${s.ligne.nom} (${lisible(s.encours, s.ligne.devise)})`)
        .join(' ; ')}.`,
      references: anciennes.map((s) => s.ligne.id),
    });
  }

  // Délai pour réclamer en justice : un an contre un particulier (CC, art. 653), deux ans pour une vente de
  // marchandises à un commerçant (AUDCG, art. 301), cinq ans pour des services (art. 16). Alerte 90 jours avant.
  const enCours = situationDepuisContexte(ctx, 'creance', ref).filter((s) => s.encours > 0);
  const delai = (s: (typeof enCours)[number]) => prescription(s.ligne, dossier.entreprise.secteur);
  const duree = (s: (typeof enCours)[number]) => pluriel(delaiAns(s.ligne, dossier.entreprise.secteur), 'an');
  const bientot = enCours.filter((s) => ref < delai(s) && ref >= ajouterJours(delai(s), -90));
  if (bientot.length) {
    anomalies.push({
      code: 'creance_prescription',
      niveau: 'a_traiter',
      message: `${pluriel(bientot.length, 'créance')} à réclamer avant la fin du délai : ${bientot
        .map((s) => `${s.ligne.nom} (${lisible(s.encours, s.ligne.devise)}, ${duree(s)}, jusqu'au ${delai(s)})`)
        .join(' ; ')}. Faire signer une reconnaissance de dette, ou agir avant.`,
      references: bientot.map((s) => s.ligne.id),
    });
  }
  const passees = enCours.filter((s) => ref >= delai(s));
  if (passees.length) {
    anomalies.push({
      code: 'creance_prescrite',
      niveau: 'a_revoir',
      message: `${pluriel(passees.length, 'créance')} au-delà du délai pour la réclamer : ${passees
        .map((s) => `${s.ligne.nom} (${lisible(s.encours, s.ligne.devise)}, ${duree(s)})`)
        .join(' ; ')}. Le délai pour agir en justice est passé, sauf reconnaissance de dette signée ou action déjà engagée.`,
      references: passees.map((s) => s.ligne.id),
    });
  }

  // Loi n° 22/068 (blanchiment), art. 23 : une opération de 10 000 USD ou plus ne se paie pas en espèces, sauf
  // dérogation de la Banque centrale. Article suivant : salaires et impôts par virement, voie bancaire ou postale ou
  // chèque, quel que soit le montant. Mbongo ne connaît les espèces que par la caisse ; le mobile money n'est pas visé.
  const annuleesIds = new Set(ops.flatMap((o) => (o.annule ? [o.annule] : [])));
  const enCaisse = ops.filter((o) => !o.annule && !annuleesIds.has(o.id) && o.type !== 'transfert' && compte(ctx, o.compte)?.type === 'caisse');
  const grosses = enCaisse.filter((o) => (o.devise === 'USD' ? o.montant >= 1_000_000 : p.seuilEspecesCDF !== undefined && o.montant >= p.seuilEspecesCDF));
  if (grosses.length) {
    anomalies.push({
      code: 'especes_10000',
      niveau: 'a_traiter',
      message: `${pluriel(grosses.length, 'opération')} de 10 000 USD ou plus en espèces : la loi n° 22/068 (art. 23) demande la banque, sauf dérogation. Voir l'expert-comptable.`,
      references: grosses.map((o) => o.id),
    });
  }
  const salairesImpots = enCaisse.filter((o) => o.type === 'depense' && (o.nature === 'salaires' || o.nature === 'impots_taxes'));
  if (salairesImpots.length) {
    anomalies.push({
      code: 'salaire_impot_en_caisse',
      niveau: 'a_revoir',
      message: `${pluriel(salairesImpots.length, 'salaire ou impôt')} payé${salairesImpots.length > 1 ? 's' : ''} en espèces : la loi n° 22/068 demande le virement, la banque ou le chèque, quel que soit le montant.`,
      references: salairesImpots.map((o) => o.id),
    });
  }

  // Seuil SMT
  if (p.seuilsSMT) {
    const ca = chiffreAffairesDepuisContexte(ctx, ref);
    const s = evaluerSeuil(ca, p.seuilsSMT[dossier.entreprise.secteur]);
    const part = Math.round(s.ratio * 100);
    if (s.niveau === 'depasse') {
      anomalies.push({
        code: 'seuil_smt_depasse',
        niveau: 'a_traiter',
        message: `Chiffre d'affaires de ${lisible(ca, 'CDF')}, ${part} % du seuil SMT (${lisible(s.seuil, 'CDF')}). Passage au Système normal à voir avec l'expert-comptable partenaire.`,
        references: [],
      });
    } else if (s.niveau === 'approche') {
      anomalies.push({
        code: 'seuil_smt_approche',
        niveau: 'a_revoir',
        message: `Chiffre d'affaires de ${lisible(ca, 'CDF')}, ${part} % du seuil SMT (${lisible(s.seuil, 'CDF')}).`,
        references: [],
      });
    }
  }

  // Mois écoulés sans aucune saisie, comptés depuis le premier mois saisi : un commerçant qui commence en juin
  // n'est pas alerté le premier jour pour janvier à mai (la reprise du cahier reste possible).
  const moisAvecSaisie = new Set(ops.map((o) => moisDe(o.date)));
  const premier = [...moisAvecSaisie].sort()[0];
  const moisVides = premier ? moisEntre(premier, moisDe(ref)).filter((m) => m < moisDe(ref) && !moisAvecSaisie.has(m)) : [];
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
