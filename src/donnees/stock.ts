/**
 * Fiches de stock : articles, entrées et sorties, valorisés selon la méthode choisie (CUMP après chaque entrée par défaut).
 * Facultatif : le SMT n'exige que l'inventaire de fin d'exercice ; les fiches le préparent et le valorisent.
 * Mouvements en ajout seulement : une erreur se corrige par un mouvement inverse (ajustement).
 */
import { LIBELLE_METHODE, valoriser, type DateISO, type EtatArticle, type MethodeValorisation, type Montant } from '../moteur';
import type { BaseMbongo } from './base';
import { nouvelId } from './ids';
import { lireReglage, ecrireReglage } from './reglages';
import { ErreurSaisie } from './saisie';
import type { LigneArticle, LigneMouvementStock, MotifMouvement } from './types';

const cleMethode = (entrepriseId: string) => `methodeStock:${entrepriseId}`;

export const methodeStock = (db: BaseMbongo, entrepriseId: string): Promise<MethodeValorisation> =>
  lireReglage<MethodeValorisation>(db, cleMethode(entrepriseId), 'cump_entree');

export const definirMethodeStock = (db: BaseMbongo, entrepriseId: string, m: MethodeValorisation): Promise<void> => ecrireReglage(db, cleMethode(entrepriseId), m);

const envoi = (table: string, ligne: string, creeLe: string) => ({ table, ligne, creeLe, tentatives: 0 });

export interface NouvelArticle {
  designation: string;
  unite: string;
  /** Stock déjà présent à la création de la fiche (facultatif). */
  quantite: number;
  prixUnitaire: Montant;
  date: DateISO;
}

export async function creerArticle(db: BaseMbongo, entrepriseId: string, a: NouvelArticle): Promise<string> {
  const designation = a.designation.trim();
  if (!designation) throw new ErreurSaisie(["Donnez le nom de l'article."]);
  const existants = await db.articles.where('entrepriseId').equals(entrepriseId).toArray();
  if (existants.some((x) => x.designation.toLowerCase() === designation.toLowerCase())) throw new ErreurSaisie(['Cet article existe déjà.']);
  if (!(a.quantite >= 0) || !Number.isSafeInteger(a.prixUnitaire) || a.prixUnitaire < 0) throw new ErreurSaisie(['Quantité ou prix invalide.']);
  const id = nouvelId();
  const creeLe = new Date().toISOString();
  await db.transaction('rw', [db.articles, db.mouvementsStock, db.fileEnvoi], async () => {
    await db.articles.add({ id, entrepriseId, designation, unite: a.unite.trim(), creeLe });
    await db.fileEnvoi.add(envoi('articles', id, creeLe));
    if (a.quantite > 0) {
      const m = nouvelId();
      await db.mouvementsStock.add({ id: m, entrepriseId, articleId: id, date: a.date, sens: 'entree', quantite: a.quantite, prixUnitaire: a.prixUnitaire, motif: 'stock_initial', creeLe });
      await db.fileEnvoi.add(envoi('mouvementsStock', m, creeLe));
    }
  });
  return id;
}

export interface NouveauMouvement {
  articleId: string;
  date: DateISO;
  sens: 'entree' | 'sortie';
  quantite: number;
  prixUnitaire?: Montant;
  motif: MotifMouvement;
  origine?: string;
}

/** Enregistre un mouvement. Une sortie ne peut pas dépasser le stock disponible à sa date. */
export async function enregistrerMouvement(db: BaseMbongo, entrepriseId: string, m: NouveauMouvement): Promise<string> {
  const article = await db.articles.get(m.articleId);
  if (!article || article.entrepriseId !== entrepriseId) throw new ErreurSaisie(['Article introuvable.']);
  if (!(m.quantite > 0)) throw new ErreurSaisie(['La quantité doit être plus grande que zéro.']);
  if (m.sens === 'entree' && !(Number.isSafeInteger(m.prixUnitaire) && (m.prixUnitaire ?? -1) >= 0)) throw new ErreurSaisie(["Indiquez le prix d'achat unitaire."]);
  if (m.sens === 'sortie') {
    const avant = await mouvementsArticle(db, m.articleId);
    const dispo = valoriser([...avant, { date: m.date, sens: 'sortie', quantite: m.quantite }], 'cump_entree');
    if (dispo.manque > 0) throw new ErreurSaisie([`Il ne reste que ${valoriser(avant, 'cump_entree', m.date).quantite} ${article.unite || ''} de « ${article.designation} » à cette date.`.replace('  ', ' ')]);
  }
  const id = nouvelId();
  const creeLe = new Date().toISOString();
  await db.transaction('rw', [db.mouvementsStock, db.fileEnvoi], async () => {
    await db.mouvementsStock.add({
      id,
      entrepriseId,
      articleId: m.articleId,
      date: m.date,
      sens: m.sens,
      quantite: m.quantite,
      ...(m.sens === 'entree' ? { prixUnitaire: m.prixUnitaire } : {}),
      motif: m.motif,
      ...(m.origine ? { origine: m.origine } : {}),
      creeLe,
    });
    await db.fileEnvoi.add(envoi('mouvementsStock', id, creeLe));
  });
  return id;
}

export async function mouvementsArticle(db: BaseMbongo, articleId: string): Promise<LigneMouvementStock[]> {
  const l = await db.mouvementsStock.where('articleId').equals(articleId).toArray();
  return l.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.creeLe < b.creeLe ? -1 : 1));
}

export interface FicheArticle {
  article: LigneArticle;
  etat: EtatArticle;
}

/** Toutes les fiches de l'entreprise, valorisées à une date. */
export async function fichesStock(db: BaseMbongo, entrepriseId: string, auDate: DateISO): Promise<{ methode: MethodeValorisation; fiches: FicheArticle[] }> {
  const methode = await methodeStock(db, entrepriseId);
  const [articles, mouvements] = await Promise.all([db.articles.where('entrepriseId').equals(entrepriseId).toArray(), db.mouvementsStock.where('entrepriseId').equals(entrepriseId).toArray()]);
  const fiches = articles
    .map((article) => ({ article, etat: valoriser(mouvements.filter((m) => m.articleId === article.id), methode, auDate) }))
    .sort((a, b) => a.article.designation.localeCompare(b.article.designation));
  return { methode, fiches };
}

/** Quantité en stock d'un article à une date, compte tenu de tous ses mouvements (y compris les sorties datées après). */
export async function sortiePossible(db: BaseMbongo, articleId: string, date: DateISO, quantite: number): Promise<boolean> {
  const avant = await mouvementsArticle(db, articleId);
  return valoriser([...avant, { date, sens: 'sortie', quantite }], 'cump_entree').manque === 0;
}

/** Mention pour la note 2 (AUDCIF, art. 44 : la méthode retenue figure dans les notes annexes). */
export async function mentionMethodeStock(db: BaseMbongo, entrepriseId: string): Promise<string> {
  const articles = await db.articles.where('entrepriseId').equals(entrepriseId).count();
  if (!articles) return "Stock évalué au coût d'achat, à l'inventaire de fin d'exercice.";
  return `Méthode d'évaluation des stocks : ${LIBELLE_METHODE[await methodeStock(db, entrepriseId)]}.`;
}
