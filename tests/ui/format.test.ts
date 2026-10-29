import { describe, expect, it } from 'vitest';
import { aujourdhuiLocal, fmt, fmtMontant, lireMontant, lireTaux } from '../../src/ui/format';

describe('affichage', () => {
  it('groupe les milliers avec une espace simple', () => {
    expect(fmt(1_234_567)).toBe('1 234 567');
    expect(fmt(-587_500)).toBe('−587 500');
    expect(fmtMontant(12_500, 'CDF')).toBe('12 500 CDF');
    expect(fmtMontant(12_345, 'USD')).toBe('123,45 USD');
    expect(fmtMontant(-50, 'USD')).toBe('−0,50 USD');
  });
});

describe('lecture des montants tapés', () => {
  it('lit les francs avec ou sans séparateurs', () => {
    expect(lireMontant('12500', 'CDF')).toBe(12_500);
    expect(lireMontant('12 500', 'CDF')).toBe(12_500);
    expect(lireMontant('1.250.000', 'CDF')).toBe(1_250_000);
    expect(lireMontant('12,5', 'CDF')).toBeNull();
    expect(lireMontant('', 'CDF')).toBeNull();
    expect(lireMontant('abc', 'CDF')).toBeNull();
  });

  it('lit les dollars en centimes', () => {
    expect(lireMontant('120', 'USD')).toBe(12_000);
    expect(lireMontant('120,5', 'USD')).toBe(12_050);
    expect(lireMontant('120.55', 'USD')).toBe(12_055);
    expect(lireMontant('1,234', 'USD')).toBeNull();
  });

  it('lit un taux', () => {
    expect(lireTaux('2850')).toBe(2850);
    expect(lireTaux('2 843,65')).toBe(2843.65);
    expect(lireTaux('0')).toBeNull();
  });

  it("donne la date du jour en heure locale", () => {
    expect(aujourdhuiLocal(new Date(2026, 9, 29, 23, 30))).toBe('2026-10-29');
  });
});
