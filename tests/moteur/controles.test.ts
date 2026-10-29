import { describe, expect, it } from 'vitest';
import { controler, evaluerSeuil, seuilEnFrancs, type CodeAnomalie } from '../../src/moteur';
import { jeuPrototype } from './jeu-prototype';
import { dossierDeBase, op } from './outils';

const codes = (a: { code: CodeAnomalie }[]) => a.map((x) => x.code);

describe('contrôles sur le jeu du prototype', () => {
  const d = jeuPrototype();
  const a = controler(d, '2026-10-29');
  const trouve = (c: CodeAnomalie) => a.find((x) => x.code === c);

  it('relève les trois opérations sans pièce', () => {
    expect(trouve('sans_piece')?.references).toHaveLength(3);
  });

  it('relève le découvert de la banque, à vérifier avec le relevé', () => {
    expect(trouve('decouvert_bancaire')).toMatchObject({ niveau: 'a_revoir', references: ['banque'] });
    expect(trouve('solde_negatif')).toBeUndefined();
  });

  it('relève la créance de plus de 30 jours', () => {
    expect(trouve('creance_ancienne')?.references).toEqual(['c-3']);
    expect(trouve('creance_ancienne')?.message).toContain('Restaurant Chez Tantine (610 000 FC)');
    expect(trouve('decouvert_bancaire')?.message).toContain('depuis le 2026-08-05 (au plus bas −690 000 FC)');
  });

  it('ne signale pas les mois repris du cahier de caisse comme sans vente', () => {
    expect(trouve('jours_sans_vente')).toBeUndefined();
    expect(trouve('mois_sans_saisie')).toBeUndefined();
  });

  it('signale six jours ouvrés sans vente au 31 octobre', () => {
    // Dernière vente le samedi 24 ; du lundi 26 au samedi 31 : six jours ouvrés.
    const fin = controler(d, '2026-10-31');
    expect(fin.find((x) => x.code === 'jours_sans_vente')?.message).toMatch(/^6 jours ouvrés/);
  });

  it('tient compte des jours fériés', () => {
    const fin = controler(d, '2026-10-31', { joursFeries: ['2026-10-26', '2026-10-27'] });
    expect(codes(fin)).not.toContain('jours_sans_vente');
  });
});

describe('autres contrôles', () => {
  it("traite une caisse négative comme une erreur à corriger", () => {
    const d = dossierDeBase({ operations: [op({ date: '2026-03-02', type: 'depense', nature: 'loyers', montant: 1_500_000 })] });
    expect(controler(d, '2026-03-02').find((x) => x.code === 'solde_negatif')).toMatchObject({
      niveau: 'a_traiter',
      message: expect.stringContaining('depuis le 2026-03-02'),
    });
  });

  it('signale les mois écoulés sans saisie', () => {
    const d = dossierDeBase({
      operations: [op({ date: '2026-01-10', type: 'recette', nature: 'ventes', montant: 1 }), op({ date: '2026-04-10', type: 'recette', nature: 'ventes', montant: 1 })],
    });
    expect(controler(d, '2026-05-15').find((x) => x.code === 'mois_sans_saisie')?.references).toEqual(['2026-02', '2026-03']);
  });

  it('signale les opérations en dollars dont le taux reste à confirmer', () => {
    const d = dossierDeBase({
      comptes: [...dossierDeBase().comptes, { id: 'usd', type: 'caisse', libelle: 'Caisse dollars', devise: 'USD' }],
      operations: [
        op({ id: 'a', compte: 'usd', type: 'recette', nature: 'ventes', montant: 100, devise: 'USD', taux: 2800 }),
        op({ id: 'b', compte: 'usd', type: 'recette', nature: 'ventes', montant: 100, devise: 'USD', taux: 2800 }),
      ],
      confirmationsTaux: [{ operation: 'a', taux: 2800 }],
    });
    expect(controler(d, '2026-03-31').find((x) => x.code === 'taux_a_confirmer')?.references).toEqual(['b']);
  });

  it("signale à la clôture l'inventaire et le taux manquants", () => {
    const d = dossierDeBase({
      stockFinal: null,
      comptes: [...dossierDeBase().comptes, { id: 'usd', type: 'caisse', libelle: 'Caisse dollars', devise: 'USD' }],
      operations: [op({ compte: 'usd', type: 'recette', nature: 'ventes', montant: 100, devise: 'USD', taux: 2800 })],
    });
    expect(codes(controler(d, '2026-12-31'))).toEqual(expect.arrayContaining(['stock_non_inventorie', 'taux_cloture_manquant']));
  });
});

describe('seuils du SMT', () => {
  // Taux fictif pour le test : 4,5 FC pour 1 FCFA.
  const T = 4.5;

  it('convertit le seuil du secteur en francs congolais', () => {
    expect(seuilEnFrancs('negoce', T)).toBe(270_000_000);
    expect(seuilEnFrancs('artisanat', T)).toBe(180_000_000);
    expect(seuilEnFrancs('services', T)).toBe(135_000_000);
  });

  it('prévient à 80 % et alerte au-delà du seuil', () => {
    expect(evaluerSeuil('services', 100_000_000, T).niveau).toBe('sous_le_seuil');
    expect(evaluerSeuil('services', 120_000_000, T).niveau).toBe('approche');
    expect(evaluerSeuil('services', 135_000_000, T).niveau).toBe('depasse');
  });

  it("renvoie vers l'expert-comptable quand le seuil est dépassé", () => {
    const d = dossierDeBase({
      entreprise: { nom: 'Salon (fictif)', secteur: 'services' },
      operations: [op({ type: 'recette', nature: 'ventes', montant: 140_000_000 })],
    });
    const s = controler(d, '2026-06-30', { fcfaVersCdf: T }).find((x) => x.code === 'seuil_smt_depasse');
    expect(s?.message).toMatch(/Système normal à voir avec l'expert-comptable partenaire/);
  });

  it('ne déclenche rien sur le jeu du prototype', () => {
    const a = controler(jeuPrototype(), '2026-10-29', { fcfaVersCdf: T });
    expect(codes(a).filter((c) => c.startsWith('seuil'))).toEqual([]);
  });
});
