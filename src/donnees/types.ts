/**
 * Lignes de la base locale (IndexedDB). Même modèle que le serveur (architecture, section 5).
 * Les tables métier sont en ajout seulement : on n'y modifie ni n'y efface jamais une ligne.
 */
import type {
  CompteTresorerie,
  ConfirmationTaux,
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
}

export interface LigneCompte extends CompteTresorerie {
  entrepriseId: string;
  ordre: number;
}

export type LigneOperation = Operation & Trace;

export type LigneTiers = PieceTiers & Trace & { genre: GenreTiers };

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

export type LigneConfirmation = ConfirmationTaux & { id: string; entrepriseId: string };

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
export interface LigneEnvoi {
  seq?: number;
  table: string;
  ligne: string;
  creeLe: string;
  tentatives: number;
  erreur?: string;
}

export interface Reglage {
  cle: string;
  valeur: unknown;
}
