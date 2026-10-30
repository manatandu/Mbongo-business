import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { BaseMbongo } from '../../src/donnees/base';
import { creerEntreprise } from '../../src/donnees/entreprise';
import { chargerDossier } from '../../src/donnees/dossier';
import { enAttente, envoyer, identifiantTiers, liaison, normaliserNom, relier } from '../../src/donnees/envoi';
import { enregistrerFacture, enregistrerOperation, enregistrerReglement } from '../../src/donnees/saisie';

let db: BaseMbongo;
let ent: string;
let exerciceId: string;
let appels: { fonction: string; corps: { p_lignes?: { type: string; contenu: Record<string, unknown> }[]; p_code?: string } }[];
let reseau: boolean;

/** Serveur simulé : répond comme Supabase. */
const faux = (async (url: string, init: { body: string }) => {
  if (!reseau) throw new TypeError('Failed to fetch');
  const fonction = String(url).split('/').pop()!;
  const corps = JSON.parse(init.body);
  appels.push({ fonction, corps });
  if (fonction === 'lier_appareil')
    return corps.p_code === 'KX7P29QD'
      ? new Response(JSON.stringify({ jeton: 'j'.repeat(64), client: 'Boutique (fictif)' }), { status: 200 })
      : new Response(JSON.stringify({ message: 'Code inconnu. Vérifiez-le auprès de TRK Consulting.' }), { status: 400 });
  return new Response(JSON.stringify(corps.p_lignes.length), { status: 200 });
}) as unknown as typeof fetch;

beforeEach(async () => {
  db = new BaseMbongo(`envoi-${Math.random()}`);
  appels = [];
  reseau = true;
  const r = await creerEntreprise(db, {
    nom: 'Boutique (fictif)', activite: '', secteur: 'negoce', commune: '', nif: '', responsable: '', telephone: '', annee: 2026,
    comptes: [{ type: 'caisse', libelle: 'Caisse', devise: 'CDF', solde: 100_000 }], stockInitial: 0, tauxOuverture: null,
  });
  ent = r.entrepriseId;
  exerciceId = r.exerciceId;
});

async function vente(montant: number) {
  const { comptes } = await chargerDossier(db, exerciceId);
  await enregistrerOperation(db, exerciceId, { date: '2026-03-01', type: 'recette', compte: comptes[0]!.id, nature: 'ventes', libelle: 'Vente', montant, devise: 'CDF', taux: null, piece: true });
}

