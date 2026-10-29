import { describe, expect, it } from 'vitest';
import { calculerEtats, ErreurDossier } from '../../src/moteur';
import { dossierDeBase, op } from './outils';

describe('compte de résultat et bilan', () => {
  it('appliquent G = C − D + E − F sur un cas calculé à la main', () => {
    const d = dossierDeBase({
      stockInitial: 1_000_000,
      stockFinal: 1_300_000,
      operations: [
        op({ type: 'recette', nature: 'ventes', montant: 5_000_000 }),
        op({ type: 'recette', nature: 'autres_recettes', montant: 200_000 }),
        op({ type: 'depense', nature: 'achats_marchandises', montant: 3_000_000 }),
        op({ type: 'depense', nature: 'loyers', compte: 'banque', montant: 600_000 }),
        op({ type: 'depense', nature: 'salaires', montant: 400_000 }),
        op({ type: 'depense', nature: 'impots_taxes', montant: 100_000 }),
      ],
      creances: [{ id: 'c', date: '2026-11-02', facture: 'V-9', nom: 'Client (fictif)', nature: 'ventes', montant: 250_000, devise: 'CDF', taux: null }],
      dettes: [{ id: 'd', date: '2026-12-01', facture: 'F-3', nom: 'Fournisseur (fictif)', nature: 'achats_marchandises', montant: 150_000, devise: 'CDF', taux: null }],
    });
    const cr = calculerEtats(d).compteDeResultat;
    expect(cr.A).toBe(5_200_000);
    expect(cr.B).toBe(4_100_000);
    expect(cr.C).toBe(1_100_000);
    expect(cr.D).toBe(-300_000 - 250_000);
    expect(cr.E).toBe(-150_000);
    expect(cr.F).toBe(0);
    // 1 100 000 + 550 000 − 150 000
    expect(cr.G).toBe(1_500_000);
  });

  it("n'inscrit ni apports ni prélèvements au résultat", () => {
    const d = dossierDeBase({
      operations: [op({ type: 'recette', nature: 'apport', montant: 800_000 }), op({ type: 'depense', nature: 'prelevement', montant: 300_000 })],
    });
    const e = calculerEtats(d);
    expect(e.compteDeResultat.G).toBe(0);
    expect(e.bilan.compteExploitant).toEqual({ ouverture: 3_500_000, apports: 800_000, prelevements: 300_000 });
    expect(e.bilan.passif.compteExploitant).toBe(4_000_000);
    expect(e.bilan.equilibre).toBe(true);
  });
});

describe('emprunts (D2)', () => {
  const d = dossierDeBase({
    operations: [
      op({ date: '2026-02-01', compte: 'banque', type: 'recette', nature: 'emprunt_recu', montant: 5_000_000, libelle: 'Crédit de la coopérative (fictif)' }),
      op({ date: '2026-08-01', compte: 'banque', type: 'depense', nature: 'remboursement_emprunt', montant: 1_000_000 }),
      op({ date: '2026-08-01', compte: 'banque', type: 'depense', nature: 'interets', montant: 150_000 }),
    ],
  });
  const e = calculerEtats(d);

  it("ne compte ni l'emprunt reçu en recette ni le capital remboursé en charge", () => {
    expect(e.compteDeResultat.A).toBe(0);
    expect(e.compteDeResultat.B).toBe(150_000);
  });

  it("met les intérêts en charges d'intérêts", () => {
    expect(e.compteDeResultat.interets).toBe(150_000);
    expect(e.compteDeResultat.G).toBe(-150_000);
  });

  it('présente le capital restant dû sur la ligne Emprunt', () => {
    expect(e.bilan.passif.emprunt).toBe(4_000_000);
    expect(e.bilan.equilibre).toBe(true);
  });

  it("déduit l'emprunt d'ouverture du compte exploitant d'ouverture", () => {
    const e2 = calculerEtats(dossierDeBase({ empruntOuverture: 1_200_000 }));
    expect(e2.bilan.compteExploitant.ouverture).toBe(3_500_000 - 1_200_000);
    expect(e2.bilan.equilibre).toBe(true);
  });
});

describe('tontine (D9)', () => {
  it('reste hors résultat et figure sur la ligne Banque', () => {
    const d = dossierDeBase({
      comptes: [...dossierDeBase().comptes, { id: 'likelemba', type: 'tontine', libelle: 'Likelemba du marché', devise: 'CDF' }],
      operations: [
        op({ date: '2026-03-01', type: 'transfert', nature: 'transfert', compteDestination: 'likelemba', montant: 100_000 }),
        op({ date: '2026-04-01', type: 'transfert', nature: 'transfert', compteDestination: 'likelemba', montant: 100_000 }),
      ],
    });
    const e = calculerEtats(d);
    expect(e.compteDeResultat.G).toBe(0);
    expect(e.bilan.actif.banque).toBe(2_200_000);
    expect(e.bilan.actif.caisse).toBe(800_000);
  });
});

describe('situation en cours d’exercice', () => {
  const d = dossierDeBase({
    stockFinal: null,
    operations: [op({ date: '2026-02-10', type: 'recette', nature: 'ventes', montant: 100_000 }), op({ date: '2026-09-10', type: 'recette', nature: 'ventes', montant: 400_000 })],
  });

  it('ne prend que les opérations faites à la date demandée', () => {
    const e = calculerEtats(d, { auDate: '2026-06-30' });
    expect(e.auDate).toBe('2026-06-30');
    expect(e.compteDeResultat.recettesVentes).toBe(100_000);
    expect(e.provisoire).toBe(true);
    expect(e.bilan.equilibre).toBe(true);
  });

  it("reste provisoire sans inventaire de fin d'exercice", () => {
    const e = calculerEtats(d);
    expect(e.provisoire).toBe(true);
    expect(e.notes.note2.inventaireFait).toBe(false);
    expect(e.compteDeResultat.variationStocks).toBe(0);
  });

  it("refuse une date hors de l'exercice", () => {
    expect(() => calculerEtats(d, { auDate: '2027-01-01' })).toThrow(ErreurDossier);
  });
});

describe('garde-fous', () => {
  it('refuse de calculer sur un dossier incohérent', () => {
    const d = dossierDeBase({ operations: [op({ date: '2026-02-30', type: 'recette', nature: 'ventes', montant: 1 })] });
    expect(() => calculerEtats(d)).toThrow(/date hors de l'exercice/);
  });

  it('refuse un montant à virgule', () => {
    const d = dossierDeBase({ operations: [op({ type: 'recette', nature: 'ventes', montant: 10.5 })] });
    expect(() => calculerEtats(d)).toThrow(/montant entier/);
  });

  it("refuse une nature qui ne correspond pas au type d'opération", () => {
    const d = dossierDeBase({ operations: [op({ type: 'recette', nature: 'loyers', montant: 1_000 })] });
    expect(() => calculerEtats(d)).toThrow(/ne convient pas à une recette/);
  });
});

describe('emprunt : capital restant dû', () => {
  it('refuse un remboursement supérieur au capital restant dû', () => {
    const d = dossierDeBase({
      empruntOuverture: 500_000,
      operations: [op({ compte: 'banque', type: 'depense', nature: 'remboursement_emprunt', montant: 600_000 })],
    });
    expect(() => calculerEtats(d)).toThrow(/remboursement supérieur au capital restant dû/);
  });
});
