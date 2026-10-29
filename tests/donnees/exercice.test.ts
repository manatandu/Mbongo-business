import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { BaseMbongo } from '../../src/donnees/base';
import { arreterEtats, definirTauxCloture, obstaclesArrete } from '../../src/donnees/bureau';
import { chargerDemo } from '../../src/donnees/demo';
import { chargerDossier } from '../../src/donnees/dossier';
import { creerEntreprise, exerciceCourant } from '../../src/donnees/entreprise';
import { obstaclesAnneeSuivante, ouvrirExerciceSuivant, tauxClotureDemande } from '../../src/donnees/exercice';
import { enregistrerFacture, enregistrerInventaire, enregistrerOperation, validerInventaire } from '../../src/donnees/saisie';
import { calculerEtats } from '../../src/moteur';

let db: BaseMbongo;
let entrepriseId: string;
let exerciceId: string;
let caisse: string;
let dollars: string;

beforeEach(async () => {
  db = new BaseMbongo(`exercice-${Math.random()}`);
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
    tauxOuverture: 2800,
  });
  ({ entrepriseId, exerciceId } = r);
  [caisse = '', dollars = ''] = (await db.comptes.where('entrepriseId').equals(entrepriseId).sortBy('ordre')).map((c) => c.id);
  const op = (date: string, compte: string, montant: number, devise: 'CDF' | 'USD', taux: number | null) =>
    enregistrerOperation(db, exerciceId, { date, type: 'recette', compte, nature: 'ventes', libelle: 'Ventes', montant, devise, taux, piece: true });
  await op('2026-03-02', caisse, 400_000, 'CDF', null);
  await op('2026-11-15', dollars, 20_000, 'USD', 2850); // 200 $
  await enregistrerFacture(db, exerciceId, 'creance', { date: '2026-12-20', facture: 'F-1', nom: 'Client fictif', nature: 'ventes', montant: 150_000, devise: 'CDF', taux: null });
  await enregistrerInventaire(db, exerciceId, [{ reference: 'L1', designation: 'Riz', quantite: 12, prixUnitaire: 50_000, montant: 600_000 }]);
});

/** Compte exploitant d'ouverture de N+1 et compte exploitant N + résultat N. */
async function continuite(suivantId: string) {
  const n = calculerEtats((await chargerDossier(db, exerciceId)).dossier);
  const n1 = calculerEtats((await chargerDossier(db, suivantId)).dossier, { auDate: '2027-01-01' });
  return { attendu: n.bilan.passif.compteExploitant + n.bilan.passif.resultat, obtenu: n1.bilan.passif.compteExploitant, actif: n1.bilan.actif.total, passif: n1.bilan.passif.total };
}

describe("passage à l'année suivante", () => {
  it("attend la fin de l'année et l'inventaire", async () => {
    const c = await chargerDossier(db, exerciceId);
    expect(obstaclesAnneeSuivante(c, '2026-12-31')).toHaveLength(2);
    await expect(ouvrirExerciceSuivant(db, c, '2027-01-02', 2900)).rejects.toThrow(/inventaire/);
  });

  it('demande le prix du dollar au 31 décembre quand il y a des dollars', async () => {
    await validerInventaire(db, exerciceId);
    const c = await chargerDossier(db, exerciceId);
    expect(tauxClotureDemande(c)).toBe(true);
    await expect(ouvrirExerciceSuivant(db, c, '2027-01-02')).rejects.toThrow(/prix du dollar au 31 décembre/);
  });

  it('ouvre N+1 sur la clôture de N, au franc près, une seule fois', async () => {
    await validerInventaire(db, exerciceId);
    const id = await ouvrirExerciceSuivant(db, await chargerDossier(db, exerciceId), '2027-01-02', 2900);
    expect((await exerciceCourant(db, entrepriseId, 2027))?.id).toBe(id);

    const n1 = await chargerDossier(db, id);
    expect(n1.dossier.stockInitial).toBe(600_000);
    expect(n1.dossier.soldesOuverture).toEqual({ [caisse]: 1_400_000, [dollars]: 20_000 });
    expect(n1.dossier.creances.map((x) => x.facture)).toEqual(['F-1']);
    const r = await continuite(id);
    expect(r.obtenu).toBe(r.attendu);
    expect(r.actif).toBe(r.passif);

    await expect(ouvrirExerciceSuivant(db, await chargerDossier(db, exerciceId), '2027-01-03', 2900)).rejects.toThrow(/déjà commencée/);
  });

  it("suit le taux corrigé par l'expert après l'ouverture de N+1", async () => {
    await validerInventaire(db, exerciceId);
    const id = await ouvrirExerciceSuivant(db, await chargerDossier(db, exerciceId), '2027-01-02', 2900);
    await definirTauxCloture(db, exerciceId, 3000);
    expect((await chargerDossier(db, id)).dossier.tauxOuverture).toBe(3000);
    const r = await continuite(id);
    expect(r.obtenu).toBe(r.attendu);
  });

  it('accepte les ventes de janvier sur la nouvelle année', async () => {
    await validerInventaire(db, exerciceId);
    const id = await ouvrirExerciceSuivant(db, await chargerDossier(db, exerciceId), '2027-01-02', 2900);
    await enregistrerOperation(db, id, { date: '2027-01-02', type: 'recette', compte: caisse, nature: 'ventes', libelle: 'Ventes', montant: 80_000, devise: 'CDF', taux: null, piece: true });
    const e = calculerEtats((await chargerDossier(db, id)).dossier, { auDate: '2027-01-02' });
    expect(e.compteDeResultat.recettesVentes).toBe(80_000);
    expect(e.bilan.actif.total).toBe(e.bilan.passif.total);
  });
});

describe("démonstration de fin d'année", () => {
  it("mène de l'inventaire à l'arrêté, puis à l'année suivante", async () => {
    const base = new BaseMbongo(`demo-fin-${Math.random()}`);
    const id = await chargerDemo(base, '2027-06-15', true);
    const n = await exerciceCourant(base, id, 2027);
    expect(n?.annee).toBe(2026);
    expect(await base.inventaires.where('exerciceId').equals(n?.id ?? '').count()).toBe(7);

    await validerInventaire(base, n?.id ?? '');
    let c = await chargerDossier(base, n?.id ?? '');
    expect(c.exercice.stockFinal).toBe(7_416_000);
    const suivant = await ouvrirExerciceSuivant(base, c, '2027-06-15', 2850);

    c = await chargerDossier(base, n?.id ?? '');
    expect(obstaclesArrete(c, '2027-06-15')).toEqual([]);
    await arreterEtats(base, c, '2027-06-15');
    expect((await base.exercices.get(n?.id ?? ''))?.statut).toBe('arrete');

    const e = calculerEtats((await chargerDossier(base, suivant)).dossier, { auDate: '2027-01-01' });
    const en = calculerEtats(c.dossier);
    expect(e.bilan.passif.compteExploitant).toBe(en.bilan.passif.compteExploitant + en.bilan.passif.resultat);
  });
});

describe('vente à crédit', () => {
  it('garde le type de client et son adresse', async () => {
    await enregistrerFacture(db, exerciceId, 'creance', { date: '2026-05-02', facture: 'F-2', nom: 'Restaurant fictif', nature: 'ventes', montant: 90_000, devise: 'CDF', taux: null, client: 'commercant', adresse: 'Avenue fictive, Gombe' });
    const f = (await chargerDossier(db, exerciceId)).dossier.creances.find((x) => x.facture === 'F-2');
    expect(f).toMatchObject({ client: 'commercant', adresse: 'Avenue fictive, Gombe' });
  });
});
