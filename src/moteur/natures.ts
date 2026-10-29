/**
 * Natures d'opérations du SMT et leur place dans les états.
 * Liste fermée : le commerçant choisit, il ne crée pas de nature.
 */

export const NATURES_RECETTE = [
  'ventes',
  'autres_recettes',
  'cession_materiel',
  'apport',
  'emprunt_recu',
] as const;

export const NATURES_DEPENSE = [
  'achats_marchandises',
  'achats_fournitures',
  'loyers',
  'salaires',
  'impots_taxes',
  'interets',
  'autres_depenses',
  'materiel',
  'caution',
  'remboursement_emprunt',
  'prelevement',
] as const;

export type NatureRecette = (typeof NATURES_RECETTE)[number];
export type NatureDepense = (typeof NATURES_DEPENSE)[number];
export type Nature = NatureRecette | NatureDepense | 'transfert';

/** Ligne du compte de résultat SMT alimentée par la nature. */
export type RubriqueResultat =
  | 'ventes'
  | 'autres_recettes'
  | 'achats'
  | 'loyers'
  | 'salaires'
  | 'impots_taxes'
  | 'interets'
  | 'autres_depenses';

/** Colonnes de ventilation du journal de trésorerie (note 4 et colonnes admises par le NB). */
export type ColonneRecette = 'ventes' | 'autres' | 'materiel' | 'exploitant' | 'emprunts' | 'transferts';
export type ColonneDepense =
  | 'achats_marchandises'
  | 'achats_fournitures'
  | 'loyers'
  | 'salaires'
  | 'impots_taxes'
  | 'autres'
  | 'materiel'
  | 'exploitant'
  | 'emprunts'
  | 'transferts';

export const COLONNES_RECETTE: readonly ColonneRecette[] = ['ventes', 'autres', 'materiel', 'exploitant', 'emprunts', 'transferts'];
export const COLONNES_DEPENSE: readonly ColonneDepense[] = [
  'achats_marchandises',
  'achats_fournitures',
  'loyers',
  'salaires',
  'impots_taxes',
  'autres',
  'materiel',
  'exploitant',
  'emprunts',
  'transferts',
];

export interface DefinitionNature {
  type: 'recette' | 'depense' | 'transfert';
  rubrique: RubriqueResultat | null;
  colonne: ColonneRecette | ColonneDepense;
  /** Vocabulaire exact, pour les états. */
  libelleSMT: string;
  /** Vocabulaire du commerçant, pour l'appli. */
  libelleSimple: string;
}

export const NATURES: Readonly<Record<Nature, DefinitionNature>> = {
  ventes: { type: 'recette', rubrique: 'ventes', colonne: 'ventes', libelleSMT: 'Ventes', libelleSimple: 'Ventes' },
  autres_recettes: { type: 'recette', rubrique: 'autres_recettes', colonne: 'autres', libelleSMT: 'Autres recettes', libelleSimple: 'Autre argent reçu' },
  // D1 : le prix de cession entre dans les autres recettes sur activités.
  cession_materiel: { type: 'recette', rubrique: 'autres_recettes', colonne: 'materiel', libelleSMT: 'Matériel et mobilier (cessions)', libelleSimple: 'Vente de matériel ou caution rendue' },
  apport: { type: 'recette', rubrique: null, colonne: 'exploitant', libelleSMT: "Compte exploitant, apports", libelleSimple: "Argent que j'ajoute" },
  emprunt_recu: { type: 'recette', rubrique: null, colonne: 'emprunts', libelleSMT: 'Emprunt reçu', libelleSimple: 'Prêt reçu' },

  achats_marchandises: { type: 'depense', rubrique: 'achats', colonne: 'achats_marchandises', libelleSMT: 'Achats marchandises', libelleSimple: 'Achat de marchandises' },
  achats_fournitures: { type: 'depense', rubrique: 'achats', colonne: 'achats_fournitures', libelleSMT: 'Achats matières et fournitures', libelleSimple: 'Achat de fournitures' },
  loyers: { type: 'depense', rubrique: 'loyers', colonne: 'loyers', libelleSMT: 'Loyers', libelleSimple: 'Loyer' },
  salaires: { type: 'depense', rubrique: 'salaires', colonne: 'salaires', libelleSMT: 'Salaires', libelleSimple: 'Salaires' },
  impots_taxes: { type: 'depense', rubrique: 'impots_taxes', colonne: 'impots_taxes', libelleSMT: 'Impôts et taxes', libelleSimple: 'Impôts et taxes' },
  // D2 : les intérêts sont une charge, le capital non.
  interets: { type: 'depense', rubrique: 'interets', colonne: 'autres', libelleSMT: "Charges d'intérêts", libelleSimple: 'Intérêts du prêt' },
  autres_depenses: { type: 'depense', rubrique: 'autres_depenses', colonne: 'autres', libelleSMT: 'Autres dépenses', libelleSimple: 'Autres dépenses' },
  materiel: { type: 'depense', rubrique: null, colonne: 'materiel', libelleSMT: 'Matériel et mobilier', libelleSimple: 'Matériel et mobilier' },
  // D6 : la caution est suivie en note 1 et n'est pas amortie.
  caution: { type: 'depense', rubrique: null, colonne: 'materiel', libelleSMT: 'Cautions versées', libelleSimple: 'Caution versée' },
  remboursement_emprunt: { type: 'depense', rubrique: null, colonne: 'emprunts', libelleSMT: "Remboursement d'emprunt", libelleSimple: 'Remboursement du prêt' },
  prelevement: { type: 'depense', rubrique: null, colonne: 'exploitant', libelleSMT: 'Compte exploitant, prélèvements', libelleSimple: 'Argent pour la maison' },

  transfert: { type: 'transfert', rubrique: null, colonne: 'transferts', libelleSMT: 'Transfert entre comptes', libelleSimple: 'Transfert entre comptes' },
};

/** Natures possibles d'une vente ou prestation à crédit. */
export const NATURES_CREANCE: readonly Nature[] = ['ventes', 'autres_recettes'];

/** Natures d'exploitation possibles d'une dette (D10 : pas de matériel à crédit). */
export const NATURES_DETTE: readonly Nature[] = [
  'achats_marchandises',
  'achats_fournitures',
  'loyers',
  'salaires',
  'impots_taxes',
  'interets',
  'autres_depenses',
];

/** Natures qui créent une ligne au registre des immobilisations. */
export const NATURES_IMMOBILISATION: readonly Nature[] = ['materiel', 'caution'];

export function estNature(v: unknown): v is Nature {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(NATURES, v);
}
