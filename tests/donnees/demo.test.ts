/** Le jeu de démonstration doit tenir quel que soit le jour où on l'ouvre : le jour de la soutenance n'est pas connu. */
import { describe, expect, it } from 'vitest';
import { calculerEtats, controler, valider } from '../../src/moteur';
import { ajouterJours } from '../../src/moteur/dates';
import { creerJeuDemo } from '../../src/demo/jeu-demo';

const compteur = () => {
  let n = 0;
  return () => `id-${++n}`;
};

const jours: string[] = [];
for (let d = '2026-01-01'; d <= '2028-12-31'; d = ajouterJours(d, 1)) jours.push(d);

describe('jeu de démonstration', () => {
  it('est valide et équilibré chaque jour de 2026 à 2028', () => {
    for (const j of jours) {
      const { dossier } = creerJeuDemo(j, compteur());
      expect(valider(dossier), j).toEqual([]);
      const e = calculerEtats(dossier, { auDate: j });
      expect(e.bilan.equilibre, j).toBe(true);
    }
  });

  it("n'affiche jamais de caisse, de compte mobile ou de banque négatifs", () => {
    for (const j of jours) {
      const a = controler(creerJeuDemo(j, compteur()).dossier, j);
      expect(a.filter((x) => x.code === 'solde_negatif' || x.code === 'decouvert_bancaire').map((x) => x.message), j).toEqual([]);
    }
  });

  it('ne signale pas de jours sans vente ni de mois vides', () => {
    for (const j of jours) {
      const codes = controler(creerJeuDemo(j, compteur()).dossier, j).map((x) => x.code);
      expect(codes, j).not.toContain('jours_sans_vente');
      expect(codes, j).not.toContain('mois_sans_saisie');
    }
  });

  it('montre au moins une créance ancienne et des opérations sans pièce, pour la démonstration des contrôles', () => {
    const codes = controler(creerJeuDemo('2027-05-20', compteur()).dossier, '2027-05-20').map((x) => x.code);
    expect(codes).toEqual(expect.arrayContaining(['creance_ancienne', 'sans_piece', 'taux_a_confirmer']));
  });

  it('se présente comme fictive', () => {
    const { entreprise } = creerJeuDemo('2027-05-20', compteur());
    expect(entreprise.demo).toBe(true);
    expect(entreprise.responsable).toMatch(/fictif/);
  });
});
