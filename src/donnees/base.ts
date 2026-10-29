/** Base locale du téléphone, via Dexie (IndexedDB). */
import Dexie, { type EntityTable } from 'dexie';
import type {
  LigneCompte,
  LigneConfirmation,
  LigneEntreprise,
  LigneEnvoi,
  LigneExercice,
  LigneImmobilisation,
  LigneInventaire,
  LigneOperation,
  LignePiece,
  LigneSortie,
  LigneTaux,
  LigneTiers,
  Reglage,
} from './types';

export class BaseMbongo extends Dexie {
  entreprises!: EntityTable<LigneEntreprise, 'id'>;
  exercices!: EntityTable<LigneExercice, 'id'>;
  comptes!: EntityTable<LigneCompte, 'id'>;
  operations!: EntityTable<LigneOperation, 'id'>;
  tiers!: EntityTable<LigneTiers, 'id'>;
  immobilisations!: EntityTable<LigneImmobilisation, 'id'>;
  sorties!: EntityTable<LigneSortie, 'id'>;
  inventaires!: EntityTable<LigneInventaire, 'id'>;
  taux!: EntityTable<LigneTaux, 'id'>;
  confirmations!: EntityTable<LigneConfirmation, 'id'>;
  pieces!: EntityTable<LignePiece, 'id'>;
  fileEnvoi!: EntityTable<LigneEnvoi, 'seq'>;
  reglages!: EntityTable<Reglage, 'cle'>;

  constructor(nom = 'mbongo') {
    super(nom);
    this.version(1).stores({
      entreprises: 'id',
      exercices: 'id, entrepriseId, [entrepriseId+annee]',
      comptes: 'id, entrepriseId',
      operations: 'id, entrepriseId, date',
      tiers: 'id, entrepriseId, genre',
      immobilisations: 'id, entrepriseId',
      sorties: 'id, entrepriseId, immobilisationId',
      inventaires: 'id, exerciceId',
      taux: 'id, date',
      confirmations: 'id, entrepriseId, operation',
      pieces: 'id, entrepriseId, operationId, envoi',
      fileEnvoi: '++seq, table',
      reglages: 'cle',
    });
  }
}

/** Tables métier à vider ensemble quand on retire une entreprise de l'appareil. */
export const TABLES_ENTREPRISE = ['comptes', 'operations', 'tiers', 'immobilisations', 'sorties', 'confirmations', 'pieces'] as const;
