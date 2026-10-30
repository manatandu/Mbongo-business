/**
 * Écritures du commerçant dans la base locale.
 * Chaque ajout passe d'abord par la validation du moteur sur le dossier complet :
 * une saisie qui rendrait le dossier incohérent est refusée avant d'être écrite.
 */
import {
  encaisser,
  situationTiers,
  NATURES_IMMOBILISATION,
  regler,
  valider,
  valoriser,
  versFC,
  type CategorieImmobilisation,
  type DateISO,
  type DossierExercice,
  type GenreTiers,
  type Immobilisation,
  type Montant,
  type Operation,
  type ParametresReglement,
  type PieceTiers,
  type SortieImmobilisation,
} from '../moteur';
import type { BaseMbongo } from './base';
import { chargerDossier } from './dossier';
import { nouvelId } from './ids';
import { identifiantAppareil } from './reglages';
import type { LigneInventaire, LigneTaux, Trace } from './types';

/** Saisie refusée : messages à montrer au commerçant. */
export class ErreurSaisie extends Error {
  readonly messages: string[];
  constructor(messages: string[]) {
    super(messages.join(' '));
    this.name = 'ErreurSaisie';
    this.messages = messages;
  }
}

interface Ajouts {
  operations?: Operation[];
  tiers?: (PieceTiers & { genre: GenreTiers })[];
  immobilisations?: Immobilisation[];
  sorties?: { immobilisationId: string; sortie: SortieImmobilisation }[];
}

function fusionner(d: DossierExercice, a: Ajouts): DossierExercice {
  const sorties = new Map((a.sorties ?? []).map((s) => [s.immobilisationId, s.sortie]));
  return {
    ...d,
    operations: [...d.operations, ...(a.operations ?? [])],
    creances: [...d.creances, ...(a.tiers ?? []).filter((t) => t.genre === 'creance')],
    dettes: [...d.dettes, ...(a.tiers ?? []).filter((t) => t.genre === 'dette')],
    immobilisations: [...d.immobilisations, ...(a.immobilisations ?? [])].map((i) => (sorties.has(i.id) ? { ...i, sortie: sorties.get(i.id) } : i)),
  };
}

async function verifierEtEcrire(db: BaseMbongo, exerciceId: string, ajouts: Ajouts): Promise<void> {
  const { dossier, entreprise, exercice } = await chargerDossier(db, exerciceId);
  if (exercice.statut === 'arrete' || exercice.statut === 'clos') {
    throw new ErreurSaisie([`Les états ${exercice.annee} sont arrêtés par l'expert-comptable : plus de saisie sur cet exercice.`]);
  }
  const erreurs = valider(fusionner(dossier, ajouts));
  if (erreurs.length) throw new ErreurSaisie(erreurs);

  const trace: Trace = { entrepriseId: entreprise.id, auteur: await identifiantAppareil(db), creeLe: new Date().toISOString(), envoi: 'local' };
  const envoi = (table: string, ligne: string) => ({ table, ligne, creeLe: trace.creeLe, tentatives: 0 });
  await db.transaction('rw', [db.operations, db.tiers, db.immobilisations, db.sorties, db.fileEnvoi], async () => {
    for (const o of ajouts.operations ?? []) {
      await db.operations.add({ ...o, ...trace });
      await db.fileEnvoi.add(envoi('operations', o.id));
    }
    for (const t of ajouts.tiers ?? []) {
      await db.tiers.add({ ...t, ...trace });
      await db.fileEnvoi.add(envoi('tiers', t.id));
    }
    for (const i of ajouts.immobilisations ?? []) {
      const { sortie: _sortie, ...ligne } = i;
      await db.immobilisations.add({ ...ligne, ...trace });
      await db.fileEnvoi.add(envoi('immobilisations', i.id));
    }
    for (const s of ajouts.sorties ?? []) {
      const id = nouvelId();
      await db.sorties.add({ id, immobilisationId: s.immobilisationId, ...s.sortie, ...trace });
      await db.fileEnvoi.add(envoi('sorties', id));
    }
  });
}

export type NouvelleOperation = Omit<Operation, 'id' | 'annule' | 'reglementDe'>;

