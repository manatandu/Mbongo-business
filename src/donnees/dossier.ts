/**
 * Construit le dossier d'un exercice, tel que le moteur l'attend, à partir de la base locale.
 * Les lignes d'exercices précédents (factures reportées, matériel ancien) sont reprises ici.
 */
import type { DossierExercice, Immobilisation, Operation, PieceTiers } from '../moteur';
import type { BaseMbongo } from './base';
import type { LigneCompte, LigneEntreprise, LigneExercice, LigneOperation, LigneTiers } from './types';

export interface Chargement {
  entreprise: LigneEntreprise;
  exercice: LigneExercice;
  comptes: LigneCompte[];
  dossier: DossierExercice;
}

function versOperation(l: LigneOperation, avecPhoto: Set<string>): Operation {
  const o: Operation = {
    id: l.id,
    date: l.date,
    type: l.type,
    compte: l.compte,
    nature: l.nature,
    libelle: l.libelle,
    montant: l.montant,
    devise: l.devise,
    taux: l.taux,
    // Une photo ajoutée après coup justifie l'opération sans la modifier.
    piece: l.piece || avecPhoto.has(l.id),
  };
  if (l.compteDestination !== undefined) o.compteDestination = l.compteDestination;
  if (l.montantDestination !== undefined) o.montantDestination = l.montantDestination;
  if (l.annule !== undefined) o.annule = l.annule;
  if (l.reprise) o.reprise = true;
  if (l.reglementDe) o.reglementDe = { genre: l.reglementDe.genre, ligne: l.reglementDe.ligne };
  return o;
}

function versPiece(l: LigneTiers, regleAvant: number): PieceTiers {
  const p: PieceTiers = { id: l.id, date: l.date, facture: l.facture, nom: l.nom, nature: l.nature, montant: l.montant, devise: l.devise, taux: l.taux };
  if (regleAvant > 0) p.regleAvant = regleAvant;
  return p;
}

export async function chargerDossier(db: BaseMbongo, exerciceId: string): Promise<Chargement> {
  const exercice = await db.exercices.get(exerciceId);
  if (!exercice) throw new Error(`Exercice introuvable : ${exerciceId}`);
  const entreprise = await db.entreprises.get(exercice.entrepriseId);
  if (!entreprise) throw new Error(`Entreprise introuvable : ${exercice.entrepriseId}`);
  const id = entreprise.id;
  const { debut, fin } = exercice;

  const [comptes, lignesOps, lignesTiers, immos, sorties, inventaire, confirmations, pieces] = await Promise.all([
    db.comptes.where('entrepriseId').equals(id).sortBy('ordre'),
    db.operations.where('entrepriseId').equals(id).toArray(),
    db.tiers.where('entrepriseId').equals(id).toArray(),
    db.immobilisations.where('entrepriseId').equals(id).toArray(),
    db.sorties.where('entrepriseId').equals(id).toArray(),
    db.inventaires.where('exerciceId').equals(exerciceId).sortBy('ordre'),
    db.confirmations.where('entrepriseId').equals(id).toArray(),
    db.pieces.where('entrepriseId').equals(id).toArray(),
  ]);

  const avecPhoto = new Set(pieces.map((p) => p.operationId));
  const operations = lignesOps
    .filter((o) => o.date >= debut && o.date <= fin)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.creeLe < b.creeLe ? -1 : a.creeLe > b.creeLe ? 1 : 0))
    .map((o) => versOperation(o, avecPhoto));
  const idsDossier = new Set(operations.map((o) => o.id));

  // Part déjà réglée, avant l'ouverture, des factures reportées.
  const regleAvant = new Map<string, number>();
  for (const o of lignesOps) {
    if (o.date >= debut || !o.reglementDe) continue;
    regleAvant.set(o.reglementDe.ligne, (regleAvant.get(o.reglementDe.ligne) ?? 0) + (o.annule ? -o.montant : o.montant));
  }
  const tiers = (genre: 'creance' | 'dette'): PieceTiers[] =>
    lignesTiers
      .filter((l) => l.genre === genre && l.date <= fin)
      .flatMap((l) => {
        const avant = l.date < debut ? (regleAvant.get(l.id) ?? 0) : 0;
        if (l.date < debut && l.montant - avant <= 0) return [];
        return [versPiece(l, avant)];
      })
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const sortieDe = new Map(sorties.map((s) => [s.immobilisationId, s]));
  const immobilisations: Immobilisation[] = immos
    .filter((i) => i.date <= fin)
    .flatMap((i) => {
      const s = sortieDe.get(i.id);
      // Un bien sorti avant l'exercice n'a plus rien à y faire.
      if (s && s.date < debut) return [];
      const immo: Immobilisation = { id: i.id, date: i.date, designation: i.designation, categorie: i.categorie, montant: i.montant, duree: i.duree };
      if (i.operation !== undefined) immo.operation = i.operation;
      if (s && s.date <= fin) {
        immo.sortie = { date: s.date, prixCession: s.prixCession };
        if (s.operation !== undefined) immo.sortie.operation = s.operation;
      }
      return [immo];
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const dossier: DossierExercice = {
    entreprise: { nom: entreprise.nom, secteur: entreprise.secteur, nif: entreprise.nif },
    exercice: { annee: exercice.annee, debut, fin },
    comptes: comptes.map((c) => ({ id: c.id, type: c.type, libelle: c.libelle, devise: c.devise })),
    soldesOuverture: { ...exercice.soldesOuverture },
    tauxOuverture: exercice.tauxOuverture,
    empruntOuverture: exercice.empruntOuverture,
    operations,
    creances: tiers('creance'),
    dettes: tiers('dette'),
    immobilisations,
    stockInitial: exercice.stockInitial,
    stockFinal: exercice.stockFinal,
    confirmationsTaux: confirmations.filter((c) => idsDossier.has(c.operation)).map((c) => ({ operation: c.operation, taux: c.taux })),
    tauxCloture: exercice.tauxCloture,
  };
  if (inventaire.length) {
    dossier.lignesStock = inventaire.map((l) => ({ reference: l.reference, designation: l.designation, quantite: l.quantite, prixUnitaire: l.prixUnitaire, montant: l.montant }));
  }
  return { entreprise, exercice, comptes, dossier };
}
