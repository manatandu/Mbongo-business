import { describe, expect, it } from 'vitest';
import writeExcelFile from 'write-excel-file/node';
import { calculerEtats } from '../../src/moteur';
import { classeurEtats, nomFichier } from '../../src/bureau/excel';
import { jeuPrototype } from '../moteur/jeu-prototype';

const e = calculerEtats(jeuPrototype());
const valeurs = (feuille: number) => (classeurEtats(e)[feuille]?.data ?? []).flat().map((c) => (c && typeof c === 'object' && 'value' in c ? c.value : c));

describe('export Excel des états', () => {
  it('contient le compte de résultat avec ses montants en nombres', () => {
    const v = valeurs(0);
    expect(v).toContain('Résultat exercice (G = C − D + E − F)');
    expect(v).toContain(93_502_000);
    expect(v).toContain(21_961_500);
  });

  it('contient un bilan équilibré', () => {
    expect(valeurs(1).filter((x) => x === 31_003_500)).toHaveLength(2);
  });

  it('produit un vrai fichier .xlsx', async () => {
    const tampon = await writeExcelFile(classeurEtats(e)).toBuffer();
    expect(tampon.length).toBeGreaterThan(3_000);
    expect(tampon.subarray(0, 2).toString()).toBe('PK');
    expect(nomFichier(e)).toBe('Etats-SMT-Alimentation-Maman-Nsimba-fictif-2026.xlsx');
  });
});

describe('export Excel avec le livre et le registre des achats', () => {
  const d = jeuPrototype();
  const feuilles = classeurEtats(e, d);
  const texte = (i: number) => (feuilles[i]?.data ?? []).flat().map((c) => (c && typeof c === 'object' && 'value' in c ? c.value : c));

  it('ajoute le livre et le registre des achats quand le dossier est fourni', () => {
    expect(feuilles.map((f) => f.sheet)).toEqual(['Compte de résultat', 'Bilan', 'Notes', 'Livre', 'Registre des achats']);
    expect(texte(3)).toContain('Recettes en espèces');
    expect(texte(4)).toContain('Récapitulation');
  });

  it('produit toujours un vrai fichier .xlsx', async () => {
    const tampon = await writeExcelFile(feuilles).toBuffer();
    expect(tampon.subarray(0, 2).toString()).toBe('PK');
  });
});
