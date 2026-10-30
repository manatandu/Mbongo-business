import { describe, expect, it } from 'vitest';
import { calculerEtats, cumulAmortissements, dotationAnnuelle, tableauAmortissement, valider, type Immobilisation } from '../../src/moteur';
import { dossierDeBase, op } from './outils';

const immo = (p: Partial<Immobilisation>): Immobilisation => ({
  id: 'i',
  date: '2020-01-01',
  designation: 'Bien de test',
  categorie: 'materiel',
  montant: 1_000_000,
  duree: 5,
  ...p,
});

describe('amortissement linéaire sans prorata temporis', () => {
  it("donne une annuité entière même pour un achat le 28 décembre", () => {
    const achat = op({ id: 'achat', date: '2026-12-28', type: 'depense', nature: 'materiel', montant: 1_200_000 });
    const d = dossierDeBase({
      operations: [achat],
      immobilisations: [immo({ id: 'frigo', date: '2026-12-28', montant: 1_200_000, duree: 4, operation: 'achat' })],
    });
    const e = calculerEtats(d);
    expect(e.compteDeResultat.F).toBe(300_000);
    expect(e.bilan.actif.immobilisations).toBe(900_000);
    // L'achat n'est pas une charge : il ne va pas dans B.
    expect(e.compteDeResultat.B).toBe(0);
    expect(e.compteDeResultat.G).toBe(-300_000);
    expect(e.bilan.equilibre).toBe(true);
  });

  it('fait porter le reste de la division sur la dernière annuité', () => {
    const i = immo({ date: '2026-05-01', montant: 1_000_000, duree: 3 });
    expect([2026, 2027, 2028, 2029].map((a) => dotationAnnuelle(i, i.montant, a))).toEqual([333_333, 333_333, 333_334, 0]);
    expect(cumulAmortissements(i, i.montant, 2030)).toBe(1_000_000);
  });

  it('donne un tableau par bien qui finit à zéro, ou à la sortie', () => {
    const i = immo({ date: '2026-05-01', montant: 1_000_000, duree: 3 });
    expect(tableauAmortissement(i, i.montant)).toEqual([
      { annee: 2026, dotation: 333_333, cumul: 333_333, valeurNette: 666_667 },
      { annee: 2027, dotation: 333_333, cumul: 666_666, valeurNette: 333_334 },
      { annee: 2028, dotation: 333_334, cumul: 1_000_000, valeurNette: 0 },
    ]);
    // Sorti en 2027 : pas de dotation l'année de la sortie (D1).
    const vendu = immo({ date: '2026-05-01', montant: 900_000, duree: 3, sortie: { date: '2027-03-01', prixCession: 500_000 } });
    expect(tableauAmortissement(vendu, vendu.montant).map((l) => [l.annee, l.dotation, l.valeurNette])).toEqual([
      [2026, 300_000, 600_000],
      [2027, 0, 600_000],
    ]);
    expect(tableauAmortissement(immo({ categorie: 'caution' }), 1_000_000)).toEqual([]);
  });

  it("n'amortit plus un bien arrivé au bout de sa durée, mais le garde au registre", () => {
    const d = dossierDeBase({ immobilisations: [immo({ id: 'vieux', date: '2020-02-01', duree: 5 })] });
    const e = calculerEtats(d);
    expect(e.compteDeResultat.F).toBe(0);
    expect(e.notes.note1.lignes).toHaveLength(1);
    expect(e.notes.note1.lignes[0]).toMatchObject({ dotation: 0, cumul: 1_000_000, valeurNette: 0 });
  });

  it("n'amortit pas une caution (D6)", () => {
    const versement = op({ id: 'caution', date: '2026-02-01', type: 'depense', nature: 'caution', montant: 900_000 });
    const d = dossierDeBase({
      operations: [versement],
      immobilisations: [immo({ id: 'c', date: '2026-02-01', categorie: 'caution', montant: 900_000, duree: 0, operation: 'caution' })],
    });
    const e = calculerEtats(d);
    expect(e.compteDeResultat.F).toBe(0);
    expect(e.bilan.actif.immobilisations).toBe(900_000);
    expect(e.compteDeResultat.G).toBe(0);
    expect(e.bilan.equilibre).toBe(true);
  });
});

