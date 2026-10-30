/**
 * Lignes de la base locale (IndexedDB). Même modèle que le serveur (architecture, section 5).
 * Les tables métier sont en ajout seulement : on n'y modifie ni n'y efface jamais une ligne.
 */
import type {
  CompteTresorerie,
  DateISO,
  GenreTiers,
  Immobilisation,
  LigneStock,
  Montant,
  Operation,
  PieceTiers,
  SecteurSMT,
  SortieImmobilisation,
} from '../moteur';

export type EtatEnvoi = 'local' | 'envoye';

/** Traçabilité commune à toute ligne saisie. */
export interface Trace {
  entrepriseId: string;
  /** Identifiant de l'appareil ou de l'utilisateur qui a saisi. */
  auteur: string;
  /** Date et heure de l'appareil au moment de la saisie (ISO 8601). */
  creeLe: string;
  envoi: EtatEnvoi;
}

export interface LigneEntreprise {
  id: string;
  nom: string;
  activite: string;
  secteur: SecteurSMT;
  commune: string;
  nif: string;
  responsable: string;
  telephone: string;
  /** Données fictives de démonstration. */
  demo: boolean;
  creeLe: string;
}

export type StatutExercice = 'ouvert' | 'inventaire' | 'prepare' | 'arrete' | 'clos';

export interface LigneExercice {
  id: string;
  entrepriseId: string;
  annee: number;
  debut: DateISO;
  fin: DateISO;
  statut: StatutExercice;
  soldesOuverture: Record<string, Montant>;
  tauxOuverture: number | null;
  empruntOuverture: Montant;
  stockInitial: Montant;
  stockFinal: Montant | null;
  tauxCloture: number | null;
  /** Date de l'arrêté des états par l'expert-comptable partenaire. */
  arreteLe?: DateISO | null;
}

export interface LigneCompte extends CompteTresorerie {
  entrepriseId: string;
  ordre: number;
}

export type LigneOperation = Operation & Trace;

/** `annule` : identifiant de la facture que cette ligne retire (erreur de saisie). Les deux lignes restent en base. */
export type LigneTiers = PieceTiers & Trace & { genre: GenreTiers; annule?: string };

export type LigneImmobilisation = Omit<Immobilisation, 'sortie'> & Trace;

export type LigneSortie = SortieImmobilisation & Trace & { id: string; immobilisationId: string };

export type LigneInventaire = LigneStock & { id: string; exerciceId: string; ordre: number };

export interface LigneTaux {
  id: string;
  date: DateISO;
  /** Francs congolais pour 1 dollar. */
  valeur: number;
  source: 'demo' | 'assistant' | 'commercant';
}

/** Photo d'une pièce justificative, gardée sur le téléphone jusqu'à l'envoi. */
export interface LignePiece {
  id: string;
  entrepriseId: string;
  operationId: string;
  donnees: Blob;
  type: string;
  taille: number;
  creeLe: string;
  envoi: EtatEnvoi;
}

/** File d'envoi vers le serveur (étape 3). */
/** Article suivi en fiche de stock (inventaire permanent, facultatif). */
export interface LigneArticle {
  id: string;
  entrepriseId: string;
  designation: string;
  /** sac, carton, kg, litre, pièce… */
  unite: string;
  creeLe: string;
}

export type MotifMouvement = 'stock_initial' | 'achat' | 'vente' | 'consommation' | 'perte' | 'ajustement';

/** Entrée ou sortie de stock, en ajout seulement. Une erreur se corrige par un mouvement inverse. */
export interface LigneMouvementStock {
  id: string;
  entrepriseId: string;
  articleId: string;
  date: DateISO;
  sens: 'entree' | 'sortie';
  quantite: number;
  /** Coût unitaire d'entrée en francs congolais (entrées seulement). */
  prixUnitaire?: Montant;
  motif: MotifMouvement;
  /** Opération de trésorerie ou facture d'où vient le mouvement. */
  origine?: string;
  creeLe: string;
}

export interface LigneEnvoi {
  seq?: number;
  table: string;
  ligne: string;
  creeLe: string;
  tentatives: number;
  erreur?: string;
}

/** Rôle choisi au bureau : l'assistant consulte, l'expert-comptable arrête les états. */
export type RoleBureau = 'assistant' | 'expert';

export interface Reglage {
  cle: string;
  valeur: unknown;
}
