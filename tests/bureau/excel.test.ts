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

  it("contient un bilan équilibré et la mention fixe sur chaque feuille", () => {
    expect(valeurs(1).filter((x) => x === 31_003_500)).toHaveLength(2);
    for (let i = 0; i < 3; i++) expect(valeurs(i)).toContain('Mbongo prépare, il ne certifie pas.');
  });

  it('produit un vrai fichier .xlsx', async () => {
    const tampon = await writeExcelFile(classeurEtats(e)).toBuffer();
    expect(tampon.length).toBeGreaterThan(3_000);
    expect(tampon.subarray(0, 2).toString()).toBe('PK');
    expect(nomFichier(e)).toBe('Etats-SMT-Alimentation-Maman-Nsimba-fictif-2026.xlsx');
  });
});
