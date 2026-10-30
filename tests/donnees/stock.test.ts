import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { BaseMbongo } from '../../src/donnees/base';
import { creerEntreprise } from '../../src/donnees/entreprise';
import { chargerDossier } from '../../src/donnees/dossier';
import { annulerFacture, annulerOperation, enregistrerFacture, enregistrerInventaire, enregistrerOperation, enregistrerReglement, validerInventaire } from '../../src/donnees/saisie';
import { calculerEtats } from '../../src/moteur';
import { creerArticle, definirMethodeStock, enregistrerMouvement, fichesStock, methodeStock } from '../../src/donnees/stock';

let db: BaseMbongo;
let ent: string;
let exerciceId: string;

beforeEach(async () => {
  db = new BaseMbongo(`test-${Math.random()}`);
  const r = await creerEntreprise(db, {
    nom: 'Dépôt de test (fictif)', activite: '', secteur: 'negoce', commune: '', nif: '', responsable: '', telephone: '', annee: 2026,
    comptes: [{ type: 'caisse', libelle: 'Caisse', devise: 'CDF', solde: 0 }], stockInitial: 0, tauxOuverture: null,
  });
  ent = r.entrepriseId;
  exerciceId = r.exerciceId;
});

describe('fiches de stock', () => {
  it('CUMP après chaque entrée par défaut ; les ventes épuisent le stock', async () => {
    expect(await methodeStock(db, ent)).toBe('cump_entree');
    const riz = await creerArticle(db, ent, { designation: 'Riz 25 kg', unite: 'sac', quantite: 100, prixUnitaire: 30_000, date: '2026-01-01' });
    await enregistrerMouvement(db, ent, { articleId: riz, date: '2026-02-10', sens: 'entree', quantite: 200, prixUnitaire: 33_000, motif: 'achat' });
    await enregistrerMouvement(db, ent, { articleId: riz, date: '2026-03-05', sens: 'sortie', quantite: 150, motif: 'vente' });
    const { fiches } = await fichesStock(db, ent, '2026-12-31');
    expect(fiches[0]!.etat.quantite).toBe(150);
    expect(fiches[0]!.etat.coutUnitaire).toBe(32_000);
    expect(fiches[0]!.etat.valeur).toBe(4_800_000);
  });

  it('refuse une sortie plus grande que le stock, même dans le passé', async () => {
    const huile = await creerArticle(db, ent, { designation: 'Huile 5 L', unite: 'bidon', quantite: 10, prixUnitaire: 15_000, date: '2026-01-01' });
    await expect(enregistrerMouvement(db, ent, { articleId: huile, date: '2026-01-02', sens: 'sortie', quantite: 11, motif: 'vente' })).rejects.toThrow('Il ne reste que 10');
    await enregistrerMouvement(db, ent, { articleId: huile, date: '2026-03-01', sens: 'sortie', quantite: 8, motif: 'vente' });
    // Une sortie antérieure qui rendrait la vente du 1er mars impossible est refusée.
    await expect(enregistrerMouvement(db, ent, { articleId: huile, date: '2026-02-01', sens: 'sortie', quantite: 5, motif: 'perte' })).rejects.toThrow();
  });

  it('change de méthode : PEPS', async () => {
    await definirMethodeStock(db, ent, 'peps');
    const a = await creerArticle(db, ent, { designation: 'Savon', unite: 'carton', quantite: 10, prixUnitaire: 10_000, date: '2026-01-01' });
    await enregistrerMouvement(db, ent, { articleId: a, date: '2026-02-01', sens: 'entree', quantite: 10, prixUnitaire: 12_000, motif: 'achat' });
    await enregistrerMouvement(db, ent, { articleId: a, date: '2026-03-01', sens: 'sortie', quantite: 12, motif: 'vente' });
    const { methode, fiches } = await fichesStock(db, ent, '2026-12-31');
    expect(methode).toBe('peps');
    expect(fiches[0]!.etat.valeur).toBe(8 * 12_000);
  });

  it('refuse un article en double', async () => {
    await creerArticle(db, ent, { designation: 'Sucre', unite: 'sac', quantite: 0, prixUnitaire: 0, date: '2026-01-01' });
    await expect(creerArticle(db, ent, { designation: ' sucre ', unite: 'sac', quantite: 0, prixUnitaire: 0, date: '2026-01-01' })).rejects.toThrow('existe déjà');
  });

  it("compte les travaux en cours dans l'inventaire (Titre X : stocks et travaux en cours)", async () => {
    await enregistrerInventaire(db, exerciceId, [
      { reference: 'S1', designation: 'Tissu wax', quantite: 12, prixUnitaire: 15_000, montant: 180_000 },
      { reference: 'T1', designation: 'Robe de mariée en couture', quantite: 1, prixUnitaire: 95_000, montant: 95_000, travauxEnCours: true },
    ]);
    await validerInventaire(db, exerciceId);
    const e = calculerEtats((await chargerDossier(db, exerciceId)).dossier);
    expect(e.bilan.actif.stocks).toBe(275_000);
    expect(e.notes.note2.lignes.filter((l) => l.travauxEnCours).map((l) => l.designation)).toEqual(['Robe de mariée en couture']);
    expect(e.bilan.equilibre).toBe(true);
  });
});

