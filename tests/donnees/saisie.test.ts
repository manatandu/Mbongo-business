import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { calculerEtats, valider } from '../../src/moteur';
import { BaseMbongo } from '../../src/donnees/base';
import { chargerDemo } from '../../src/donnees/demo';
import { chargerDossier } from '../../src/donnees/dossier';
import { creerEntreprise, entrepriseActive, exerciceCourant, retirerEntreprise } from '../../src/donnees/entreprise';
import { codeDefini, definirCode, verifierCode } from '../../src/donnees/reglages';
import {
  annulerOperation,
  ajouterPhoto,
  enregistrerFacture,
  enregistrerInventaire,
  enregistrerOperation,
  enregistrerReglement,
  ErreurSaisie,
  sortirImmobilisation,
  validerInventaire,
} from '../../src/donnees/saisie';

let db: BaseMbongo;
let exerciceId: string;
let caisse: string;
let banque: string;
let dollars: string;

beforeEach(async () => {
  db = new BaseMbongo(`test-${Math.random()}`);
  const r = await creerEntreprise(db, {
    nom: 'Boutique de test (fictif)',
    activite: 'Alimentation',
    secteur: 'negoce',
    commune: 'Kinshasa',
    nif: '',
    responsable: 'Test (fictif)',
    telephone: '',
    annee: 2026,
    comptes: [
      { type: 'caisse', libelle: 'Caisse', devise: 'CDF', solde: 1_000_000 },
      { type: 'banque', libelle: 'Banque', devise: 'CDF', solde: 2_000_000 },
      { type: 'caisse', libelle: 'Caisse dollars', devise: 'USD', solde: 10_000 },
    ],
    stockInitial: 500_000,
    tauxOuverture: 2800,
  });
  exerciceId = r.exerciceId;
  const comptes = await db.comptes.where('entrepriseId').equals(r.entrepriseId).sortBy('ordre');
  [caisse, banque, dollars] = comptes.map((c) => c.id) as [string, string, string];
});

const vente = (montant: number, date = '2026-03-02') => ({ date, type: 'recette' as const, compte: caisse, nature: 'ventes' as const, libelle: 'Ventes', montant, devise: 'CDF' as const, taux: null, piece: true });

describe('création', () => {
  it("ouvre l'exercice de l'année avec les soldes et le stock du 1er janvier", async () => {
    const e = await entrepriseActive(db);
    expect(e?.nom).toBe('Boutique de test (fictif)');
    const ex = await exerciceCourant(db, e?.id ?? '', 2026);
    expect(ex).toMatchObject({ annee: 2026, debut: '2026-01-01', fin: '2026-12-31', stockInitial: 500_000, statut: 'ouvert' });
    const { dossier } = await chargerDossier(db, exerciceId);
    expect(valider(dossier)).toEqual([]);
    expect(calculerEtats(dossier).bilan.compteExploitant.ouverture).toBe(1_000_000 + 2_000_000 + 280_000 + 500_000);
  });
});

describe('saisie', () => {
  it("enregistre une recette, la met dans la file d'envoi, et la retrouve dans le dossier", async () => {
    const id = await enregistrerOperation(db, exerciceId, vente(150_000));
    const ligne = await db.operations.get(id);
    expect(ligne).toMatchObject({ montant: 150_000, envoi: 'local' });
    expect(ligne?.auteur).toMatch(/^appareil-/);
    expect(await db.fileEnvoi.where('table').equals('operations').count()).toBe(1);
    const { dossier } = await chargerDossier(db, exerciceId);
    expect(calculerEtats(dossier).compteDeResultat.recettesVentes).toBe(150_000);
  });

  it("refuse une saisie qui rendrait le dossier incohérent, sans rien écrire", async () => {
    await expect(enregistrerOperation(db, exerciceId, { ...vente(150_000), date: '2027-01-02' })).rejects.toBeInstanceOf(ErreurSaisie);
    await expect(enregistrerOperation(db, exerciceId, { ...vente(150_000), compte: dollars, devise: 'USD', taux: null })).rejects.toThrow(/taux manquant/);
    expect(await db.operations.count()).toBe(0);
    expect(await db.fileEnvoi.count()).toBe(0);
  });

  it('inscrit un achat de matériel au registre, valorisé en francs', async () => {
    await enregistrerOperation(
      db,
      exerciceId,
      { date: '2026-04-01', type: 'depense', compte: dollars, nature: 'materiel', libelle: 'Congélateur', montant: 6_000, devise: 'USD', taux: 2850, piece: true },
      { designation: 'Congélateur', categorie: 'materiel', duree: 5 },
    );
    const { dossier } = await chargerDossier(db, exerciceId);
    expect(dossier.immobilisations[0]).toMatchObject({ designation: 'Congélateur', montant: 171_000, duree: 5 });
    expect(calculerEtats(dossier).compteDeResultat.F).toBe(34_200);
  });

  it("annule par contre-passation, une seule fois", async () => {
    const id = await enregistrerOperation(db, exerciceId, vente(80_000));
    await annulerOperation(db, exerciceId, id, '2026-03-05');
    const { dossier } = await chargerDossier(db, exerciceId);
    expect(dossier.operations).toHaveLength(2);
    expect(calculerEtats(dossier).compteDeResultat.recettesVentes).toBe(0);
    await expect(annulerOperation(db, exerciceId, id, '2026-03-06')).rejects.toThrow(/déjà annulée/);
  });

  it("garde l'opération intacte quand on ajoute la photo après coup", async () => {
    const id = await enregistrerOperation(db, exerciceId, { ...vente(80_000), piece: false });
    expect((await chargerDossier(db, exerciceId)).dossier.operations[0]?.piece).toBe(false);
    await ajouterPhoto(db, (await entrepriseActive(db))?.id ?? '', id, new Blob(['photo'], { type: 'image/jpeg' }));
    expect((await chargerDossier(db, exerciceId)).dossier.operations[0]?.piece).toBe(true);
    expect((await db.operations.get(id))?.piece).toBe(false);
  });
});

