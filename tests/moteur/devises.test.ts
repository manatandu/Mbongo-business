import { describe, expect, it } from 'vitest';
import { appliquerTaux, calculerEtats, centimesEnFrancs, journalMensuel, soldesTresorerie, valider, type CompteTresorerie } from '../../src/moteur';
import { dossierDeBase, op } from './outils';

const CAISSE_USD: CompteTresorerie = { id: 'caisse_usd', type: 'caisse', libelle: 'Caisse dollars', devise: 'USD' };
const comptes = [...dossierDeBase().comptes, CAISSE_USD];

describe('conversion', () => {
  it('arrondit au franc le plus proche, en calcul exact', () => {
    // 123,45 $ × 2 843,65 = 351 048,5925 FC
    expect(centimesEnFrancs(12_345, 2843.65)).toBe(351_049);
    // 0,01 $ × 2 850 = 28,5 FC : la moitié s'arrondit vers le haut
    expect(centimesEnFrancs(1, 2850)).toBe(29);
    expect(appliquerTaux(-1, 2850, 100)).toBe(-29);
    // 90 000 $ × 2 850,1234 : pas de dérive de flottant
    expect(centimesEnFrancs(9_000_000, 2850.1234)).toBe(256_511_106);
  });
});

describe('opération en dollars', () => {
  const vente = op({ id: 'v1', date: '2026-03-02', compte: 'caisse_usd', type: 'recette', nature: 'ventes', montant: 20_000, devise: 'USD', taux: 2800, libelle: 'Vente en gros, payée en dollars' });

  it('se tient en dollars dans le journal du compte, et compte en francs dans les états', () => {
    const d = dossierDeBase({ comptes, operations: [vente], tauxCloture: 2800 });
    const j = journalMensuel(d, 'caisse_usd', '2026-03');
    expect(j.devise).toBe('USD');
    expect(j.lignes[0]).toMatchObject({ recette: 20_000, solde: 20_000 });
    const e = calculerEtats(d);
    expect(e.compteDeResultat.recettesVentes).toBe(560_000);
    expect(e.bilan.actif.caisse).toBe(1_000_000 + 560_000);
    expect(e.ecartChange).toBe(0);
    expect(e.bilan.equilibre).toBe(true);
  });

  it('garde le taux de chaque opération : un nouveau taux ne réécrit pas le passé', () => {
    const v2 = op({ id: 'v2', date: '2026-04-02', compte: 'caisse_usd', type: 'recette', nature: 'ventes', montant: 10_000, devise: 'USD', taux: 2900 });
    const e = calculerEtats(dossierDeBase({ comptes, operations: [vente, v2] }), { auDate: '2026-06-30' });
    expect(e.compteDeResultat.recettesVentes).toBe(560_000 + 290_000);
  });

  it('refuse une opération en dollars sans taux', () => {
    const d = dossierDeBase({ comptes, operations: [{ ...vente, taux: null }] });
    expect(valider(d).join(' ')).toMatch(/en dollars : taux manquant/);
  });

  it("refuse une opération dont la devise n'est pas celle du compte", () => {
    const d = dossierDeBase({ comptes, operations: [{ ...vente, compte: 'caisse' }] });
    expect(valider(d).join(' ')).toMatch(/devise doit être celle du compte/);
  });
});

