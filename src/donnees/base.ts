/** Base locale du téléphone, via Dexie (IndexedDB). */
import Dexie, { type EntityTable } from 'dexie';
import type {
  LigneCompte,
  LigneArticle,
  LigneEntreprise,
  LigneEnvoi,
  LigneExercice,
  LigneImmobilisation,
  LigneInventaire,
  LigneMouvementStock,
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
  articles!: EntityTable<LigneArticle, 'id'>;
  mouvementsStock!: EntityTable<LigneMouvementStock, 'id'>;
  taux!: EntityTable<LigneTaux, 'id'>;
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
    this.version(2).stores({
      arretes: 'id, entrepriseId, exerciceId',
      interventions: 'id, entrepriseId, le',
    });
    // Allègement : l'arrêté devient une date sur l'exercice ; plus de journal d'interventions
    // ni de confirmation du taux opération par opération (un seul taux de clôture).
    this.version(3).stores({ arretes: null, interventions: null, confirmations: null });
    // Fiches de stock (inventaire permanent, facultatif) : articles et mouvements valorisés.
    this.version(4).stores({ articles: 'id, entrepriseId', mouvementsStock: 'id, entrepriseId, articleId, date' });
  }
}

/** Tables métier à vider ensemble quand on retire une entreprise de l'appareil. */
export const TABLES_ENTREPRISE = ['comptes', 'operations', 'tiers', 'immobilisations', 'sorties', 'pieces', 'articles', 'mouvementsStock'] as const;