export interface NouveauBien {
  designation: string;
  categorie: CategorieImmobilisation;
  /** Années ; sans objet pour une caution. */
  duree: number;
}

/** Recette, dépense ou transfert. Un achat de matériel ou une caution entre aussi au registre. */
export async function enregistrerOperation(db: BaseMbongo, exerciceId: string, o: NouvelleOperation, bien?: NouveauBien): Promise<string> {
  const op: Operation = { ...o, id: nouvelId() };
  const immobilisations: Immobilisation[] = [];
  if (NATURES_IMMOBILISATION.includes(o.nature)) {
    if (!bien) throw new ErreurSaisie(['Indiquez le bien acheté.']);
    immobilisations.push({
      id: nouvelId(),
      date: o.date,
      designation: bien.designation,
      categorie: o.nature === 'caution' ? 'caution' : bien.categorie,
      montant: versFC(o.montant, o.devise, o.taux),
      duree: o.nature === 'caution' ? 0 : bien.duree,
      operation: op.id,
    });
  }
  await verifierEtEcrire(db, exerciceId, { operations: [op], immobilisations });
  return op.id;
}

/** Vente à crédit (créance) ou achat à crédit (dette). Aucun mouvement de trésorerie. */
export async function enregistrerFacture(db: BaseMbongo, exerciceId: string, genre: GenreTiers, f: Omit<PieceTiers, 'id' | 'regleAvant'>): Promise<string> {
  const id = nouvelId();
  await verifierEtEcrire(db, exerciceId, { tiers: [{ ...f, id, genre }] });
  return id;
}

/** Le client paie, ou le commerçant paie son fournisseur, en tout ou en partie. */
export async function enregistrerReglement(
  db: BaseMbongo,
  exerciceId: string,
  genre: GenreTiers,
  ligneId: string,
  p: Omit<ParametresReglement, 'id'>,
): Promise<string> {
  const { dossier } = await chargerDossier(db, exerciceId);
  let op: Operation;
  try {
    op = (genre === 'creance' ? encaisser : regler)(dossier, ligneId, { ...p, id: nouvelId() });
  } catch (e) {
    throw new ErreurSaisie([(e as Error).message]);
  }
  await verifierEtEcrire(db, exerciceId, { operations: [op] });
  return op.id;
}

/**
 * Déclare perdue une créance que le client ne paiera plus (client disparu, délai pour agir passé) : son encours
 * tombe à zéro à cette date, la baisse passe dans la variation des créances (AUDCIF, art. 43 et 46). Ajout seulement :
 * la facture reste, une ligne « perte » la suit. Un paiement reçu plus tard se note comme une autre recette.
 */
export async function declarerCreancePerdue(db: BaseMbongo, exerciceId: string, ligneId: string, date: DateISO): Promise<string> {
  const { dossier, entreprise, exercice } = await chargerDossier(db, exerciceId);
  if (exercice.statut === 'arrete' || exercice.statut === 'clos') {
    throw new ErreurSaisie([`Les états ${exercice.annee} sont arrêtés par l'expert-comptable : plus de saisie sur cet exercice.`]);
  }
  if (date < exercice.debut || date > exercice.fin) throw new ErreurSaisie(["Date hors de l'exercice."]);
  const situation = situationTiers(dossier, 'creance', date).find((x) => x.ligne.id === ligneId);
  if (!situation) throw new ErreurSaisie(['Créance introuvable.']);
  if (situation.ligne.perdueLe) throw new ErreurSaisie(['Cette créance est déjà déclarée perdue.']);
  if (situation.encours <= 0) throw new ErreurSaisie(['Cette créance est déjà réglée.']);
  const ligne = await db.tiers.get(ligneId);
  if (!ligne) throw new ErreurSaisie(['Créance introuvable.']);
  const trace: Trace = { entrepriseId: entreprise.id, auteur: await identifiantAppareil(db), creeLe: new Date().toISOString(), envoi: 'local' };
  const id = nouvelId();
  await db.transaction('rw', [db.tiers, db.fileEnvoi], async () => {
    await db.tiers.add({ ...ligne, ...trace, id, date, perte: ligneId });
    await db.fileEnvoi.add({ table: 'tiers', ligne: id, creeLe: trace.creeLe, tentatives: 0 });
  });
  return id;
}

