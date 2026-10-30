import { describe, expect, it } from 'vitest';
import { chiffreAffairesRealise, regimeFiscal } from '../../src/donnees/regimes';

const M = 1_000_000;
const ans = (...cas: number[]) => cas.map((ca, i) => ({ annee: 2024 + i, ca: ca * M }));

describe('régime IRPP : loi n° 23/053, art. 107, 109, 112 et 113', () => {
  it('range une première année selon son seul chiffre, et le signale', () => {
    expect(regimeFiscal(ans(20))).toMatchObject({ regime: 'micro', sansHistorique: true });
    expect(regimeFiscal(ans(25))).toMatchObject({ regime: 'micro' }); // « ne dépasse pas 25 M » : 25 M pile reste micro
    expect(regimeFiscal(ans(26))).toMatchObject({ regime: 'petite' });
    expect(regimeFiscal(ans(301))).toMatchObject({ regime: 'reel' });
  });

  it('monte tout de suite quand le chiffre dépasse la limite (art. 113, al. 2)', () => {
    expect(regimeFiscal(ans(10, 30))).toMatchObject({ regime: 'petite', maintenu: false });
    // Même en cours d'année : le dépassement suffit.
    expect(regimeFiscal([{ annee: 2025, ca: 10 * M }, { annee: 2026, ca: 26 * M, enCours: true }]).regime).toBe('petite');
  });

  it('ne redescend qu’après deux exercices terminés de suite sous la limite (art. 113, al. 1)', () => {
    // 2024 petite, 2025 sous 25 M : le régime reste petite en 2025.
    expect(regimeFiscal(ans(40, 20))).toMatchObject({ regime: 'petite', maintenu: true });
    // 2025 et 2026 sous 25 M, 2026 encore en cours : toujours petite (lecture prudente).
    expect(regimeFiscal([...ans(40, 20), { annee: 2026, ca: 15 * M, enCours: true }])).toMatchObject({ regime: 'petite', maintenu: true });
    // 2025 et 2026 terminés sous 25 M : micro à partir de 2027.
    expect(regimeFiscal([...ans(40, 20, 15), { annee: 2027, ca: 5 * M, enCours: true }])).toMatchObject({ regime: 'micro', maintenu: false });
    // Une année sous la limite puis une au-dessus : pas de descente.
    expect(regimeFiscal(ans(40, 20, 30, 20)).regime).toBe('petite');
  });

  it('descend d’un seul cran à la fois', () => {
    expect(regimeFiscal(ans(400, 10, 10, 10)).regime).toBe('petite');
  });
});

describe('TVA : OL n° 10/001, art. 14', () => {
  it('assujetti dès 80 M CDF, et la qualité est gardée deux ans après la baisse', () => {
    expect(regimeFiscal(ans(80)).tva).toBe('depasse');
    expect(regimeFiscal(ans(79)).tva).toBe('non');
    expect(regimeFiscal(ans(90, 50)).tva).toBe('gardee');
    // Baisse constatée en 2025 : qualité gardée en 2026 et 2027, plus en 2028.
    expect(regimeFiscal(ans(90, 50, 50)).tva).toBe('gardee');
    expect(regimeFiscal(ans(90, 50, 50, 50)).tva).toBe('gardee');
    expect(regimeFiscal(ans(90, 50, 50, 50, 50)).tva).toBe('non');
  });
});

describe('chiffre d’affaires réalisé', () => {
  it('compte les ventes au comptant et à crédit, sans recompter les encaissements, ventes annulées déduites', () => {
    const ops = [
      { id: 'a', date: '2025-03-01', nature: 'ventes', montant: 100, devise: 'CDF' as const, taux: null },
      { id: 'b', date: '2025-04-01', nature: 'ventes', montant: 50, devise: 'CDF' as const, taux: null, reglementDe: { genre: 'creance', ligne: 'f' } },
      { id: 'c', date: '2025-05-01', nature: 'ventes', montant: 30, devise: 'CDF' as const, taux: null },
      { id: 'd', date: '2025-05-02', nature: 'ventes', montant: 30, devise: 'CDF' as const, taux: null, annule: 'c' },
      { id: 'e', date: '2025-06-01', nature: 'ventes', montant: 1000, devise: 'USD' as const, taux: 2800 },
      { id: 'g', date: '2026-01-05', nature: 'ventes', montant: 999, devise: 'CDF' as const, taux: null },
    ];
    const factures = [{ date: '2025-02-01', nature: 'ventes', montant: 70, devise: 'CDF' as const, taux: null }];
    expect(chiffreAffairesRealise(2025, ops, factures)).toBe(100 + 28_000 + 70);
  });
});