describe('annulation et stock', () => {
  it('une vente annulée remet la marchandise en stock', async () => {
    const riz = await creerArticle(db, ent, { designation: 'Riz', unite: 'sac', quantite: 10, prixUnitaire: 30_000, date: '2026-01-01' });
    const { comptes } = await chargerDossier(db, exerciceId);
    const op = await enregistrerOperation(db, exerciceId, { date: '2026-02-01', type: 'recette', compte: comptes[0]!.id, nature: 'ventes', libelle: 'Vente', montant: 140_000, devise: 'CDF', taux: null, piece: true });
    await enregistrerMouvement(db, ent, { articleId: riz, date: '2026-02-01', sens: 'sortie', quantite: 4, motif: 'vente', origine: op });
    expect((await fichesStock(db, ent, '2026-12-31')).fiches[0]!.etat.quantite).toBe(6);
    await annulerOperation(db, exerciceId, op, '2026-02-02');
    const fiche = (await fichesStock(db, ent, '2026-12-31')).fiches[0]!.etat;
    expect(fiche.quantite).toBe(10);
    expect(fiche.valeur).toBe(300_000);
  });

  it('un achat à crédit retiré sort sa marchandise du stock et disparaît des dettes', async () => {
    const huile = await creerArticle(db, ent, { designation: 'Huile', unite: 'bidon', quantite: 0, prixUnitaire: 0, date: '2026-01-01' });
    const f = await enregistrerFacture(db, exerciceId, 'dette', { date: '2026-03-01', facture: 'A-1', nom: 'Grossiste (fictif)', nature: 'achats_marchandises', montant: 150_000, devise: 'CDF', taux: null });
    await enregistrerMouvement(db, ent, { articleId: huile, date: '2026-03-01', sens: 'entree', quantite: 10, prixUnitaire: 15_000, motif: 'achat', origine: f });
    await annulerFacture(db, exerciceId, f);
    expect((await chargerDossier(db, exerciceId)).dossier.dettes).toHaveLength(0);
    expect((await fichesStock(db, ent, '2026-12-31')).fiches[0]!.etat.quantite).toBe(0);
    await expect(annulerFacture(db, exerciceId, f)).rejects.toThrow('déjà retirée');
  });

  it("refuse de retirer une facture déjà payée en partie", async () => {
    const { comptes } = await chargerDossier(db, exerciceId);
    await enregistrerOperation(db, exerciceId, { date: '2026-01-02', type: 'recette', compte: comptes[0]!.id, nature: 'apport', libelle: 'Apport', montant: 500_000, devise: 'CDF', taux: null, piece: true });
    const f = await enregistrerFacture(db, exerciceId, 'dette', { date: '2026-03-01', facture: 'A-2', nom: 'Grossiste (fictif)', nature: 'achats_marchandises', montant: 150_000, devise: 'CDF', taux: null });
    await enregistrerReglement(db, exerciceId, 'dette', f, { date: '2026-03-05', compte: comptes[0]!.id, montant: 50_000 });
    await expect(annulerFacture(db, exerciceId, f)).rejects.toThrow('paiement');
  });
});