/**
 * Reconnaissance de dette signée par le client (modèle du dossier de créance) : le commerçant note sa date.
 * Le délai pour réclamer repart de ce jour, pour la même durée (AUDCG, art. 22 et 23).
 */
export async function noterReconnaissance(db: BaseMbongo, exerciceId: string, ligneId: string, date: DateISO, aujourdhui: DateISO): Promise<string> {
  const { dossier, entreprise, exercice } = await chargerDossier(db, exerciceId);
  if (exercice.statut === 'arrete' || exercice.statut === 'clos') {
    throw new ErreurSaisie([`Les états ${exercice.annee} sont arrêtés par l'expert-comptable : plus de saisie sur cet exercice.`]);
  }
  if (date > aujourdhui) throw new ErreurSaisie(['La date de signature ne peut pas être dans le futur.']);
  if (date < exercice.debut || date > exercice.fin) throw new ErreurSaisie(["Date hors de l'exercice."]);
  const ligne = await db.tiers.get(ligneId);
  if (!ligne || ligne.genre !== 'creance') throw new ErreurSaisie(['Créance introuvable.']);
  if (date < ligne.date) throw new ErreurSaisie(['La reconnaissance ne peut pas précéder la facture.']);
  const situation = situationTiers(dossier, 'creance', date).find((x) => x.ligne.id === ligneId);
  if (!situation) throw new ErreurSaisie(['Créance introuvable.']);
  if (situation.ligne.perdueLe) throw new ErreurSaisie(['Cette créance est déclarée perdue.']);
  if (situation.encours <= 0) throw new ErreurSaisie(['Cette créance est déjà réglée.']);
  const trace: Trace = { entrepriseId: entreprise.id, auteur: await identifiantAppareil(db), creeLe: new Date().toISOString(), envoi: 'local' };
  const id = nouvelId();
  await db.transaction('rw', [db.tiers, db.fileEnvoi], async () => {
    await db.tiers.add({ ...ligne, ...trace, id, date, reconnaissance: ligneId });
    await db.fileEnvoi.add({ table: 'tiers', ligne: id, creeLe: trace.creeLe, tentatives: 0 });
  });
  return id;
}

/**
 * Une saisie annulée emporte ses mouvements de stock : chaque mouvement lié reçoit son inverse (correction).
 * Une vente annulée fait revenir la marchandise au coût moyen du moment.
 */
async function inverserStock(db: BaseMbongo, entrepriseId: string, origine: string, annulation: string, date: DateISO): Promise<void> {
  const tous = await db.mouvementsStock.where('entrepriseId').equals(entrepriseId).toArray();
  const lies = tous.filter((m) => m.origine === origine);
  if (!lies.length) return;
  const creeLe = new Date().toISOString();
  await db.transaction('rw', [db.mouvementsStock, db.fileEnvoi], async () => {
    for (const m of lies) {
      const jour = date < m.date ? m.date : date;
      const id = nouvelId();
      let prixUnitaire: Montant | undefined;
      if (m.sens === 'sortie') {
        const etat = valoriser(tous.filter((x) => x.articleId === m.articleId), 'cump_entree', jour);
        const dernier = tous.filter((x) => x.articleId === m.articleId && x.sens === 'entree').at(-1)?.prixUnitaire ?? 0;
        prixUnitaire = Math.round(etat.coutUnitaire) || dernier;
      }
      await db.mouvementsStock.add({
        id,
        entrepriseId,
        articleId: m.articleId,
        date: jour,
        sens: m.sens === 'entree' ? 'sortie' : 'entree',
        quantite: m.quantite,
        ...(prixUnitaire !== undefined ? { prixUnitaire } : {}),
        motif: 'ajustement',
        origine: annulation,
        creeLe,
      });
      await db.fileEnvoi.add({ table: 'mouvementsStock', ligne: id, creeLe, tentatives: 0 });
    }
  });
}

