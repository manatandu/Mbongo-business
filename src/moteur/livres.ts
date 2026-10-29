/**
 * Livre des recettes et des dépenses, registre des achats.
 * Format repris de l'AUDCG révisé (art. 31 et 32) : un livre chronologique des ressources (espèces distinguées
 * des autres modes) et des emplois ; un registre des achats avec mode de règlement et référence des pièces,
 * récapitulé par mois et par année. Proposés à tout commerçant, tirés des saisies : rien de plus à noter.
 */
import { compte, preparer, signe, valeurFC } from './contexte';
import { versFC } from './montants';
import { verifierDossier } from './validation';
import type { Nature } from './natures';
import type { DateISO, Devise, DossierExercice, Montant } from './types';

/** Espèces : une caisse. Autre : banque, monnaie électronique, tontine. À crédit : pas encore payé. */
export type ModeReglement = 'especes' | 'autre' | 'credit';

export interface LigneLivre {
  date: DateISO;
  operation: string;
  libelle: string;
  nature: Nature;
  /** Libellé du compte : « Caisse », « M-Pesa »… */
  compte: string;
  mode: Exclude<ModeReglement, 'credit'>;
  sens: 'ressource' | 'emploi';
  /** Dans la devise du compte, signé (négatif pour une annulation). */
  montant: Montant;
  devise: Devise;
  /** En francs, signé. */
  montantFC: Montant;
}

export interface LivreRecettesDepenses {
  du: DateISO;
  au: DateISO;
  lignes: LigneLivre[];
  /** En francs. */
  ressourcesEspeces: Montant;
  ressourcesAutres: Montant;
  emplois: Montant;
}

/** Livre des recettes et des dépenses, du `du` au `au` inclus. Les transferts entre ses propres comptes n'y figurent pas. */
export function livreRecettesDepenses(dossier: DossierExercice, du: DateISO, au: DateISO): LivreRecettesDepenses {
  verifierDossier(dossier);
  const ctx = preparer(dossier);
  const lignes: LigneLivre[] = [];
  for (const op of ctx.operations) {
    if (op.type === 'transfert' || op.date < du || op.date > au) continue;
    const c = compte(ctx, op.compte);
    lignes.push({
      date: op.date,
      operation: op.id,
      libelle: op.libelle,
      nature: op.nature,
      compte: c.libelle,
      mode: c.type === 'caisse' ? 'especes' : 'autre',
      sens: op.type === 'recette' ? 'ressource' : 'emploi',
      montant: signe(op) * op.montant,
      devise: c.devise,
      montantFC: signe(op) * valeurFC(ctx, op),
    });
  }
  const somme = (f: (l: LigneLivre) => boolean) => lignes.filter(f).reduce((s, l) => s + l.montantFC, 0);
  return {
    du,
    au,
    lignes,
    ressourcesEspeces: somme((l) => l.sens === 'ressource' && l.mode === 'especes'),
    ressourcesAutres: somme((l) => l.sens === 'ressource' && l.mode === 'autre'),
    emplois: somme((l) => l.sens === 'emploi'),
  };
}

/** Natures qui forment les achats du registre : celles de la ligne « Dépenses sur achats » du SMT. */
export const NATURES_ACHAT: readonly Nature[] = ['achats_marchandises', 'achats_fournitures'];

export interface LigneAchat {
  date: DateISO;
  libelle: string;
  /** Fournisseur, pour un achat à crédit. */
  fournisseur: string;
  mode: ModeReglement;
  /** Compte de paiement, vide pour un achat à crédit. */
  compte: string;
  /** N° de facture ou de reçu ; vide s'il n'a pas été noté. */
  reference: string;
  /** Une photo ou une pièce papier existe. */
  piece: boolean;
  /** Total mensuel repris du cahier de caisse, avant Mbongo. */
  reprise: boolean;
  montant: Montant;
  devise: Devise;
  montantFC: Montant;
}

export interface RegistreAchats {
  annee: number;
  lignes: LigneAchat[];
  /** Récapitulation par mois (AAAA-MM), en francs. */
  parMois: { mois: string; total: Montant }[];
  total: Montant;
}

/**
 * Registre des achats de l'exercice. Un achat payé comptant y entre à la date du paiement ;
 * un achat à crédit, à la date de la facture, avec le mode « à crédit ». Son règlement plus tard n'est pas un nouvel achat.
 */
export function registreAchats(dossier: DossierExercice): RegistreAchats {
  verifierDossier(dossier);
  const ctx = preparer(dossier);
  const { debut, fin, annee } = dossier.exercice;
  const lignes: LigneAchat[] = [];
  for (const op of ctx.operations) {
    if (op.type !== 'depense' || !NATURES_ACHAT.includes(op.nature) || op.reglementDe) continue;
    const c = compte(ctx, op.compte);
    lignes.push({
      date: op.date,
      libelle: op.libelle,
      fournisseur: '',
      mode: c.type === 'caisse' ? 'especes' : 'autre',
      compte: c.libelle,
      reference: op.reference ?? '',
      piece: op.piece,
      reprise: Boolean(op.reprise),
      montant: signe(op) * op.montant,
      devise: c.devise,
      montantFC: signe(op) * valeurFC(ctx, op),
    });
  }
  for (const d of dossier.dettes) {
    if (!NATURES_ACHAT.includes(d.nature) || d.date < debut || d.date > fin) continue;
    lignes.push({
      date: d.date,
      libelle: d.nom,
      fournisseur: d.nom,
      mode: 'credit',
      compte: '',
      reference: d.facture,
      piece: Boolean(d.facture),
      reprise: false,
      montant: d.montant,
      devise: d.devise,
      montantFC: versFC(d.montant, d.devise, d.taux),
    });
  }
  lignes.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const mois = new Map<string, Montant>();
  for (const l of lignes) mois.set(l.date.slice(0, 7), (mois.get(l.date.slice(0, 7)) ?? 0) + l.montantFC);
  return {
    annee,
    lignes,
    parMois: [...mois].map(([m, total]) => ({ mois: m, total })),
    total: lignes.reduce((s, l) => s + l.montantFC, 0),
  };
}
