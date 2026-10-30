import { describe, expect, it } from 'vitest';
import {
  afficherTelephone,
  debutRenouvellement,
  estFormuleTRK,
  etatAbonnement,
  finAbonnement,
  FORMULES,
  LIBELLE_FORMULE,
  normaliserTelephone,
  TARIFS,
  tarifMensuel,
} from '../../src/console/abonnement';

describe('abonnements de la console', () => {
  it('un mois finit la veille du même jour, le mois suivant', () => {
    expect(finAbonnement('2027-02-27', 1)).toBe('2027-03-26');
    expect(finAbonnement('2027-01-01', 1)).toBe('2027-01-31');
    expect(finAbonnement('2027-01-01', 12)).toBe('2027-12-31');
    // 31 janvier + 1 mois : on s'arrête au dernier jour de février, moins un jour.
    expect(finAbonnement('2027-01-31', 1)).toBe('2027-02-27');
    expect(finAbonnement('2028-01-31', 1)).toBe('2028-02-28');
  });

  it('un renouvellement suit la fin, sauf après un long arrêt', () => {
    expect(debutRenouvellement('2027-03-26', '2027-03-20')).toBe('2027-03-27');
    expect(debutRenouvellement('2027-03-26', '2027-04-10')).toBe('2027-03-27');
    expect(debutRenouvellement('2027-01-10', '2027-06-01')).toBe('2027-06-01');
  });

  it('suit les fenêtres des rappels SMS', () => {
    expect(etatAbonnement(null)).toBe('aucun');
    expect(etatAbonnement(11)).toBe('en_cours');
    expect(etatAbonnement(10)).toBe('bientot');
    expect(etatAbonnement(1)).toBe('bientot');
    expect(etatAbonnement(0)).toBe('echeance');
    expect(etatAbonnement(-1)).toBe('retard');
    expect(etatAbonnement(-30)).toBe('retard');
    expect(etatAbonnement(-31)).toBe('fini');
  });

  it('met les numéros congolais au format international', () => {
    expect(normaliserTelephone('0983 510 725')).toBe('+243983510725');
    expect(normaliserTelephone('983510725')).toBe('+243983510725');
    expect(normaliserTelephone('+243 983-510-725')).toBe('+243983510725');
    expect(normaliserTelephone('00243983510725')).toBe('+243983510725');
    expect(normaliserTelephone('12')).toBeNull();
    expect(afficherTelephone('+243983510725')).toBe('+243 983 510 725');
  });

  it("ne vend que les formules de TRK : l'expert-comptable facture lui-même (loi n° 15/002, art. 50)", () => {
    expect(FORMULES).toEqual(['essentiel', 'suivi']);
    expect(Object.keys(TARIFS)).toEqual(['essentiel', 'suivi']);
    expect(FORMULES.map((f) => LIBELLE_FORMULE[f]).join(' ')).not.toMatch(/expert/i);
    // Une ancienne ligne « expert » se lit encore, sans tarif.
    expect(estFormuleTRK('expert')).toBe(false);
    expect(tarifMensuel('expert')).toBe(0);
    expect(LIBELLE_FORMULE.expert).toBe('Ancienne formule (plus vendue)');
    expect(tarifMensuel('suivi')).toBe(50_000);
    expect(tarifMensuel(null)).toBe(0);
  });
});
