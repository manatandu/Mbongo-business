import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { valoriser, type MethodeValorisation, type MouvementStock } from '../../src/moteur/valorisation';

const e = (date: string, quantite: number, prixUnitaire: number): MouvementStock => ({ date, sens: 'entree', quantite, prixUnitaire });
const s = (date: string, quantite: number): MouvementStock => ({ date, sens: 'sortie', quantite });

// Exemple de cours : stock initial 100 sacs à 30 000, achat de 200 à 33 000, vente de 150, achat de 100 à 36 000, vente de 120.
const exemple = [e('2026-01-01', 100, 30_000), e('2026-02-10', 200, 33_000), s('2026-03-05', 150), e('2026-04-02', 100, 36_000), s('2026-05-20', 120)];

describe('valorisation des stocks (AUDCIF, art. 44)', () => {
  it('CUMP après chaque entrée : coût recalculé à chaque achat', () => {
    const r = valoriser(exemple, 'cump_entree');
    // CUMP 1 = (3 000 000 + 6 600 000) / 300 = 32 000 ; sortie 150 × 32 000 = 4 800 000.
    expect(r.sorties[0]!.valeur).toBe(4_800_000);
    // Reste 150 à 32 000 = 4 800 000 ; + 100 à 36 000 → 8 400 000 / 250 = 33 600 ; sortie 120 × 33 600 = 4 032 000.
    expect(r.sorties[1]!.valeur).toBe(4_032_000);
    expect(r.quantite).toBe(130);
    expect(r.valeur).toBe(4_368_000);
    expect(r.coutUnitaire).toBe(33_600);
  });

  it('PEPS : les plus anciens sortent d\'abord, le stock final est au prix récent', () => {
    const r = valoriser(exemple, 'peps');
    // Sortie 150 : 100 × 30 000 + 50 × 33 000 = 4 650 000.
    expect(r.sorties[0]!.valeur).toBe(4_650_000);
    // Sortie 120 : 120 × 33 000 = 3 960 000 ; reste 30 × 33 000 + 100 × 36 000 = 4 590 000.
    expect(r.sorties[1]!.valeur).toBe(3_960_000);
    expect(r.quantite).toBe(130);
    expect(r.valeur).toBe(4_590_000);
  });

  it('CUMP de période : un seul coût pour toute la période', () => {
    const r = valoriser(exemple, 'cump_periode');
    // (3 000 000 + 6 600 000 + 3 600 000) / 400 = 33 000.
    expect(r.coutUnitaire).toBe(33_000);
    expect(r.valeur).toBe(130 * 33_000);
  });

  it('arrête le calcul à une date', () => {
    const r = valoriser(exemple, 'cump_entree', '2026-03-31');
    expect(r.quantite).toBe(150);
    expect(r.valeur).toBe(4_800_000);
  });

  it('signale une sortie supérieure au stock', () => {
    const r = valoriser([e('2026-01-01', 10, 1_000), s('2026-01-05', 12)], 'cump_entree');
    expect(r.quantite).toBe(0);
    expect(r.manque).toBe(2);
    expect(r.sorties[0]!.valeur).toBe(10_000);
  });

  it('accepte les quantités décimales (kg, litres)', () => {
    const r = valoriser([e('2026-01-01', 12.5, 2_400), s('2026-01-02', 2.75)], 'cump_entree');
    expect(r.quantite).toBe(9.75);
    expect(r.valeur + r.sorties[0]!.valeur).toBe(30_000);
  });

  it('conserve la valeur au franc près, pour les trois méthodes', () => {
    const mouvement = fc.oneof(
      fc.record({ sens: fc.constant('entree' as const), quantite: fc.integer({ min: 1, max: 500 }).map((x) => x / 4), prixUnitaire: fc.integer({ min: 1, max: 100_000 }) }),
      fc.record({ sens: fc.constant('sortie' as const), quantite: fc.integer({ min: 1, max: 500 }).map((x) => x / 4) }),
    );
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.integer({ min: 1, max: 28 }), mouvement), { maxLength: 40 }), fc.constantFrom<MethodeValorisation>('cump_entree', 'cump_periode', 'peps'), (lignes, methode) => {
        const mvts = lignes.map(([j, m]) => ({ ...m, date: `2026-02-${String(j).padStart(2, '0')}` }));
        const r = valoriser(mvts, methode);
        const sorti = r.sorties.reduce((t, x) => t + x.valeur, 0);
        expect(r.valeur + sorti).toBe(r.entrees);
        expect(r.valeur).toBeGreaterThanOrEqual(0);
        expect(r.quantite).toBeGreaterThanOrEqual(0);
        r.sorties.forEach((x) => expect(Number.isInteger(x.valeur)).toBe(true));
      }),
      { numRuns: Number(process.env.TIRAGES ?? 300) },
    );
  });
});