describe('clients et fournisseurs', () => {
  it('suit une vente à crédit payée en deux fois', async () => {
    const c = await enregistrerFacture(db, exerciceId, 'creance', { date: '2026-03-01', facture: 'V-1', nom: 'Restaurant (fictif)', nature: 'ventes', montant: 300_000, devise: 'CDF', taux: null });
    await enregistrerReglement(db, exerciceId, 'creance', c, { date: '2026-03-10', compte: caisse, montant: 100_000 });
    await enregistrerReglement(db, exerciceId, 'creance', c, { date: '2026-04-10', compte: banque });
    const e = calculerEtats((await chargerDossier(db, exerciceId)).dossier);
    expect(e.compteDeResultat.recettesVentes).toBe(300_000);
    expect(e.bilan.actif.creances).toBe(0);
    await expect(enregistrerReglement(db, exerciceId, 'creance', c, { date: '2026-05-10', compte: caisse, montant: 1 })).rejects.toThrow(/reste dû \(0\)/);
  });

  it("refuse le matériel acheté à crédit", async () => {
    await expect(
      enregistrerFacture(db, exerciceId, 'dette', { date: '2026-03-01', facture: 'F-1', nom: 'Fournisseur (fictif)', nature: 'materiel', montant: 300_000, devise: 'CDF', taux: null }),
    ).rejects.toThrow(/matériel acheté à crédit/);
  });
});

describe('matériel et inventaire', () => {
  it('vend un bien du registre et passe la valeur nette dans F', async () => {
    await enregistrerOperation(
      db,
      exerciceId,
      { date: '2026-02-01', type: 'depense', compte: banque, nature: 'materiel', libelle: 'Moto', montant: 1_000_000, devise: 'CDF', taux: null, piece: true },
      { designation: 'Moto', categorie: 'materiel', duree: 4 },
    );
    const immo = (await db.immobilisations.toArray())[0];
    await sortirImmobilisation(db, exerciceId, immo?.id ?? '', { date: '2026-10-01', prix: 900_000, compte: caisse, libelle: 'Vente de la moto' });
    const e = calculerEtats((await chargerDossier(db, exerciceId)).dossier);
    expect(e.compteDeResultat.details).toMatchObject({ cessions: 900_000, valeurNetteSorties: 1_000_000 });
    expect(e.bilan.equilibre).toBe(true);
  });

  it("fait du total de l'inventaire validé le stock final", async () => {
    await enregistrerInventaire(db, exerciceId, [
      { reference: 'R1', designation: 'Sacs de riz 25 kg', quantite: 10, prixUnitaire: 45_000, montant: 450_000 },
      { reference: 'H1', designation: "Bidons d'huile 5 L", quantite: 8, prixUnitaire: 25_000, montant: 200_000 },
    ]);
    expect(await validerInventaire(db, exerciceId)).toBe(650_000);
    const e = calculerEtats((await chargerDossier(db, exerciceId)).dossier);
    expect(e.notes.note2).toMatchObject({ stockFinal: 650_000, inventaireFait: true });
    expect(e.notes.note2.lignes).toHaveLength(2);
    await expect(enregistrerInventaire(db, exerciceId, [])).rejects.toThrow(/déjà validé/);
  });
});

