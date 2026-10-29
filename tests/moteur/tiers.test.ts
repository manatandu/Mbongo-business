import { describe, expect, it } from 'vitest';
import { calculerEtats, encaisser, regler, situationTiers, valider, type PieceTiers } from '../../src/moteur';
import { dossierDeBase } from './outils';

const facture = (p: Partial<PieceTiers>): PieceTiers => ({
  id: 'f',
  date: '2026-03-01',
  facture: 'V-001',
  nom: 'Client de test',
  nature: 'ventes',
  montant: 500_000,
  devise: 'CDF',
  taux: null,
  ...p,
});

describe("encaissement d'une créance", () => {
  const creanceN1 = facture({ id: 'c1', date: '2025-12-15', facture: 'V-090', nom: 'Restaurant Chez Tantine' });

  it("produit la recette de trésorerie, de la nature de la facture, sur le compte choisi", () => {
    const d = dossierDeBase({ creances: [creanceN1] });
    const o = encaisser(d, 'c1', { id: 'enc', date: '2026-01-20', compte: 'caisse' });
    expect(o).toMatchObject({
      type: 'recette',
      nature: 'ventes',
      compte: 'caisse',
      montant: 500_000,
      reglementDe: { genre: 'creance', ligne: 'c1' },
      libelle: 'Encaissement facture V-090, Restaurant Chez Tantine',
    });
  });

  it('fait entrer la vente en caisse et sortir la créance, sans changer le résultat', () => {
    const avant = dossierDeBase({ creances: [creanceN1] });
    const apres = { ...avant, operations: [encaisser(avant, 'c1', { id: 'enc', date: '2026-01-20', compte: 'caisse' })] };
    const e0 = calculerEtats(avant);
    const e1 = calculerEtats(apres);
    expect(e1.compteDeResultat.recettesVentes).toBe(e0.compteDeResultat.recettesVentes + 500_000);
    expect(e1.bilan.actif.caisse).toBe(e0.bilan.actif.caisse + 500_000);
    expect(e1.bilan.actif.creances).toBe(0);
    expect(e1.compteDeResultat.variationCreances).toBe(500_000);
    // La vente a eu lieu en 2025 : l'encaissement de 2026 ne fait pas de bénéfice en 2026.
    expect(e1.compteDeResultat.G).toBe(e0.compteDeResultat.G);
    expect(e1.bilan.equilibre).toBe(true);
  });

  it('accepte un paiement en plusieurs fois (D4) et refuse de dépasser le reste dû', () => {
    let d = dossierDeBase({ creances: [facture({ id: 'c2', date: '2026-03-01', montant: 300_000 })] });
    d = { ...d, operations: [encaisser(d, 'c2', { id: 'p1', date: '2026-03-10', compte: 'caisse', montant: 100_000 })] };
    d = { ...d, operations: [...d.operations, encaisser(d, 'c2', { id: 'p2', date: '2026-04-02', compte: 'banque', montant: 120_000 })] };
    const s = situationTiers(d, 'creance', '2026-04-30')[0];
    expect(s).toMatchObject({ regle: 220_000, encours: 80_000, soldee: false });
    expect(() => encaisser(d, 'c2', { id: 'p3', date: '2026-05-01', compte: 'caisse', montant: 100_000 })).toThrow(/reste dû \(80000\)/);
    expect(calculerEtats(d).bilan.actif.creances).toBe(80_000);
  });

  it("calcule l'encours à la date demandée, pas au jour du calcul", () => {
    let d = dossierDeBase({ creances: [facture({ id: 'c3', date: '2026-02-01' })] });
    d = { ...d, operations: [encaisser(d, 'c3', { id: 'p', date: '2026-06-15', compte: 'caisse' })] };
    expect(situationTiers(d, 'creance', '2026-05-31')[0]?.encours).toBe(500_000);
    expect(situationTiers(d, 'creance', '2026-06-15')[0]?.encours).toBe(0);
    expect(situationTiers(d, 'creance', '2026-01-31')).toEqual([]);
  });

  it("refuse un encaissement sur un compte d'une autre devise", () => {
    const d = dossierDeBase({
      comptes: [...dossierDeBase().comptes, { id: 'caisse_usd', type: 'caisse', libelle: 'Caisse dollars', devise: 'USD' }],
      creances: [facture({ id: 'c4' })],
    });
    expect(() => encaisser(d, 'c4', { id: 'x', date: '2026-04-01', compte: 'caisse_usd', taux: 2800 })).toThrow(/en CDF/);
  });
});

describe("règlement d'une dette", () => {
  it("ne change pas le résultat selon qu'on paie avant ou après la clôture", () => {
    const dette = facture({ id: 'd1', date: '2026-02-10', facture: 'F-12', nom: 'Ets Mukoko', nature: 'achats_marchandises', montant: 400_000 });
    const nonPayee = dossierDeBase({ dettes: [dette] });
    const payee = { ...nonPayee, operations: [regler(nonPayee, 'd1', { id: 'r', date: '2026-03-01', compte: 'caisse' })] };
    const e0 = calculerEtats(nonPayee);
    const e1 = calculerEtats(payee);
    expect(e0.compteDeResultat.E).toBe(-400_000);
    expect(e1.compteDeResultat.achats).toBe(400_000);
    expect(e1.compteDeResultat.E).toBe(0);
    expect(e1.compteDeResultat.G).toBe(e0.compteDeResultat.G);
    expect(e0.bilan.passif.dettes).toBe(400_000);
    expect(e1.bilan.passif.dettes).toBe(0);
    expect(e0.bilan.equilibre && e1.bilan.equilibre).toBe(true);
  });

  it('refuse le matériel acheté à crédit (D10)', () => {
    const d = dossierDeBase({ dettes: [facture({ id: 'd2', nature: 'materiel' })] });
    expect(valider(d).join(' ')).toMatch(/matériel acheté à crédit n'est pas pris en charge/);
  });
});
