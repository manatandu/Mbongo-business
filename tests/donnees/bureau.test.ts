import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { BaseMbongo } from '../../src/donnees/base';
import { annulerArrete, arreterEtats, bilanOuverture, definirTauxCloture, enregistrerIdentiteExpert, formuleArrete, lireIdentiteExpert, lireTraceArrete, obstaclesArrete, resumeDossier } from '../../src/donnees/bureau';
import { calculerEtats } from '../../src/moteur';
import { chargerDossier } from '../../src/donnees/dossier';
import { creerEntreprise } from '../../src/donnees/entreprise';
import { enregistrerInventaire, enregistrerOperation, ErreurSaisie, validerInventaire } from '../../src/donnees/saisie';

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

    await expect(arreterEtats(db, c, '2027-01-10', { nom: ' ', onec: '' })).rejects.toThrow(ErreurSaisie);
    await arreterEtats(db, c, '2027-01-10', { nom: ' Jean Fictif ', onec: 'ONEC-0000' });
    expect(await db.exercices.get(exerciceId)).toMatchObject({ statut: 'arrete', arreteLe: '2027-01-10' });
    expect((await lireTraceArrete(db, exerciceId)).arrete).toEqual({ arreteLe: '2027-01-10', expert: { nom: 'Jean Fictif', onec: 'ONEC-0000' } });
    await expect(
      enregistrerOperation(db, exerciceId, { date: '2026-12-30', type: 'recette', compte: caisse, nature: 'ventes', libelle: 'Oubli', montant: 1, devise: 'CDF', taux: null, piece: true }),
    ).rejects.toThrow(/arrêtés par l'expert-comptable/);
    await expect(definirTauxCloture(db, exerciceId, 3000)).rejects.toThrow(/arrêtés/);

    await annulerArrete(db, exerciceId, '2027-02-03');
    expect(await db.exercices.get(exerciceId)).toMatchObject({ statut: 'ouvert', arreteLe: null });
    // L'arrêté annulé reste dans la trace, avec la date de l'annulation.
    expect(await lireTraceArrete(db, exerciceId)).toEqual({ arrete: null, annules: [{ arreteLe: '2027-01-10', expert: { nom: 'Jean Fictif', onec: 'ONEC-0000' }, annuleLe: '2027-02-03' }] });

    // Nouvel arrêté sans identité passée : celle enregistrée au bureau est reprise.
    await enregistrerIdentiteExpert(db, { nom: 'Marie Fictive', onec: 'ONEC-1111' });
    expect(await lireIdentiteExpert(db)).toEqual({ nom: 'Marie Fictive', onec: 'ONEC-1111' });
    await arreterEtats(db, await chargerDossier(db, exerciceId), '2027-02-10');
    const t = await lireTraceArrete(db, exerciceId);
    expect(t.arrete?.expert?.nom).toBe('Marie Fictive');
    expect(t.annules).toHaveLength(1);
  });

  it("écrit la formule de l'arrêté au nom du responsable de l'entité", () => {
    expect(formuleArrete('2027-03-15', { nom: 'Jean Fictif', onec: '123' })).toBe(
      "Arrêtés le 15/03/2027 par le responsable de l'entité, après revue de l'expert-comptable partenaire Jean Fictif, n° d'inscription ONEC 123",
    );
    expect(formuleArrete('2027-03-15', null)).not.toMatch(/par l'expert-comptable/);
  });
});

describe("bilan d'ouverture (colonne N-1 la première année)", () => {
  it("reprend les soldes d'ouverture et s'équilibre", async () => {
    const c = await chargerDossier(db, exerciceId);
    const e = calculerEtats(c.dossier, { auDate: '2026-10-29' });
    const o = bilanOuverture(c.dossier, e);
    expect(o).not.toBeNull();
    expect(o?.actif).toMatchObject({ caisse: 1_000_000, stocks: 500_000, banque: 0, creances: 0, immobilisations: 0, total: 1_500_000 });
    expect(o?.passif).toMatchObject({ compteExploitant: 1_500_000, resultat: 0, total: 1_500_000 });
    expect(o?.equilibre).toBe(true);
  });
});

describe('liste des clients', () => {
  it('alerte quand les ventes approchent le seuil du SMT', async () => {
    expect(resumeDossier(await chargerDossier(db, exerciceId), '2026-10-29').anomalies.map((a) => a.code)).not.toContain('seuil_smt_approche');
    // Négoce : seuil de 240 M CDF, alerte à 80 %, soit 192 M CDF.
    await enregistrerOperation(db, exerciceId, { date: '2026-06-01', type: 'recette', compte: caisse, nature: 'ventes', libelle: 'Ventes', montant: 200_000_000, devise: 'CDF', taux: null, piece: true });
    const r = resumeDossier(await chargerDossier(db, exerciceId), '2026-10-29');
    expect(r.anomalies.map((a) => a.code)).toContain('seuil_smt_approche');
    expect(r.aRevoir).toBeGreaterThan(0);
  });
});