describe('acquisition de matériel', () => {
  it("sort de la trésorerie, entre au registre, et ne touche le résultat que par la dotation", () => {
    const achat = op({ id: 'achat', date: '2026-04-15', compte: 'banque', type: 'depense', nature: 'materiel', montant: 2_500_000 });
    const sans = calculerEtats(dossierDeBase());
    const avec = calculerEtats(
      dossierDeBase({
        operations: [achat],
        immobilisations: [immo({ id: 'moto', date: '2026-04-15', designation: 'Moto de livraison', montant: 2_500_000, duree: 5, operation: 'achat' })],
      }),
    );
    expect(avec.bilan.actif.banque).toBe(sans.bilan.actif.banque - 2_500_000);
    expect(avec.bilan.actif.immobilisations).toBe(2_000_000);
    expect(avec.compteDeResultat.A).toBe(sans.compteDeResultat.A);
    expect(avec.compteDeResultat.B).toBe(sans.compteDeResultat.B);
    expect(avec.compteDeResultat.F).toBe(500_000);
    expect(avec.compteDeResultat.G).toBe(sans.compteDeResultat.G - 500_000);
    expect(avec.bilan.equilibre).toBe(true);
    expect(avec.notes.note1.lignes[0]).toMatchObject({ designation: 'Moto de livraison', montant: 2_500_000, dotation: 500_000 });
  });

  it("refuse un bien acquis dans l'exercice sans opération de paiement", () => {
    const d = dossierDeBase({ immobilisations: [immo({ id: 'fantome', date: '2026-03-01' })] });
    expect(valider(d).join(' ')).toMatch(/doit venir d'une opération/);
  });

  it('refuse un achat de matériel qui ne figure pas au registre', () => {
    const d = dossierDeBase({ operations: [op({ type: 'depense', nature: 'materiel', montant: 100_000 })] });
    expect(valider(d).join(' ')).toMatch(/entre au registre une fois et une seule/);
  });
});

describe('cession de matériel (D1)', () => {
  it('met le prix en autres recettes et la valeur nette du bien sorti dans F', () => {
    // Balance achetée en 2024 : 84 000 d'annuité, valeur nette au 1er janvier 2026 = 252 000.
    const vente = op({ id: 'vente', date: '2026-05-10', type: 'recette', nature: 'cession_materiel', montant: 300_000 });
    const d = dossierDeBase({
      operations: [vente],
      immobilisations: [
        immo({ id: 'balance', date: '2024-06-02', montant: 420_000, duree: 5, sortie: { date: '2026-05-10', prixCession: 300_000, operation: 'vente' } }),
      ],
    });
    const e = calculerEtats(d);
    expect(e.compteDeResultat.autresRecettes).toBe(300_000);
    expect(e.compteDeResultat.details).toMatchObject({ cessions: 300_000, valeurNetteSorties: 252_000, dotationsAmortissements: 0 });
    expect(e.compteDeResultat.F).toBe(252_000);
    expect(e.compteDeResultat.G).toBe(48_000);
    expect(e.bilan.actif.immobilisations).toBe(0);
    expect(e.bilan.equilibre).toBe(true);
    expect(e.notes.note1.lignes[0]).toMatchObject({ dateSortie: '2026-05-10', prixCession: 300_000, valeurNette: 0 });
  });

  it("traite le remboursement d'une caution sans effet sur le résultat", () => {
    const retour = op({ id: 'retour', date: '2026-07-01', type: 'recette', nature: 'cession_materiel', montant: 600_000 });
    const d = dossierDeBase({
      operations: [retour],
      immobilisations: [
        immo({ id: 'caution', date: '2024-01-10', categorie: 'caution', montant: 600_000, duree: 0, sortie: { date: '2026-07-01', prixCession: 600_000, operation: 'retour' } }),
      ],
    });
    const e = calculerEtats(d);
    expect(e.compteDeResultat.G).toBe(0);
    expect(e.bilan.equilibre).toBe(true);
  });

  it("n'annule pas une cession", () => {
    const vente = op({ id: 'v', date: '2026-05-10', type: 'recette', nature: 'cession_materiel', montant: 10_000 });
    const d = dossierDeBase({ operations: [vente, { ...vente, id: 'v-annul', annule: 'v' }] });
    expect(valider(d).join(' ')).toMatch(/cession de matériel ne s'annule pas/);
  });
});
