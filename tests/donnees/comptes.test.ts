import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { calculerEtats } from '../../src/moteur';
import { BaseMbongo } from '../../src/donnees/base';
import { chargerDossier } from '../../src/donnees/dossier';
import { ajouterCompte, creerEntreprise } from '../../src/donnees/entreprise';
import { enregistrerOperation } from '../../src/donnees/saisie';

let db: BaseMbongo;
let entrepriseId: string;
let exerciceId: string;

beforeEach(async () => {
  db = new BaseMbongo(`test-${Math.random()}`);
  const r = await creerEntreprise(db, {
    nom: 'Boutique de test (fictif)', activite: '', secteur: 'negoce', commune: '', nif: '', responsable: '', telephone: '', annee: 2026,
    comptes: [{ type: 'caisse', libelle: 'Caisse', devise: 'CDF', solde: 500_000 }],
    stockInitial: 0, tauxOuverture: null,
  });
  entrepriseId = r.entrepriseId;
  exerciceId = r.exerciceId;
});

describe('plusieurs comptes', () => {
  it('ajoute deux banques, deux mobiles money et une seconde caisse, et le bilan reste équilibré', async () => {
    const rawbank = await ajouterCompte(db, entrepriseId, exerciceId, { type: 'banque', libelle: 'Rawbank', devise: 'CDF', solde: 1_200_000 });
    await ajouterCompte(db, entrepriseId, exerciceId, { type: 'banque', libelle: 'Equity BCDC', devise: 'CDF', solde: 0 });
    await ajouterCompte(db, entrepriseId, exerciceId, { type: 'mobile', libelle: 'M-Pesa', devise: 'CDF', solde: 80_000 });
    await ajouterCompte(db, entrepriseId, exerciceId, { type: 'mobile', libelle: 'Orange Money', devise: 'CDF', solde: 0 });
    const caisse2 = await ajouterCompte(db, entrepriseId, exerciceId, { type: 'caisse', libelle: 'Caisse du dépôt', devise: 'CDF', solde: 0 });
    await enregistrerOperation(db, exerciceId, {
      date: '2026-03-02', type: 'transfert', compte: rawbank, compteDestination: caisse2, nature: 'transfert', libelle: 'Retrait', montant: 200_000, devise: 'CDF', taux: null, piece: true,
    });

    const { dossier: d } = await chargerDossier(db, exerciceId);
    expect(d.comptes.map((c) => c.libelle)).toEqual(['Caisse', 'Rawbank', 'Equity BCDC', 'M-Pesa', 'Orange Money', 'Caisse du dépôt']);
    const e = calculerEtats(d);
    expect(e.bilan.equilibre).toBe(true);
    expect(e.bilan.compteExploitant.ouverture).toBe(500_000 + 1_200_000 + 80_000);
    // Caisse 500 000 + 200 000 retirés ; banques 1 200 000 − 200 000 + mobiles 80 000.
    expect(e.bilan.actif.caisse).toBe(700_000);
    expect(e.bilan.actif.banque).toBe(1_080_000);
  });

  it('refuse un doublon et un compte sans nom', async () => {
    await expect(ajouterCompte(db, entrepriseId, exerciceId, { type: 'caisse', libelle: ' caisse ', devise: 'CDF', solde: 0 })).rejects.toThrow('existe déjà');
    await expect(ajouterCompte(db, entrepriseId, exerciceId, { type: 'banque', libelle: '  ', devise: 'CDF', solde: 0 })).rejects.toThrow('nom');
    // Même nom, autre devise : c'est un autre compte (D3, un compte par devise).
    await expect(ajouterCompte(db, entrepriseId, exerciceId, { type: 'caisse', libelle: 'Caisse', devise: 'USD', solde: 0 })).resolves.toBeTruthy();
  });

  it("n'accepte un solde d'ouverture que pour le premier exercice", async () => {
    await db.exercices.add({ ...(await db.exercices.get(exerciceId))!, id: 'suivant', annee: 2027, debut: '2027-01-01', fin: '2027-12-31' });
    await expect(ajouterCompte(db, entrepriseId, 'suivant', { type: 'banque', libelle: 'TMB', devise: 'CDF', solde: 100 })).rejects.toThrow('transfert');
    await expect(ajouterCompte(db, entrepriseId, 'suivant', { type: 'banque', libelle: 'TMB', devise: 'CDF', solde: 0 })).resolves.toBeTruthy();
  });
});
