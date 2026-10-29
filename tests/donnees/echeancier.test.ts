import { describe, expect, it } from 'vitest';
import { echeances, profilEcheancier } from '../../src/donnees/echeancier';
import { dossierDeBase, op } from '../moteur/outils';

const cles = (du: string, jours: number, p: Parameters<typeof echeances>[2]) => echeances(du, jours, p).map((e) => `${e.date} ${e.cle}`);

describe('échéancier', () => {
  it("ne rappelle rien de social à qui n'emploie personne", () => {
    expect(cles('2026-05-01', 60, { salaries: false, loyer: false, regime: 'petite' })).toEqual([]);
  });

  it('rappelle chaque mois loyer, ONEM et cotisations, et l’INPP en fin de trimestre', () => {
    expect(cles('2026-07-01', 31, { salaries: true, loyer: true, regime: 'petite' })).toEqual([
      '2026-07-10 loyer',
      '2026-07-10 onemDeclaration',
      '2026-07-15 cotisations',
      '2026-07-31 inpp',
    ]);
  });

  it("suit le régime fiscal pour l'impôt annuel", () => {
    expect(cles('2027-01-20', 120, { salaries: false, loyer: false, regime: 'petite' })).toEqual(['2027-01-31 impotPremier', '2027-04-30 arreteEtats', '2027-04-30 impotSolde']);
    expect(cles('2027-01-20', 120, { salaries: false, loyer: false, regime: 'micro' })).toEqual(['2027-04-30 arreteEtats', '2027-04-30 forfaitMicro']);
  });

  it('passe le cap de l’année', () => {
    expect(cles('2026-12-20', 30, { salaries: true, loyer: false, regime: 'petite' })).toEqual(['2027-01-10 onemDeclaration', '2027-01-15 cotisations']);
  });

  it("micro-entreprise : IRPP des salariés au forfait chaque trimestre, pas de retenue mensuelle", () => {
    expect(cles('2027-01-01', 31, { salaries: true, loyer: false, regime: 'micro' })).toEqual([
      '2027-01-10 onemDeclaration',
      '2027-01-15 cotisationsMicro',
      '2027-01-15 irppSalaries',
      '2027-01-31 inpp',
      '2027-01-31 mainOeuvre',
    ]);
    expect(cles('2027-03-01', 31, { salaries: true, loyer: false, regime: 'micro' })).not.toContain('2027-03-31 salairesAnnuel');
  });

  it('tire le profil des saisies', () => {
    const d = dossierDeBase({
      operations: [
        op({ type: 'recette', nature: 'ventes', montant: 30_000_000 }),
        op({ type: 'depense', nature: 'salaires', montant: 600_000 }),
      ],
    });
    expect(profilEcheancier(d, '2026-06-30')).toEqual({ salaries: true, loyer: false, regime: 'petite' });
  });
});
