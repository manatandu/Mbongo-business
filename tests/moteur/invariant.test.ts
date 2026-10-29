/**
 * Invariant du SMT : total actif = total passif, au franc près, pour n'importe quelle suite d'opérations.
 * On ne le montre pas sur un exemple : on le vérifie sur des milliers d'exercices tirés au hasard,
 * avec toutes les natures, des dollars, des changes, des paiements partiels, des annulations,
 * des achats et des cessions de matériel, des emprunts.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { calculerEtats, dossierSuivant, journalMensuel, soldesTresorerie, valider } from '../../src/moteur';
import { ajouterJours, moisEntre } from '../../src/moteur/dates';
import { construire, graine } from './generateur';

const TIRAGES = Number(process.env.TIRAGES ?? 1000);

describe('invariant actif = passif', () => {
  it('le générateur ne produit que des dossiers valides', () => {
    fc.assert(
      fc.property(graine, (g) => {
        expect(valider(construire(g))).toEqual([]);
      }),
      { numRuns: TIRAGES },
    );
  });

  it("le bilan s'équilibre à la clôture", () => {
    fc.assert(
      fc.property(graine, (g) => {
        const b = calculerEtats(construire(g)).bilan;
        expect(b.actif.total).toBe(b.passif.total);
        expect(b.equilibre).toBe(true);
      }),
      { numRuns: TIRAGES },
    );
  });

  it('la note 3 détaillée par client et par fournisseur retombe sur les totaux', () => {
    fc.assert(
      fc.property(graine, (g) => {
        const n3 = calculerEtats(construire(g)).notes.note3;
        for (const genre of ['creances', 'dettes'] as const) {
          expect(n3[genre].lignes.reduce((t, l) => t + l.cloture, 0)).toBe(n3[genre].cloture);
          expect(n3[genre].lignes.reduce((t, l) => t + l.ouverture, 0)).toBe(n3[genre].ouverture);
        }
      }),
      { numRuns: Math.ceil(TIRAGES / 2) },
    );
  });

  it("le bilan s'équilibre à n'importe quelle date de l'exercice", () => {
    fc.assert(
      fc.property(graine, fc.integer({ min: 0, max: 364 }), (g, j) => {
        const b = calculerEtats(construire(g), { auDate: ajouterJours('2026-01-01', j) }).bilan;
        expect(b.actif.total).toBe(b.passif.total);
      }),
      { numRuns: TIRAGES },
    );
  });

  it('les journaux mensuels s’enchaînent jusqu’au solde de clôture de chaque compte', () => {
    fc.assert(
      fc.property(graine, (g) => {
        const d = construire(g);
        const finaux = new Map(soldesTresorerie(d).map((s) => [s.compte.id, s.natif]));
        for (const c of d.comptes) {
          let report = d.soldesOuverture[c.id] ?? 0;
          for (const m of moisEntre('2026-01', '2026-12')) {
            const j = journalMensuel(d, c.id, m);
            expect(j.reportANouveau).toBe(report);
            report = j.soldeAReporter;
          }
          expect(report).toBe(finaux.get(c.id));
        }
      }),
      { numRuns: Math.ceil(TIRAGES / 5) },
    );
  });

  it("l'exercice suivant s'ouvre sur compte exploitant N + résultat N", () => {
    fc.assert(
      fc.property(graine, (g) => {
        const d = construire(g, true);
        const e = calculerEtats(d);
        const suivant = dossierSuivant(d);
        expect(valider(suivant)).toEqual([]);
        const e2 = calculerEtats({ ...suivant, stockFinal: suivant.stockInitial, tauxCloture: suivant.tauxOuverture });
        expect(e2.bilan.compteExploitant.ouverture).toBe(e.bilan.passif.compteExploitant + e.bilan.passif.resultat);
        expect(e2.bilan.equilibre).toBe(true);
      }),
      { numRuns: Math.ceil(TIRAGES / 2) },
    );
  });
});
