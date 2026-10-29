import { describe, expect, it } from 'vitest';
import { calculerEtats, cloturer, dossierSuivant, valider } from '../../src/moteur';
import { jeuPrototype } from './jeu-prototype';

describe("clôture et passage à l'exercice suivant", () => {
  const d = jeuPrototype();
  const o = cloturer(d);

  it("reprend les soldes, le stock final et l'exercice suivant", () => {
    expect(o.exercice).toEqual({ annee: 2027, debut: '2027-01-01', fin: '2027-12-31' });
    expect(o.soldesOuverture).toEqual({ caisse: 20_430_000, mpesa: 580_000, orange: 152_000, banque: -587_500 });
    expect(o.stockInitial).toBe(7_350_000);
  });

  it('reporte seulement les factures non soldées', () => {
    expect(o.creances.map((c) => c.facture)).toEqual(['V-204', 'V-219', 'V-226']);
    expect(o.dettes.map((c) => c.facture)).toEqual(['F-5120', 'B-0877']);
  });

  it('reporte le registre du matériel avec sa valeur en francs', () => {
    expect(o.immobilisations.map((i) => [i.designation, i.montant])).toEqual([
      ['Étagères métalliques', 1_800_000],
      ['Balance électronique', 420_000],
      ['Congélateur pour les boissons', 1_852_500],
    ]);
  });

  it("ouvre N+1 sur compte exploitant N + résultat N, bilan équilibré", () => {
    const suivant = dossierSuivant(d);
    expect(valider(suivant)).toEqual([]);
    const e = calculerEtats({ ...suivant, stockFinal: suivant.stockInitial });
    expect(e.bilan.compteExploitant.ouverture).toBe(6_872_000 + 21_961_500);
    expect(e.bilan.compteExploitant.ouverture).toBe(o.compteExploitant);
    expect(e.bilan.equilibre).toBe(true);
    // 2027 : dernière annuité des étagères, puis balance et congélateur.
    expect(e.compteDeResultat.F).toBe(360_000 + 84_000 + 370_500);
  });

  it("refuse de clôturer sans inventaire", () => {
    expect(() => cloturer({ ...d, stockFinal: null })).toThrow(/inventaire/);
  });
});
