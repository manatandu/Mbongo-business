import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { BaseMbongo } from '../../src/donnees/base';
import { annulerArrete, arreterEtats, definirTauxCloture, obstaclesArrete, resumeDossier } from '../../src/donnees/bureau';
import { chargerDossier } from '../../src/donnees/dossier';
import { creerEntreprise } from '../../src/donnees/entreprise';
import { enregistrerInventaire, enregistrerOperation, validerInventaire } from '../../src/donnees/saisie';

let db: BaseMbongo;
let exerciceId: string;
let caisse: string;

beforeEach(async () => {
  db = new BaseMbongo(`bureau-${Math.random()}`);
  const r = await creerEntreprise(db, {
    nom: 'Boutique de test (fictif)',
    activite: '',
    secteur: 'negoce',
    commune: 'Kinshasa',
    nif: '',
    responsable: '',
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
  caisse = (await db.comptes.where('entrepriseId').equals(r.entrepriseId).sortBy('ordre'))[0]?.id ?? '';
  await enregistrerOperation(db, exerciceId, { date: '2026-03-02', type: 'recette', compte: caisse, nature: 'ventes', libelle: 'Ventes', montant: 400_000, devise: 'CDF', taux: null, piece: true });
});

describe('arrêté des états', () => {
  it("dit ce qui manque en cours d'année", async () => {
    const c = await chargerDossier(db, exerciceId);
    expect(obstaclesArrete(c, '2026-10-29')).toHaveLength(3);
    await expect(arreterEtats(db, c, '2026-10-29')).rejects.toThrow(/31\/12\/2026/);
  });

  it('arrête, bloque la saisie, puis se rouvre', async () => {
    await definirTauxCloture(db, exerciceId, 2900);
    await enregistrerInventaire(db, exerciceId, [{ reference: 'L1', designation: 'Riz', quantite: 10, prixUnitaire: 50_000, montant: 500_000 }]);
    await validerInventaire(db, exerciceId);
    const c = await chargerDossier(db, exerciceId);
    expect(obstaclesArrete(c, '2027-01-10')).toEqual([]);

    await arreterEtats(db, c, '2027-01-10');
    expect(await db.exercices.get(exerciceId)).toMatchObject({ statut: 'arrete', arreteLe: '2027-01-10' });
    await expect(
      enregistrerOperation(db, exerciceId, { date: '2026-12-30', type: 'recette', compte: caisse, nature: 'ventes', libelle: 'Oubli', montant: 1, devise: 'CDF', taux: null, piece: true }),
    ).rejects.toThrow(/arrêtés par l'expert-comptable/);
    await expect(definirTauxCloture(db, exerciceId, 3000)).rejects.toThrow(/arrêtés/);

    await annulerArrete(db, exerciceId);
    expect(await db.exercices.get(exerciceId)).toMatchObject({ statut: 'ouvert', arreteLe: null });
  });
});

describe('liste des clients', () => {
  it('alerte quand les ventes approchent le seuil du SMT', async () => {
    expect(resumeDossier(await chargerDossier(db, exerciceId), '2026-10-29').anomalies.map((a) => a.code)).not.toContain('seuil_smt_approche');
    // Négoce : 60 M FCFA, soit 300 M FC ; alerte à 80 %.
    await enregistrerOperation(db, exerciceId, { date: '2026-06-01', type: 'recette', compte: caisse, nature: 'ventes', libelle: 'Ventes', montant: 250_000_000, devise: 'CDF', taux: null, piece: true });
    const r = resumeDossier(await chargerDossier(db, exerciceId), '2026-10-29');
    expect(r.anomalies.map((a) => a.code)).toContain('seuil_smt_approche');
    expect(r.aRevoir).toBeGreaterThan(0);
  });
});