describe('envoi des saisies à TRK', () => {
  it("n'envoie rien tant que le téléphone n'est pas relié", async () => {
    await vente(5_000);
    expect(await envoyer(db, ent, faux)).toBeNull();
    expect(appels).toHaveLength(0);
  });

  it('refuse un code faux, accepte le bon (tiret et minuscules permis)', async () => {
    await expect(relier(db, ent, 'ABCD-EFGH', faux)).rejects.toThrow('Code inconnu');
    await expect(relier(db, ent, 'ABC', faux)).rejects.toThrow('huit caractères');
    const l = await relier(db, ent, 'kx7p-29qd', faux);
    expect(l.client).toBe('Boutique (fictif)');
    expect((await liaison(db, ent))?.jeton).toHaveLength(64);
  });

  it("envoie une fois chaque saisie, et les fiches seulement quand elles changent", async () => {
    await relier(db, ent, 'KX7P29QD', faux);
    await vente(5_000);
    expect(await enAttente(db, ent)).toBe(1);
    const n = await envoyer(db, ent, faux);
    const types = appels.at(-1)!.corps.p_lignes!.map((l) => l.type);
    expect(types).toEqual(['entreprise', 'exercice', 'compte', 'operation']);
    expect(n).toBe(4);
    expect(await enAttente(db, ent)).toBe(0);

    // Rien de neuf : aucun appel.
    const avant = appels.length;
    expect(await envoyer(db, ent, faux)).toBe(0);
    expect(appels).toHaveLength(avant);

    await vente(7_000);
    await envoyer(db, ent, faux);
    expect(appels.at(-1)!.corps.p_lignes!.map((l) => l.type)).toEqual(['operation']);
  });

  it('sans réseau, rien ne se perd', async () => {
    await relier(db, ent, 'KX7P29QD', faux);
    await vente(5_000);
    reseau = false;
    await expect(envoyer(db, ent, faux)).rejects.toThrow('Pas de réseau');
    expect(await enAttente(db, ent)).toBe(1);
    reseau = true;
    await envoyer(db, ent, faux);
    expect(await enAttente(db, ent)).toBe(0);
  });

  it("n'envoie ni le nom ni l'adresse des clients et fournisseurs du commerçant", async () => {
    await relier(db, ent, 'KX7P29QD', faux);
    const { comptes } = await chargerDossier(db, exerciceId);
    const f = { date: '2026-03-02', facture: 'F12', nature: 'ventes', montant: 20_000, devise: 'CDF', taux: null } as const;
    const creance = await enregistrerFacture(db, exerciceId, 'creance', { ...f, nom: 'Mama Nzingá', client: 'particulier', adresse: '12, av. Kasa-Vubu, Kalamu' });
    await enregistrerFacture(db, exerciceId, 'creance', { ...f, facture: 'F13', nom: ' mama  NZINGA ', client: 'particulier' });
    await enregistrerFacture(db, exerciceId, 'dette', { ...f, facture: 'A7', nature: 'achats_marchandises', nom: 'Dépôt Lukusa' });
    await enregistrerReglement(db, exerciceId, 'creance', creance, { date: '2026-03-05', compte: comptes[0]!.id, montant: 5_000 });
    await envoyer(db, ent, faux);

    const lignes = appels.at(-1)!.corps.p_lignes!;
    const texte = JSON.stringify(lignes);
    for (const fuite of ['Nzing', 'NZING', 'Kasa-Vubu', 'Kalamu', 'Lukusa', 'adresse']) expect(texte).not.toContain(fuite);

    const tiers = lignes.filter((l) => l.type === 'tiers').map((l) => l.contenu);
    expect(tiers).toHaveLength(3);
    for (const t of tiers) expect(t.nom).toMatch(/^tiers-[0-9a-f]{12}$/);
    // Même client écrit autrement : même identifiant. Autre fournisseur : autre identifiant.
    expect(tiers[0]!.nom).toBe(tiers[1]!.nom);
    expect(tiers[2]!.nom).not.toBe(tiers[0]!.nom);
    // Le reste de la ligne part intact.
    expect(tiers[0]).toMatchObject({ id: creance, facture: 'F12', montant: 20_000, client: 'particulier', genre: 'creance' });

    // L'encaissement reprend l'identifiant dans son libellé, à la place du nom.
    const reglement = lignes.find((l) => l.type === 'operation' && l.contenu.reglementDe)!.contenu;
    expect(reglement.libelle).toBe(`Encaissement facture F12, ${tiers[0]!.nom}`);

    // Sur le téléphone, rien ne change.
    expect((await db.tiers.get(creance))?.nom).toBe('Mama Nzingá');
    expect((await db.tiers.get(creance))?.adresse).toBe('12, av. Kasa-Vubu, Kalamu');
  });

  it("l'identifiant est stable, salé et non réversible", async () => {
    expect(normaliserNom('  Mama   Nzingá ')).toBe('mama nzinga');
    const a = await identifiantTiers('sel-1', 'Mama Nzinga');
    expect(a).toBe(await identifiantTiers('sel-1', 'MAMA NZINGA'));
    expect(a).not.toBe(await identifiantTiers('sel-2', 'Mama Nzinga'));
    expect(a).not.toContain('nzinga');
    expect(await identifiantTiers('sel-1', '   ')).toBe('');
  });
});
