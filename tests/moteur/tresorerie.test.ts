import { describe, expect, it } from 'vitest';
import { calculerEtats, journalMensuel, soldesTresorerie, valider } from '../../src/moteur';
import { jeuPrototype } from './jeu-prototype';
import { annulation, dossierDeBase, op } from './outils';

describe('transfert entre comptes', () => {
  const versement = op({ id: 'v', date: '2026-05-04', type: 'transfert', nature: 'transfert', compte: 'caisse', compteDestination: 'banque', montant: 700_000, libelle: 'Versement à la banque' });
  const d = dossierDeBase({ operations: [versement] });

  it("déplace l'argent d'un compte à l'autre", () => {
    const s = Object.fromEntries(soldesTresorerie(d).map((x) => [x.compte.id, x.natif]));
    expect(s).toEqual({ caisse: 300_000, banque: 2_700_000 });
  });

  it('apparaît en dépense dans le journal de départ et en recette dans celui d\'arrivée', () => {
    const jc = journalMensuel(d, 'caisse', '2026-05');
    const jb = journalMensuel(d, 'banque', '2026-05');
    expect(jc.lignes[0]).toMatchObject({ recette: 0, depense: 700_000, solde: 300_000 });
    expect(jb.lignes[0]).toMatchObject({ recette: 700_000, depense: 0, solde: 2_700_000 });
    expect(jc.ventilation.depenses.transferts).toBe(700_000);
    expect(jb.ventilation.recettes.transferts).toBe(700_000);
  });

  it("ne touche ni le compte de résultat ni le total de la trésorerie", () => {
    const e = calculerEtats(d);
    expect(e.compteDeResultat.A).toBe(0);
    expect(e.compteDeResultat.B).toBe(0);
    expect(e.bilan.actif.caisse + e.bilan.actif.banque).toBe(3_000_000);
    expect(e.bilan.equilibre).toBe(true);
  });

  it('refuse un transfert vers le même compte', () => {
    const d2 = dossierDeBase({ operations: [{ ...versement, compteDestination: 'caisse' }] });
    expect(valider(d2).join(' ')).toMatch(/deux comptes différents/);
  });
});

describe('journal de trésorerie mensuel (note 4)', () => {
  const d = jeuPrototype();

  it("ouvre sur le report à nouveau et se clôt sur le solde à reporter", () => {
    const sept = journalMensuel(d, 'caisse', '2026-09');
    const oct = journalMensuel(d, 'caisse', '2026-10');
    expect(oct.reportANouveau).toBe(sept.soldeAReporter);
    expect(oct.soldeAReporter).toBe(oct.reportANouveau + oct.totalRecettes - oct.totalDepenses);
    expect(oct.lignes.at(-1)?.solde).toBe(oct.soldeAReporter);
  });

  it('enchaîne les douze mois jusqu\'au solde de clôture', () => {
    let report = d.soldesOuverture.banque ?? 0;
    for (let m = 1; m <= 12; m++) {
      const j = journalMensuel(d, 'banque', `2026-${String(m).padStart(2, '0')}`);
      expect(j.reportANouveau).toBe(report);
      report = j.soldeAReporter;
    }
    expect(report).toBe(-587_500);
  });

  it('ventile les recettes et les dépenses selon le modèle SMT', () => {
    const oct = journalMensuel(d, 'caisse', '2026-10');
    expect(oct.ventilation.recettes.ventes).toBe(2_105_000 + 2_380_000 + 2_210_000 + 2_460_000);
    expect(oct.ventilation.depenses.achats_marchandises).toBe(1_340_000 + 1_083_000);
    expect(oct.ventilation.depenses.autres).toBe(60_000);
    expect(oct.lignes.find((l) => l.libelle.startsWith('Réparation'))?.piece).toBe(false);
  });

  it("refuse un mois hors de l'exercice", () => {
    expect(() => journalMensuel(d, 'caisse', '2025-12')).toThrow(/hors de l'exercice/);
  });
});

describe('correction par annulation (D5)', () => {
  const erreur = op({ id: 'faux', date: '2026-06-03', type: 'recette', nature: 'ventes', montant: 200_000, libelle: 'Ventes saisies deux fois' });

  it("contre-passe l'opération à sa propre date, sans rien effacer", () => {
    const d = dossierDeBase({ operations: [erreur, annulation(erreur, '2026-07-02')] });
    const juin = journalMensuel(d, 'caisse', '2026-06');
    const juillet = journalMensuel(d, 'caisse', '2026-07');
    expect(juin.lignes[0]).toMatchObject({ recette: 200_000, annulation: false });
    expect(juillet.lignes[0]).toMatchObject({ recette: -200_000, annulation: true });
    expect(juillet.ventilation.recettes.ventes).toBe(-200_000);
    expect(juillet.soldeAReporter).toBe(1_000_000);
    expect(calculerEtats(d).compteDeResultat.recettesVentes).toBe(0);
    // Avant l'annulation, la vente compte encore.
    expect(calculerEtats(d, { auDate: '2026-06-30' }).compteDeResultat.recettesVentes).toBe(200_000);
  });

  it("refuse une annulation qui ne reprend pas exactement l'opération", () => {
    const d = dossierDeBase({ operations: [erreur, { ...annulation(erreur, '2026-07-02'), montant: 150_000 }] });
    expect(valider(d).join(' ')).toMatch(/reprend exactement/);
  });

  it('refuse une double annulation', () => {
    const d = dossierDeBase({ operations: [erreur, annulation(erreur, '2026-07-02', 'a1'), annulation(erreur, '2026-07-03', 'a2')] });
    expect(valider(d).join(' ')).toMatch(/annulée 2 fois/);
  });
});
