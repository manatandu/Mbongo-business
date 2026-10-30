import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { BaseMbongo } from '../../src/donnees/base';
import { faireCopie, reprendreCopie } from '../../src/donnees/copie';
import { chargerDossier } from '../../src/donnees/dossier';
import { chargerDemo } from '../../src/donnees/demo';
import { entrepriseActive } from '../../src/donnees/entreprise';
import { creerArticle } from '../../src/donnees/stock';
import { calculerEtats } from '../../src/moteur';

describe('copie de sauvegarde', () => {
  it('un autre téléphone retrouve les mêmes états, et une seconde reprise n’ajoute rien', async () => {
    const a = new BaseMbongo(`copie-a-${Math.random()}`);
    const entrepriseId = await chargerDemo(a, '2026-10-30');
    const exerciceId = (await a.exercices.where('entrepriseId').equals(entrepriseId).first())!.id;
    await creerArticle(a, entrepriseId, { designation: 'Riz', unite: 'sac', quantite: 5, prixUnitaire: 30_000, date: '2026-01-01' });
    const texte = JSON.stringify(await faireCopie(a, entrepriseId));

    const b = new BaseMbongo(`copie-b-${Math.random()}`);
    expect(await reprendreCopie(b, texte)).toBeGreaterThan(10);
    expect((await entrepriseActive(b))?.id).toBe(entrepriseId);
    const etatsA = calculerEtats((await chargerDossier(a, exerciceId)).dossier);
    const etatsB = calculerEtats((await chargerDossier(b, exerciceId)).dossier);
    expect(etatsB).toEqual(etatsA);
    expect(await b.mouvementsStock.count()).toBe(1);
    expect(await reprendreCopie(b, texte)).toBe(0);
  });

  it('refuse un fichier qui n’est pas une copie', async () => {
    const b = new BaseMbongo(`copie-c-${Math.random()}`);
    await expect(reprendreCopie(b, '{"a":1}')).rejects.toThrow('pas une copie');
    await expect(reprendreCopie(b, 'bonjour')).rejects.toThrow('pas une copie');
  });
});
