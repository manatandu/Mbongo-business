/**
 * Construit le dossier d'un exercice, tel que le moteur l'attend, à partir de la base locale.
 * Les lignes d'exercices précédents (factures reportées, matériel ancien) sont reprises ici.
 */
import { calculerEtats, type DossierExercice, type Etats, type Immobilisation, type Operation, type PieceTiers } from '../moteur';
import type { BaseMbongo } from './base';
import type { ContexteFiscal } from './echeancier';
import { regimeConfirme, type RegimeConfirme } from './fiscal-expert';
import { chiffreAffairesRealise, type AnneeCA } from './regimes';
import type { LigneCompte, LigneEntreprise, LigneExercice, LigneOperation, LigneTiers } from './types';

export interface Chargement {
  entreprise: LigneEntreprise;
  exercice: LigneExercice;
  comptes: LigneCompte[];
  dossier: DossierExercice;
  /** Chiffre d'affaires réalisé des trois années précédentes tenues dans Mbongo (régime IRPP, art. 113 ; TVA, OL 10/001, art. 14). */
  caAnterieurs: AnneeCA[];
  /** Natures saisies l'année d'avant (rappels d'employeur et de loyer en début d'année). */
  naturesAnterieures: string[];
  /** Régimes d'imposition confirmés par l'expert pour l'année et la précédente (src/donnees/fiscal-expert.ts). */
  regimesConfirmes: RegimeConfirme[];
}

/** Ce que la fiscalité doit savoir de l'historique, tiré du chargement. */
export const contexteFiscal = (c: Chargement): ContexteFiscal => ({ anterieurs: c.caAnterieurs, naturesAnterieures: c.naturesAnterieures, confirmes: c.regimesConfirmes });

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
  if (l.reference) o.reference = l.reference;
  if (l.reglementDe) o.reglementDe = { genre: l.reglementDe.genre, ligne: l.reglementDe.ligne };
  return o;
}

function versPiece(l: LigneTiers, regleAvant: number): PieceTiers {
  const p: PieceTiers = { id: l.id, date: l.date, facture: l.facture, nom: l.nom, nature: l.nature, montant: l.montant, devise: l.devise, taux: l.taux };
  if (regleAvant > 0) p.regleAvant = regleAvant;
  if (l.client) p.client = l.client;
  if (l.adresse) p.adresse = l.adresse;
  return p;
}

export async function chargerDossier(db: BaseMbongo, exerciceId: string): Promise<Chargement> {
  const exercice = await db.exercices.get(exerciceId);
  if (!exercice) throw new Error(`Exercice introuvable : ${exerciceId}`);
  const entreprise = await db.entreprises.get(exercice.entrepriseId);
  if (!entreprise) throw new Error(`Entreprise introuvable : ${exercice.entrepriseId}`);
  const id = entreprise.id;
  const { debut, fin } = exercice;

  const [comptes, lignesOps, lignesTiers, immos, sorties, inventaire, pieces, precedent, exercicesTenus] = await Promise.all([
    db.comptes.where('entrepriseId').equals(id).sortBy('ordre'),
    db.operations.where('entrepriseId').equals(id).toArray(),
    db.tiers.where('entrepriseId').equals(id).toArray(),
    db.immobilisations.where('entrepriseId').equals(id).toArray(),
    db.sorties.where('entrepriseId').equals(id).toArray(),
    db.inventaires.where('exerciceId').equals(exerciceId).sortBy('ordre'),
    db.pieces.where('entrepriseId').equals(id).toArray(),
    db.exercices
      .where('entrepriseId')
      .equals(id)
      .filter((e) => e.annee === exercice.annee - 1)
      .first(),
    db.exercices.where('entrepriseId').equals(id).toArray(),
  ]);

  const avecPhoto = new Set(pieces.map((p) => p.operationId));
  const operations = lignesOps
    .filter((o) => o.date >= debut && o.date <= fin)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.creeLe < b.creeLe ? -1 : a.creeLe > b.creeLe ? 1 : 0))
    .map((o) => versOperation(o, avecPhoto));

  // Part déjà réglée, avant l'ouverture, des factures reportées.
  const regleAvant = new Map<string, number>();
  for (const o of lignesOps) {
    if (o.date >= debut || !o.reglementDe) continue;
    regleAvant.set(o.reglementDe.ligne, (regleAvant.get(o.reglementDe.ligne) ?? 0) + (o.annule ? -o.montant : o.montant));
  }
  // Une facture corrigée sort du dossier avec sa ligne d'annulation.
  const annulees = new Set(lignesTiers.flatMap((l) => (l.annule ? [l.annule] : [])));
  const tiers = (genre: 'creance' | 'dette'): PieceTiers[] =>
    lignesTiers
      .filter((l) => l.genre === genre && l.date <= fin && !l.annule && !annulees.has(l.id))
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
    // Le taux d'ouverture suit le taux de clôture de l'année précédente, même corrigé par l'expert après coup.
    tauxOuverture: precedent?.tauxCloture ?? exercice.tauxOuverture,
    empruntOuverture: exercice.empruntOuverture,
    operations,
    creances: tiers('creance'),
    dettes: tiers('dette'),
    immobilisations,
    stockInitial: exercice.stockInitial,
    stockFinal: exercice.stockFinal,
    // Un seul taux de clôture, saisi au bureau : pas de confirmation opération par opération.
    tauxCloture: exercice.tauxCloture,
  };
  if (inventaire.length) {
    dossier.lignesStock = inventaire.map((l) => ({
      reference: l.reference,
      designation: l.designation,
      quantite: l.quantite,
      prixUnitaire: l.prixUnitaire,
      montant: l.montant,
      ...(l.travauxEnCours ? { travauxEnCours: true } : {}),
    }));
  }
  // Les trois années précédentes, si elles ont été tenues dans Mbongo.
  const facturesValides = lignesTiers.filter((l) => l.genre === 'creance' && !l.annule && !annulees.has(l.id));
  const caAnterieurs = exercicesTenus
    .filter((e) => e.annee < exercice.annee && e.annee >= exercice.annee - 3)
    .map((e) => ({ annee: e.annee, ca: chiffreAffairesRealise(e.annee, lignesOps, facturesValides) }));
  const naturesAnterieures = [...new Set(lignesOps.filter((o) => o.date.startsWith(`${exercice.annee - 1}-`)).map((o) => o.nature))];
  const regimesConfirmes = (await Promise.all([regimeConfirme(db, id, exercice.annee), regimeConfirme(db, id, exercice.annee - 1)])).filter((r): r is RegimeConfirme => r !== null);
  return { entreprise, exercice, comptes, dossier, caAnterieurs, naturesAnterieures, regimesConfirmes };
}

/** États de l'exercice précédent, pour la colonne N-1 du bilan et du compte de résultat (AUDCIF, art. 34). Null la première année. */
export async function etatsPrecedents(db: BaseMbongo, exerciceId: string): Promise<Etats | null> {
  const ex = await db.exercices.get(exerciceId);
  if (!ex) return null;
  const precedent = await db.exercices
    .where('[entrepriseId+annee]')
    .equals([ex.entrepriseId, ex.annee - 1])
    .first();
  if (!precedent) return null;
  return calculerEtats((await chargerDossier(db, precedent.id)).dossier);
}
