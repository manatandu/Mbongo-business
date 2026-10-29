/**
 * Non-régression : le moteur redonne exactement les montants du prototype validé.
 * Valeurs obtenues en exécutant la fonction compute() de prototype/index.html sur son jeu de départ.
 */
import { describe, expect, it } from 'vitest';
import { calculerEtats, MENTION_ETATS, soldesTresorerie, valider } from '../../src/moteur';
import { jeuPrototype } from './jeu-prototype';

describe('jeu du prototype', () => {
  const dossier = jeuPrototype();
  const etats = calculerEtats(dossier);
  const cr = etats.compteDeResultat;
  const bilan = etats.bilan;

  it('est un dossier valide', () => {
    expect(valider(dossier)).toEqual([]);
  });

  it('redonne le compte de résultat du prototype', () => {
    expect(cr.recettesVentes).toBe(93_502_000);
    expect(cr.autresRecettes).toBe(0);
    expect(cr.A).toBe(93_502_000);
    expect(cr.achats).toBe(61_370_000);
    expect(cr.loyers).toBe(4_500_000);
    expect(cr.salaires).toBe(2_880_000);
    expect(cr.impotsTaxes).toBe(635_000);
    expect(cr.interets).toBe(0);
    expect(cr.autresDepenses).toBe(1_440_000);
    expect(cr.B).toBe(70_825_000);
    expect(cr.C).toBe(22_677_000);
    expect(cr.D).toBe(-1_119_000);
    expect(cr.E).toBe(-1_020_000);
    expect(cr.F).toBe(814_500);
    expect(cr.G).toBe(21_961_500);
  });

  it('redonne le bilan du prototype, équilibré', () => {
    expect(bilan.actif).toEqual({
      immobilisations: 2_010_000,
      stocks: 7_350_000,
      creances: 1_069_000,
      caisse: 20_430_000,
      banque: 144_500,
      total: 31_003_500,
    });
    expect(bilan.passif).toEqual({
      compteExploitant: 6_872_000,
      resultat: 21_961_500,
      emprunt: 0,
      dettes: 2_170_000,
      total: 31_003_500,
    });
    expect(bilan.equilibre).toBe(true);
    expect(bilan.compteExploitant).toEqual({ ouverture: 13_172_000, apports: 0, prelevements: 6_300_000 });
  });

  it('redonne les soldes de chaque compte', () => {
    const soldes = Object.fromEntries(soldesTresorerie(dossier).map((s) => [s.compte.id, s.natif]));
    expect(soldes).toEqual({ caisse: 20_430_000, mpesa: 580_000, orange: 152_000, banque: -587_500 });
  });

  it('redonne les notes 1 à 3', () => {
    expect(etats.notes.note1.lignes.map((l) => [l.designation, l.dotation, l.valeurNette])).toEqual([
      ['Étagères métalliques', 360_000, 360_000],
      ['Balance électronique', 84_000, 168_000],
      ['Congélateur pour les boissons', 370_500, 1_482_000],
    ]);
    expect(etats.notes.note2).toMatchObject({ stockInitial: 6_500_000, stockFinal: 7_350_000, inventaireFait: true });
    expect(etats.notes.note3.creances).toMatchObject({ cloture: 1_069_000, ouverture: 800_000 });
    expect(etats.notes.note3.dettes).toMatchObject({ cloture: 2_170_000, ouverture: 1_150_000 });
    expect(etats.notes.note3.creances.variation).toBeCloseTo(0.33625, 5);
  });

  it('porte la mention fixe et la version du moteur', () => {
    expect(etats.mention).toBe(MENTION_ETATS);
    expect(etats.mention).toBe('Mbongo prépare, il ne certifie pas.');
    expect(etats.versionMoteur).toMatch(/^\d+\.\d+\.\d+$/);
    expect(etats.provisoire).toBe(false);
  });
});
