import { describe, expect, it } from 'vitest';
import { estimerImpots } from '../../src/donnees/estimation';

const base = { annee: 2026, debut: '2026-01-01', fin: '2026-12-31', taux: 2800 };

describe('estimation de l’IRPP (loi n° 23/053, art. 127, 128, 103 ; LPF art. 57 quater)', () => {
  it('micro-entreprise : forfait de 30 USD, converti au taux du jour, payé au 30 avril suivant', () => {
    const e = estimerImpots({ ...base, regime: 'micro', ca: 20_000_000, date: '2026-12-31', profil: { activite: 'vente', salaries: 0 } });
    expect(e.irpp).toEqual({ cas: 'forfait', usd: 30, cdf: 84_000, date: '2027-04-30' });
    // Sans taux du jour, le montant reste en dollars.
    expect(estimerImpots({ ...base, taux: null, regime: 'micro', ca: 1, date: '2026-12-31', profil: { activite: 'vente', salaries: 0 } }).irpp).toMatchObject({ cdf: null });
  });

  it('petite entreprise : 1 % pour la vente, 2 % pour les services, en deux quotités 60 / 40', () => {
    const vente = estimerImpots({ ...base, regime: 'petite', ca: 100_000_000, date: '2026-12-31', profil: { activite: 'vente', salaries: 0 } });
    expect(vente.irpp).toMatchObject({ cas: 'proportionnel', taux: 0.01, montant: 1_000_000, projection: null });
    expect(vente.irpp.cas === 'proportionnel' && vente.irpp.quotites).toEqual([
      { part: 0.6, date: '2027-01-31', montant: 600_000 },
      { part: 0.4, date: '2027-04-30', montant: 400_000 },
    ]);
    const services = estimerImpots({ ...base, regime: 'petite', ca: 100_000_000, date: '2026-12-31', profil: { activite: 'services', salaries: 0 } });
    expect(services.irpp).toMatchObject({ taux: 0.02, montant: 2_000_000 });
  });

  it('année en cours : montant à ce jour, et projection au même rythme jusqu’au 31 décembre', () => {
    const e = estimerImpots({ ...base, regime: 'petite', ca: 50_000_000, date: '2026-07-02', profil: { activite: 'vente', salaries: 0 } });
    // 183 jours écoulés sur 365 : 50 M × 365 / 183.
    expect(e.irpp).toMatchObject({ montant: 500_000, projectionCa: Math.round((50_000_000 * 365) / 183), projection: Math.round(Math.round((50_000_000 * 365) / 183) * 0.01) });
  });

  it('cultures vivrières sur moins de 10 ha : exonéré (art. 103) ; régime réel : pas d’estimation', () => {
    expect(estimerImpots({ ...base, regime: 'petite', ca: 50_000_000, date: '2026-12-31', profil: { activite: 'vivrieres', salaries: 0 } }).irpp).toEqual({ cas: 'exonere' });
    expect(estimerImpots({ ...base, regime: 'reel', ca: 400_000_000, date: '2026-12-31', profil: { activite: 'vente', salaries: 0 } }).irpp).toEqual({ cas: 'reel' });
  });

  it('salariés : forfait de 36 USD par an et par salarié en micro-entreprise (AM 019/2025), barème non estimé en petite', () => {
    const micro = estimerImpots({ ...base, regime: 'micro', ca: 1, date: '2026-12-31', profil: { activite: 'vente', salaries: 2 } });
    expect(micro.salaries).toEqual({ nombre: 2, cas: 'forfait', usdAn: 72, usdTrimestre: 18, cdfAn: 201_600 });
    const petite = estimerImpots({ ...base, regime: 'petite', ca: 30_000_000, date: '2026-12-31', profil: { activite: 'vente', salaries: 2 } });
    expect(petite.salaries).toEqual({ nombre: 2, cas: 'bareme' });
  });
});