describe('change de dollars chez le cambiste', () => {
  // 500 $ en caisse à l'ouverture, valorisés à 2 800 ; on en change 100.
  const dossierChange = (recu: number) =>
    dossierDeBase({
      comptes,
      soldesOuverture: { caisse: 1_000_000, banque: 2_000_000, caisse_usd: 50_000 },
      tauxOuverture: 2800,
      tauxCloture: 2800,
      operations: [
        op({ id: 'ch', date: '2026-03-05', type: 'transfert', nature: 'transfert', compte: 'caisse_usd', compteDestination: 'caisse', devise: 'USD', montant: 10_000, montantDestination: recu, libelle: 'Change de 100 $' }),
      ],
    });

  it('est un transfert avec les deux montants réels, sans effet sur le résultat au taux du jour', () => {
    const d = dossierChange(280_000);
    const s = Object.fromEntries(soldesTresorerie(d).map((x) => [x.compte.id, x.natif]));
    expect(s).toMatchObject({ caisse: 1_280_000, caisse_usd: 40_000 });
    const e = calculerEtats(d);
    expect(e.compteDeResultat.A).toBe(0);
    expect(e.compteDeResultat.B).toBe(0);
    expect(e.bilan.equilibre).toBe(true);
  });

  it('ne laisse aucune valeur en francs dans une caisse en dollars vidée', () => {
    // Cas trouvé par le test de propriété : 500 $ valorisés 1 400 000 FC, tout changé à 2 850.
    const d = dossierDeBase({
      comptes,
      soldesOuverture: { caisse: 1_000_000, banque: 2_000_000, caisse_usd: 50_000 },
      tauxOuverture: 2800,
      operations: [
        op({ date: '2026-03-05', type: 'transfert', nature: 'transfert', compte: 'caisse_usd', compteDestination: 'caisse', devise: 'USD', montant: 50_000, montantDestination: 1_425_000 }),
      ],
    });
    const e = calculerEtats(d, { auDate: '2026-06-30' });
    expect(e.bilan.actif.caisse).toBe(1_000_000 + 1_425_000);
    expect(e.compteDeResultat.details.gainChange).toBe(25_000);
    expect(e.bilan.equilibre).toBe(true);
  });

  it('fait apparaître à la clôture le gain obtenu chez le cambiste', () => {
    const e = calculerEtats(dossierChange(285_000));
    expect(e.compteDeResultat.details.gainChange).toBe(5_000);
    expect(e.compteDeResultat.G).toBe(5_000);
    expect(e.bilan.equilibre).toBe(true);
  });

  it('exige le montant reçu quand les devises diffèrent', () => {
    const change = op({ type: 'transfert', nature: 'transfert', compte: 'caisse_usd', compteDestination: 'caisse', devise: 'USD', montant: 10_000 });
    expect(valider(dossierDeBase({ comptes, operations: [change] })).join(' ')).toMatch(/montant reçu requis/);
  });
});

describe('réévaluation des dollars à la clôture (D3)', () => {
  const vente = op({ id: 'v', date: '2026-02-01', compte: 'caisse_usd', type: 'recette', nature: 'ventes', montant: 10_000, devise: 'USD', taux: 2800 });

  it('porte un gain de change en autres recettes', () => {
    const e = calculerEtats(dossierDeBase({ comptes, operations: [vente], tauxCloture: 2900 }));
    expect(e.ecartChange).toBe(10_000);
    expect(e.compteDeResultat.details.gainChange).toBe(10_000);
    expect(e.compteDeResultat.autresRecettes).toBe(10_000);
    expect(e.bilan.actif.caisse).toBe(1_000_000 + 290_000);
    expect(e.bilan.equilibre).toBe(true);
  });

  it('porte une perte de change en autres dépenses', () => {
    const e = calculerEtats(dossierDeBase({ comptes, operations: [vente], tauxCloture: 2700 }));
    expect(e.compteDeResultat.details.perteChange).toBe(10_000);
    expect(e.compteDeResultat.autresDepenses).toBe(10_000);
    expect(e.compteDeResultat.G).toBe(280_000 - 10_000);
    expect(e.bilan.equilibre).toBe(true);
  });

  it('présente une créance en dollars au taux de clôture', () => {
    const d = dossierDeBase({
      comptes,
      creances: [{ id: 'c', date: '2026-09-01', facture: 'V-1', nom: 'Grossiste de Gombe', nature: 'ventes', montant: 50_000, devise: 'USD', taux: 2800 }],
      tauxCloture: 2900,
    });
    const e = calculerEtats(d);
    expect(e.bilan.actif.creances).toBe(1_450_000);
    expect(e.compteDeResultat.variationCreances).toBe(-1_450_000);
    expect(e.bilan.equilibre).toBe(true);
  });

  it('marque les états provisoires tant que le taux de clôture manque', () => {
    expect(calculerEtats(dossierDeBase({ comptes, operations: [vente] })).provisoire).toBe(true);
    expect(calculerEtats(dossierDeBase({ comptes, operations: [vente], tauxCloture: 2800 })).provisoire).toBe(false);
  });
});