/**
 * Retire une vente ou un achat à crédit saisi par erreur. Une ligne d'annulation est ajoutée, l'originale reste.
 * Refusé dès qu'un paiement a été enregistré sur la facture : il faut d'abord annuler ce paiement.
 */
export async function annulerFacture(db: BaseMbongo, exerciceId: string, ligneId: string): Promise<string> {
  const { dossier, entreprise, exercice } = await chargerDossier(db, exerciceId);
  if (exercice.statut === 'arrete' || exercice.statut === 'clos') {
    throw new ErreurSaisie([`Les états ${exercice.annee} sont arrêtés par l'expert-comptable : plus de saisie sur cet exercice.`]);
  }
  const ligne = await db.tiers.get(ligneId);
  if (!ligne || ligne.annule) throw new ErreurSaisie(['Facture introuvable.']);
  const lignes = await db.tiers.where('entrepriseId').equals(entreprise.id).toArray();
  if (lignes.some((l) => l.annule === ligneId)) throw new ErreurSaisie(['Cette facture est déjà retirée.']);
  if (lignes.some((l) => l.perte === ligneId)) throw new ErreurSaisie(['Cette créance est déclarée perdue : elle ne se retire plus.']);
  if (ligne.date < exercice.debut) throw new ErreurSaisie(["Cette facture vient de l'année passée : elle ne peut plus être retirée."]);
  const paye = dossier.operations.filter((o) => o.reglementDe?.ligne === ligneId).reduce((x, o) => x + (o.annule ? -o.montant : o.montant), 0);
  if (paye > 0) throw new ErreurSaisie(["Un paiement est déjà noté sur cette facture. Annulez-le d'abord dans le journal."]);

  const trace: Trace = { entrepriseId: entreprise.id, auteur: await identifiantAppareil(db), creeLe: new Date().toISOString(), envoi: 'local' };
  const id = nouvelId();
  await db.transaction('rw', [db.tiers, db.fileEnvoi], async () => {
    await db.tiers.add({ ...ligne, ...trace, id, annule: ligneId });
    await db.fileEnvoi.add({ table: 'tiers', ligne: id, creeLe: trace.creeLe, tentatives: 0 });
  });
  await inverserStock(db, entreprise.id, ligneId, id, ligne.date);
  return id;
}

/** Corrige une erreur : contre-passation à la date donnée (D5). L'opération d'origine reste. */
export async function annulerOperation(db: BaseMbongo, exerciceId: string, operationId: string, date: DateISO): Promise<string> {
  const { dossier, entreprise } = await chargerDossier(db, exerciceId);
  const cible = dossier.operations.find((o) => o.id === operationId);
  if (!cible) throw new ErreurSaisie(['Opération introuvable dans cet exercice.']);
  if (cible.annule) throw new ErreurSaisie(["C'est déjà une annulation."]);
  if (dossier.operations.some((o) => o.annule === operationId)) throw new ErreurSaisie(['Cette opération est déjà annulée.']);
  const annulation: Operation = { ...cible, id: nouvelId(), date: date < cible.date ? cible.date : date, libelle: `Annulation : ${cible.libelle}`, annule: cible.id, piece: true };
  delete annulation.reprise;
  await verifierEtEcrire(db, exerciceId, { operations: [annulation] });
  await inverserStock(db, entreprise.id, cible.id, annulation.id, annulation.date);
  return annulation.id;
}

/**
 * Sortie du registre : vente du bien, caution rendue (avec encaissement) ou bien jeté (sans prix).
 * `prix` est dans la devise du compte d'encaissement.
 */
