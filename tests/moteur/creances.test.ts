/** Créances : particulier ou commerçant, délai d'un an, dossier de créance. Données fictives. */
import { describe, expect, it } from 'vitest';
import { controler, dossierCreance, prescription, type PieceTiers } from '../../src/moteur';
import { annulation, dossierDeBase, op } from './outils';

const creance = (p: Partial<PieceTiers>): PieceTiers => ({ id: 'c1', date: '2026-01-15', facture: 'V-1', nom: 'Client fictif', nature: 'ventes', montant: 300_000, devise: 'CDF', taux: null, ...p });

describe('délai pour réclamer une créance', () => {
  it("compte un an pour un particulier, et rien pour un commerçant", () => {
    expect(prescription(creance({}))).toBe('2027-01-15');
    expect(prescription(creance({ client: 'particulier' }))).toBe('2027-01-15');
    // Entre commerçants : deux ans pour une vente de marchandises (AUDCG, art. 301), cinq ans pour des services (art. 16).
    expect(prescription(creance({ client: 'commercant' }))).toBe('2028-01-15');
    expect(prescription(creance({ client: 'commercant' }), 'services')).toBe('2031-01-15');
    expect(prescription(creance({ date: '2028-02-29' }))).toBe('2029-02-28');
  });

  it('prévient dans les trois derniers mois, puis signale le délai passé', () => {
    const d = dossierDeBase({ creances: [creance({}), creance({ id: 'c2', nom: 'Grossiste fictif', client: 'commercant' })] });
    const codes = (date: string) => controler(d, date).map((a) => a.code);
    expect(codes('2026-10-15')).not.toContain('creance_prescription');
    const alerte = controler(d, '2026-10-20').find((a) => a.code === 'creance_prescription');
    expect(alerte?.references).toEqual(['c1']);
    expect(alerte?.message).toContain("jusqu'au 2027-01-15");
  });

  it("ne dit plus rien quand le client a tout payé", () => {
    const paye = op({ date: '2026-03-01', type: 'recette', nature: 'ventes', montant: 300_000, reglementDe: { genre: 'creance', ligne: 'c1' } });
    const d = dossierDeBase({ creances: [creance({})], operations: [paye] });
    expect(controler(d, '2026-11-30').map((a) => a.code)).not.toContain('creance_prescription');
  });

  it("signale une créance de plus d'un an reportée d'un exercice précédent", () => {
    const d = dossierDeBase({ creances: [creance({ date: '2025-03-10' })] });
    expect(controler(d, '2026-04-01').map((a) => a.code)).toContain('creance_prescrite');
  });
});

describe('dossier de créance', () => {
  const p1 = op({ id: 'p1', date: '2026-02-01', type: 'recette', nature: 'ventes', montant: 100_000, reglementDe: { genre: 'creance', ligne: 'c1' } });
  const p2 = op({ id: 'p2', date: '2026-03-01', compte: 'banque', type: 'recette', nature: 'ventes', montant: 50_000, reglementDe: { genre: 'creance', ligne: 'c1' } });
  const d = dossierDeBase({ creances: [creance({ adresse: 'Avenue fictive, Kalamu' })], operations: [p1, p2, annulation(p2, '2026-03-05')] });

  it('liste les paiements, annulation comprise, et le reste dû', () => {
    const x = dossierCreance(d, 'c1', '2026-04-01');
    expect(x.paiements.map((p) => [p.date, p.compte, p.montant])).toEqual([
      ['2026-02-01', 'Caisse', 100_000],
      ['2026-03-01', 'Banque', 50_000],
      ['2026-03-05', 'Banque', -50_000],
    ]);
    expect(x.regle).toBe(100_000);
    expect(x.reste).toBe(200_000);
    expect(x.prescription).toBe('2027-01-15');
    expect(x.ligne.adresse).toBe('Avenue fictive, Kalamu');
  });

  it("s'arrête à la date demandée", () => {
    expect(dossierCreance(d, 'c1', '2026-02-15').reste).toBe(200_000);
    expect(dossierCreance(d, 'c1', '2026-01-20').reste).toBe(300_000);
  });
});
