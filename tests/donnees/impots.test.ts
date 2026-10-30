import { describe, expect, it } from 'vitest';
import { situationImpots } from '../../src/donnees/impots';
import { dossierDeBase, op } from '../moteur/outils';

describe('Mes impôts : informer sans calculer d’impôt', () => {
  const ventes = [
    op({ date: '2026-01-15', type: 'recette', nature: 'ventes', montant: 10_000_000 }),
    op({ date: '2026-02-10', type: 'recette', nature: 'ventes', montant: 12_000_000 }),
    op({ date: '2026-03-05', type: 'recette', nature: 'ventes', montant: 8_000_000 }),
  ];

  it('range l’entreprise selon son chiffre d’affaires, mois par mois', () => {
    const d = dossierDeBase({ operations: ventes });
    const fevrier = situationImpots(d, '2026-02-28');
    expect(fevrier.ca).toBe(22_000_000);
    expect(fevrier.regime).toBe('micro');
    const mars = situationImpots(d, '2026-03-31');
    expect(mars.regime).toBe('petite');
    expect(mars.parMois).toEqual([
      { mois: '2026-01', ca: 10_000_000 },
      { mois: '2026-02', ca: 12_000_000 },
      { mois: '2026-03', ca: 8_000_000 },
    ]);
    expect(mars.seuils.find((s) => s.cle === 'micro')!.part).toBeCloseTo(1.2);
  });

  it("liste les impôts payés, sans ceux qui ont été annulés, et ne donne aucun montant d'impôt à payer", () => {
    const paye = op({ date: '2026-01-30', type: 'depense', nature: 'impots_taxes', montant: 300_000, libelle: 'IRPP 60 %' });
    const erreur = op({ date: '2026-02-02', type: 'depense', nature: 'impots_taxes', montant: 5_000, libelle: 'Erreur' });
    const annulation = { ...erreur, id: 'op-annul', annule: erreur.id };
    const s = situationImpots(dossierDeBase({ operations: [...ventes, paye, erreur, annulation] }), '2026-03-31');
    expect(s.payes.map((p) => p.libelle)).toEqual(['IRPP 60 %']);
    // Aucun montant d'impôt à payer, sous aucun nom.
    expect(Object.keys(s).filter((k) => /impot|estim|aPayer|du$/i.test(k))).toEqual([]);
  });

  it('rappelle les échéances de l’IRPP qui correspondent au régime', () => {
    const s = situationImpots(dossierDeBase({ operations: ventes }), '2026-10-30');
    expect(s.echeances.map((e) => e.cle)).toEqual(['impotPremier', 'impotSolde']);
  });
});