export async function sortirImmobilisation(
  db: BaseMbongo,
  exerciceId: string,
  immobilisationId: string,
  s: { date: DateISO; prix: Montant; compte?: string; taux?: number | null; libelle: string },
): Promise<void> {
  const { dossier, comptes } = await chargerDossier(db, exerciceId);
  if (!dossier.immobilisations.some((i) => i.id === immobilisationId)) throw new ErreurSaisie(['Bien introuvable au registre.']);
  if (s.prix <= 0) {
    await verifierEtEcrire(db, exerciceId, { sorties: [{ immobilisationId, sortie: { date: s.date, prixCession: 0 } }] });
    return;
  }
  const compte = comptes.find((c) => c.id === s.compte);
  if (!compte) throw new ErreurSaisie(["Choisissez le compte où l'argent est entré."]);
  const taux = compte.devise === 'USD' ? (s.taux ?? null) : null;
  const op: Operation = { id: nouvelId(), date: s.date, type: 'recette', compte: compte.id, nature: 'cession_materiel', libelle: s.libelle, montant: s.prix, devise: compte.devise, taux, piece: true };
  let prixCession: Montant;
  try {
    prixCession = versFC(s.prix, compte.devise, taux);
  } catch (e) {
    throw new ErreurSaisie([(e as Error).message]);
  }
  await verifierEtEcrire(db, exerciceId, { operations: [op], sorties: [{ immobilisationId, sortie: { date: s.date, prixCession, operation: op.id } }] });
}

/** Photo d'une pièce, ajoutée à la saisie ou plus tard. */
export async function ajouterPhoto(db: BaseMbongo, entrepriseId: string, operationId: string, donnees: Blob): Promise<string> {
  const id = nouvelId();
  await db.transaction('rw', [db.pieces, db.fileEnvoi], async () => {
    const creeLe = new Date().toISOString();
    await db.pieces.add({ id, entrepriseId, operationId, donnees, type: donnees.type, taille: donnees.size, creeLe, envoi: 'local' });
    await db.fileEnvoi.add({ table: 'pieces', ligne: id, creeLe, tentatives: 0 });
  });
  return id;
}

/** Inventaire de fin d'exercice : document de travail, modifiable jusqu'à sa validation. */
export async function enregistrerInventaire(db: BaseMbongo, exerciceId: string, lignes: Omit<LigneInventaire, 'id' | 'exerciceId' | 'ordre'>[]): Promise<void> {
  const ex = await db.exercices.get(exerciceId);
  if (!ex) throw new ErreurSaisie(['Exercice introuvable.']);
  if (ex.stockFinal !== null) throw new ErreurSaisie(["L'inventaire est déjà validé."]);
  for (const l of lignes) {
    if (!Number.isSafeInteger(l.montant) || l.montant < 0) throw new ErreurSaisie([`Ligne « ${l.designation} » : montant invalide.`]);
  }
  await db.transaction('rw', db.inventaires, async () => {
    await db.inventaires.where('exerciceId').equals(exerciceId).delete();
    await db.inventaires.bulkAdd(lignes.map((l, ordre) => ({ ...l, id: nouvelId(), exerciceId, ordre })));
  });
}

/**
 * Le commerçant valide son inventaire : le total devient le stock final de l'exercice.
 * Pas avant le 1er décembre (`aujourdhui`, quand on le donne) : c'est l'inventaire de fin d'exercice.
 */
export async function validerInventaire(db: BaseMbongo, exerciceId: string, aujourdhui?: DateISO): Promise<Montant> {
  const ex = await db.exercices.get(exerciceId);
  if (ex && aujourdhui && aujourdhui < `${ex.annee}-12-01`) throw new ErreurSaisie(["L'inventaire se valide à partir du 1er décembre. Gardez le brouillon en attendant."]);
  const lignes = await db.inventaires.where('exerciceId').equals(exerciceId).toArray();
  const total = lignes.reduce((s, l) => s + l.montant, 0);
  await db.exercices.update(exerciceId, { stockFinal: total, statut: 'inventaire' });
  return total;
}

export async function enregistrerTaux(db: BaseMbongo, date: DateISO, valeur: number, source: LigneTaux['source']): Promise<void> {
  if (!(valeur > 0)) throw new ErreurSaisie(['Taux invalide.']);
  await db.taux.add({ id: nouvelId(), date, valeur, source });
}

/** Dernier taux connu à une date, pour préremplir une saisie en dollars. */
export async function dernierTaux(db: BaseMbongo, auPlusTard: DateISO): Promise<LigneTaux | undefined> {
  return db.taux.where('date').belowOrEqual(auPlusTard).last();
}
