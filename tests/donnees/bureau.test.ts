import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { BaseMbongo } from '../../src/donnees/base';
import { arreterEtats, conditionsArrete, confirmerTaux, definirTauxCloture, rouvrirExercice, saisirTaux, verifierArrete } from '../../src/donnees/bureau';
import { chargerDossier } from '../../src/donnees/dossier';
import { creerEntreprise } from '../../src/donnees/entreprise';
import { enregistrerInventaire, enregistrerOperation, validerInventaire } from '../../src/donnees/saisie';

let db: BaseMbongo;
let exerciceId: string;
let usdOp: string;

beforeEach(async () => {
  db = new BaseMbongo(`bureau-${Math.random()}`);
  const r = await creerEntreprise(db, {
    nom: 'Boutique de test (fictif)',
    activite: 'Alimentation',
    secteur: 'negoce',
    commune: 'Kinshasa',
    nif: '',
    responsable: 'Test (fictif)',
    telephone: '',
    annee: 2026,
    comptes: [
      { type: 'caisse', libelle: 'Caisse', devise: 'CDF', solde: 1_000_000 },
      { type: 'caisse', libelle: 'Caisse dollars', devise: 'USD', solde: 0 },
    ],
    stockInitial: 500_000,
    tauxOuverture: null,
  });
  exerciceId = r.exerciceId;
  const [caisse, dollars] = (await db.comptes.where('entrepriseId').equals(r.entrepriseId).sortBy('ordre')).map((c) => c.id) as [string, string];
  await enregistrerOperation(db, exerciceId, { date: '2026-03-02', type: 'recette', compte: caisse, nature: 'ventes', libelle: 'Ventes', montant: 400_000, devise: 'CDF', taux: null, piece: true });
  usdOp = await enregistrerOperation(db, exerciceId, { date: '2026-04-02', type: 'recette', compte: dollars, nature: 'ventes', libelle: 'Vente en dollars', montant: 10_000, devise: 'USD', taux: 2800, piece: true });
});

describe('arrêté des états', () => {
  it("liste les conditions manquantes en cours d'année", async () => {
    const c = await chargerDossier(db, exerciceId);
    const manquantes = conditionsArrete(c, '2026-10-29').filter((x) => !x.ok).map((x) => x.libelle);
    expect(manquantes).toEqual(['Exercice terminé', 'Inventaire du stock validé par le commerçant', 'Taux de clôture du dollar saisi', 'Taux des opérations en dollars confirmés']);
    await expect(arreterEtats(db, exerciceId, 'Expert (fictif)', '2026-10-29')).rejects.toThrow(/Condition non remplie/);
  });

  it("arrête, fige l'instantané, bloque la saisie, puis se rouvre avec motif", async () => {
    await confirmerTaux(db, exerciceId, usdOp, 2850);
    await definirTauxCloture(db, exerciceId, 2900);
    await enregistrerInventaire(db, exerciceId, [{ reference: 'L1', designation: 'Riz', quantite: 10, prixUnitaire: 50_000, montant: 500_000 }]);
    await validerInventaire(db, exerciceId);
    const c = await chargerDossier(db, exerciceId);
    expect(conditionsArrete(c, '2027-01-10').every((x) => x.ok)).toBe(true);

    const id = await arreterEtats(db, exerciceId, 'Expert (fictif)', '2027-01-10');
    const a = await db.arretes.get(id);
    expect(a?.versionMoteur).toMatch(/^\d+\.\d+\.\d+$/);
    const fige = JSON.parse(a?.etats ?? '{}');
    // Ventes au taux confirmé (2 850), gain de change à la clôture (2 900) en autres recettes.
    expect(fige.compteDeResultat.recettesVentes).toBe(400_000 + 285_000);
    expect(fige.compteDeResultat.autresRecettes).toBe(5_000);
    expect(fige.provisoire).toBe(false);
    expect(await verifierArrete(db, id)).toBe(true);
    expect((await db.exercices.get(exerciceId))?.statut).toBe('arrete');

    // Plus de saisie ni de confirmation sur un exercice arrêté.
    const caisse = c.comptes[0]?.id ?? '';
    await expect(
      enregistrerOperation(db, exerciceId, { date: '2026-12-30', type: 'recette', compte: caisse, nature: 'ventes', libelle: 'Oubli', montant: 1, devise: 'CDF', taux: null, piece: true }),
    ).rejects.toThrow(/arrêtés par l'expert-comptable/);
    await expect(confirmerTaux(db, exerciceId, usdOp, 2700)).rejects.toThrow(/rouvrez/);

    // Un instantané altéré se détecte.
    await db.arretes.update(id, { etats: (a?.etats ?? '').replace('"G":', '"G":1') });
    expect(await verifierArrete(db, id)).toBe(false);

    await expect(rouvrirExercice(db, exerciceId, '  ')).rejects.toThrow(/motif/);
    await rouvrirExercice(db, exerciceId, 'Facture fournisseur oubliée');
    expect((await db.exercices.get(exerciceId))?.statut).toBe('ouvert');
    const actions = (await db.interventions.toArray()).map((i) => i.action);
    expect(actions).toEqual(['taux_confirme', 'taux_cloture', 'arrete', 'reouverture']);
  });

  it("garde l'opération d'origine intacte quand l'expert corrige un taux", async () => {
    await confirmerTaux(db, exerciceId, usdOp, 2850);
    expect((await db.operations.get(usdOp))?.taux).toBe(2800);
    const { dossier } = await chargerDossier(db, exerciceId);
    expect(dossier.confirmationsTaux).toEqual([{ operation: usdOp, taux: 2850 }]);
  });

  it("trace le taux du jour saisi par l'assistant", async () => {
    await saisirTaux(db, '2026-10-29', 2850);
    expect((await db.taux.toArray())[0]).toMatchObject({ valeur: 2850, source: 'assistant' });
    expect((await db.interventions.toArray())[0]).toMatchObject({ role: 'assistant', action: 'taux_saisi' });
  });
});
