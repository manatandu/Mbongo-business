/**
 * Types du domaine SMT.
 * Montants en entiers : francs congolais, ou centimes de dollar pour l'USD.
 */
import type { Nature } from './natures';

/** Date au format AAAA-MM-JJ. */
export type DateISO = string;
export type Devise = 'CDF' | 'USD';
export type Montant = number;

export type SecteurSMT = 'negoce' | 'artisanat' | 'services';
/** mobile = M-Pesa, Orange Money, Airtel Money. tontine = likelemba (D9). */
export type TypeCompte = 'caisse' | 'banque' | 'mobile' | 'tontine';
export type TypeOperation = 'recette' | 'depense' | 'transfert';
export type GenreTiers = 'creance' | 'dette';
export type CategorieImmobilisation = 'materiel' | 'mobilier' | 'caution';

export interface Entreprise {
  nom: string;
  secteur: SecteurSMT;
  nif?: string;
}

export interface Exercice {
  annee: number;
  debut: DateISO;
  fin: DateISO;
}

export interface CompteTresorerie {
  id: string;
  type: TypeCompte;
  libelle: string;
  /** D3 : un compte par devise. Le journal se tient dans cette devise. */
  devise: Devise;
}

export interface Operation {
  id: string;
  date: DateISO;
  type: TypeOperation;
  compte: string;
  compteDestination?: string;
  /** Montant reçu sur le compte de destination quand les deux devises diffèrent (change). */
  montantDestination?: Montant;
  nature: Nature;
  libelle: string;
  /** Dans la devise du compte. */
  montant: Montant;
  devise: Devise;
  /** Francs congolais pour 1 dollar, figé à la saisie. Null pour une opération en francs. */
  taux: number | null;
  piece: boolean;
  /** D5 : id de l'opération que celle-ci contre-passe. */
  annule?: string;
  /** Report d'un cahier de caisse tenu avant l'entrée dans Mbongo. */
  reprise?: boolean;
  /** D4 : encaissement d'une créance ou règlement d'une dette, en tout ou en partie. */
  reglementDe?: { genre: GenreTiers; ligne: string };
}

/** Une créance impayée ou une dette à payer. */
export interface PieceTiers {
  id: string;
  date: DateISO;
  facture: string;
  nom: string;
  nature: Nature;
  montant: Montant;
  devise: Devise;
  taux: number | null;
  /** Part déjà réglée avant l'ouverture de l'exercice (facture reportée). */
  regleAvant?: Montant;
}

export interface SortieImmobilisation {
  date: DateISO;
  /** En francs. Repris de l'opération de cession quand elle existe. */
  prixCession: Montant;
  operation?: string;
}

export interface Immobilisation {
  id: string;
  date: DateISO;
  designation: string;
  categorie: CategorieImmobilisation;
  /** Valeur d'origine en francs. Reprise de l'opération d'achat quand elle est dans le dossier. */
  montant: Montant;
  /** Durée d'amortissement en années. Sans objet pour une caution. */
  duree: number;
  operation?: string;
  sortie?: SortieImmobilisation;
}

export interface LigneStock {
  reference: string;
  designation: string;
  quantite: number;
  prixUnitaire: Montant;
  montant: Montant;
}

/** Tout ce qu'il faut pour calculer les états d'un exercice. */
export interface DossierExercice {
  entreprise: Entreprise;
  exercice: Exercice;
  comptes: CompteTresorerie[];
  /** Soldes au premier jour, dans la devise de chaque compte. */
  soldesOuverture: Record<string, Montant>;
  /** Taux de clôture de l'exercice précédent : valorise les soldes et tiers en dollars à l'ouverture. */
  tauxOuverture: number | null;
  /** Capital restant dû à l'ouverture, en francs. */
  empruntOuverture: Montant;
  operations: Operation[];
  creances: PieceTiers[];
  dettes: PieceTiers[];
  immobilisations: Immobilisation[];
  stockInitial: Montant;
  /** Inventaire de fin d'exercice. Null tant qu'il n'est pas fait. */
  stockFinal: Montant | null;
  lignesStock?: LigneStock[];
  tauxCloture: number | null;
}