describe('démonstration', () => {
  it('se charge, se recharge sans doublon, et se retire', async () => {
    await chargerDemo(db, '2027-05-20');
    await chargerDemo(db, '2027-05-20');
    const demos = (await db.entreprises.toArray()).filter((e) => e.demo);
    expect(demos).toHaveLength(1);
    const active = await entrepriseActive(db);
    expect(active?.demo).toBe(true);
    const ex = await exerciceCourant(db, active?.id ?? '', 2027);
    const { dossier } = await chargerDossier(db, ex?.id ?? '');
    expect(valider(dossier)).toEqual([]);
    expect(calculerEtats(dossier, { auDate: '2027-05-20' }).bilan.equilibre).toBe(true);
    await retirerEntreprise(db, active?.id ?? '');
    expect(await db.operations.where('entrepriseId').equals(active?.id ?? '').count()).toBe(0);
    expect(await entrepriseActive(db)).toBeUndefined();
  });

  it("n'efface jamais une entreprise réelle", async () => {
    const e = await entrepriseActive(db);
    await expect(retirerEntreprise(db, e?.id ?? '')).rejects.toThrow(/ne s'effacent pas/);
  });
});

describe("code d'accès", () => {
  it('se définit, se vérifie et se retire', async () => {
    expect(await codeDefini(db)).toBe(false);
    await definirCode(db, '2468');
    expect(await verifierCode(db, '2468')).toBe(true);
    expect(await verifierCode(db, '1357')).toBe(false);
    await definirCode(db, null);
    expect(await codeDefini(db)).toBe(false);
    await expect(definirCode(db, '12a4')).rejects.toThrow(/quatre chiffres/);
  });
});

describe('créance perdue (AUDCIF, art. 43 et 46)', () => {
  it("sort l'encours du bilan, garde la facture, et refuse une seconde déclaration", async () => {
    const { BaseMbongo } = await import('../../src/donnees/base');
    const { creerEntreprise } = await import('../../src/donnees/entreprise');
    const { chargerDossier } = await import('../../src/donnees/dossier');
    const { declarerCreancePerdue, enregistrerFacture } = await import('../../src/donnees/saisie');
    const { calculerEtats } = await import('../../src/moteur');
    const db = new BaseMbongo(`perdue-${Math.random()}`);
    const r = await creerEntreprise(db, {
      nom: 'Boutique (fictif)', activite: '', secteur: 'negoce', commune: '', nif: '', responsable: '', telephone: '', annee: 2026,
      comptes: [{ type: 'caisse', libelle: 'Caisse', devise: 'CDF', solde: 0 }], stockInitial: 0, tauxOuverture: null,
    });
    const f = await enregistrerFacture(db, r.exerciceId, 'creance', { date: '2026-02-01', facture: 'V-9', nom: 'Client parti (fictif)', nature: 'ventes', montant: 200_000, devise: 'CDF', taux: null });
    await declarerCreancePerdue(db, r.exerciceId, f, '2026-10-01');
    const { dossier } = await chargerDossier(db, r.exerciceId);
    expect(dossier.creances).toHaveLength(1);
    expect(dossier.creances[0]!.perdueLe).toBe('2026-10-01');
    const e = calculerEtats(dossier, { auDate: '2026-12-31' });
    expect(e.bilan.actif.creances).toBe(0);
    expect(e.bilan.equilibre).toBe(true);
    await expect(declarerCreancePerdue(db, r.exerciceId, f, '2026-11-01')).rejects.toThrow('déjà déclarée perdue');
  });
});

describe('reconnaissance de dette (AUDCG, art. 22 et 23)', () => {
  it('fait repartir le délai du jour de la signature, pour la même durée, sans toucher aux montants', async () => {
    const { BaseMbongo } = await import('../../src/donnees/base');
    const { creerEntreprise } = await import('../../src/donnees/entreprise');
    const { chargerDossier } = await import('../../src/donnees/dossier');
    const { enregistrerFacture, noterReconnaissance } = await import('../../src/donnees/saisie');
    const { calculerEtats, prescription } = await import('../../src/moteur');
    const db = new BaseMbongo(`reconnue-${Math.random()}`);
    const r = await creerEntreprise(db, {
      nom: 'Boutique (fictif)', activite: '', secteur: 'negoce', commune: '', nif: '', responsable: '', telephone: '', annee: 2026,
      comptes: [{ type: 'caisse', libelle: 'Caisse', devise: 'CDF', solde: 0 }], stockInitial: 0, tauxOuverture: null,
    });
    const f = await enregistrerFacture(db, r.exerciceId, 'creance', { date: '2026-02-01', facture: 'V-10', nom: 'Voisine (fictif)', nature: 'ventes', montant: 150_000, devise: 'CDF', taux: null, client: 'particulier' });
    await expect(noterReconnaissance(db, r.exerciceId, f, '2026-11-15', '2026-10-30')).rejects.toThrow('futur');
    await expect(noterReconnaissance(db, r.exerciceId, f, '2026-01-15', '2026-10-30')).rejects.toThrow('précéder');
    await noterReconnaissance(db, r.exerciceId, f, '2026-06-10', '2026-10-30');
    await noterReconnaissance(db, r.exerciceId, f, '2026-09-20', '2026-10-30');
    const { dossier } = await chargerDossier(db, r.exerciceId);
    expect(dossier.creances).toHaveLength(1);
    expect(dossier.creances[0]!.reconnueLe).toBe('2026-09-20');
    expect(prescription(dossier.creances[0]!, 'negoce')).toBe('2027-09-20');
    const e = calculerEtats(dossier, { auDate: '2026-12-31' });
    expect(e.bilan.actif.creances).toBe(150_000);
    expect(e.bilan.equilibre).toBe(true);
  });
});
