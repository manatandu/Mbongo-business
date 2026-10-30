import { describe, expect, it } from 'vitest';
import writeExcelFile from 'write-excel-file/node';
import { calculerEtats } from '../../src/moteur';
import { classeurEtats, nomFichier, type FeuilleEtats } from '../../src/bureau/excel';
import { dureeMois } from '../../src/bureau/entete';
import { journalBureau, suiviTiers } from '../../src/bureau/journaux';
import { bilanOuverture } from '../../src/donnees/bureau';
import { jeuPrototype } from '../moteur/jeu-prototype';
import { dossierDeBase, op } from '../moteur/outils';

const e = calculerEtats(jeuPrototype());
const plat = (f: FeuilleEtats | undefined) => (f?.data ?? []).flat().map((c) => (c && typeof c === 'object' && 'value' in c ? c.value : c));
const valeurs = (feuille: number) => plat(classeurEtats(e)[feuille]);
/** Les lignes d'une feuille, chaque cellule réduite à sa valeur. */
const lignes = (f: FeuilleEtats | undefined) => (f?.data ?? []).map((l) => l.map((c) => (c && typeof c === 'object' && 'value' in c ? c.value : c)));

describe('export Excel des états', () => {
  it('contient le compte de résultat avec ses montants en nombres', () => {
    const v = valeurs(0);
    expect(v).toContain('Résultat exercice (G = C − D + E − F)');
    expect(v).toContain(93_502_000);
    expect(v).toContain(21_961_500);
  });

  it('porte le statut des états, et la mention fictive pour la démonstration', () => {
    expect(valeurs(0)).toContain('Non arrêtés');
    const arretes = plat(classeurEtats(e, undefined, undefined, null, { arreteLe: '2027-03-15', fictif: true, expert: { nom: 'Jean Fictif', onec: 'ONEC-0000' } })[1]);
    expect(arretes).toContain("Arrêtés le 15/03/2027 par le responsable de l'entité, après revue de l'expert-comptable partenaire Jean Fictif, n° d'inscription ONEC ONEC-0000");
    expect(arretes).toContain('Données fictives de démonstration');
    expect(arretes.some((x) => typeof x === 'string' && /par l'expert-comptable$/.test(x))).toBe(false);
  });

  it("porte l'en-tête du modèle : entité, n° d'identification, exercice, durée calculée, statut, date d'édition", () => {
    const f = classeurEtats(e, undefined, undefined, null, { editeLe: '2026-10-30' })[1];
    const l = lignes(f);
    expect(l).toContainEqual(['Entité', 'Alimentation Maman Nsimba (fictif)']);
    expect(l.find((x) => x[0] === "N° d'identification")).toBeDefined();
    expect(l).toContainEqual(['Exercice', 'du 01/01/2026 au 31/12/2026']);
    expect(l).toContainEqual(['Durée', '12 mois']);
    expect(l).toContainEqual(['Statut', 'Non arrêtés']);
    expect(l).toContainEqual(['Édité le', '30/10/2026']);
    expect(dureeMois('2026-03-15', '2026-12-31')).toBe(10);
  });

  it('nomme la ligne Banque comme le modèle du Titre X', () => {
    expect(valeurs(1)).toContain('Banque (en + ou en −)');
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

describe('notes 1 et 2 dans le classeur', () => {
  const notes = lignes(classeurEtats(e)[2]);
  it('note 1 : en-tête du modèle et total', () => {
    expect(notes).toContainEqual(['Note 1 · Tableau SMT de suivi du matériel, du mobilier et des cautions']);
    expect(notes).toContainEqual(['Date', 'Désignation', 'Montant', 'Dotation', 'Valeur nette', 'Date de sortie', 'Prix de cession']);
    expect(notes.find((l) => l[0] === 'Total')?.[2]).toBe(e.notes.note1.totalMontant);
  });
  it("note 2 : ligne d'en-tête Référence, Désignation, Quantité, Prix unitaire, Montant", () => {
    expect(notes).toContainEqual(['Référence', 'Désignation', 'Quantité', 'Prix unitaire', 'Montant']);
    expect(notes.find((l) => l[0] === 'Valeur du stock final')?.[4]).toBe(e.notes.note2.stockFinal);
  });
  it('note 3 : colonne Date quand le dossier est fourni', () => {
    const avecDossier = lignes(classeurEtats(e, jeuPrototype())[2]);
    expect(avecDossier).toContainEqual(['Date', 'Nom du client ou du fournisseur', 'Montant au 31 décembre', 'Montant au 1er janvier', 'Variation']);
    const premiere = e.notes.note3.creances.lignes[0];
    if (premiere) expect(avecDossier.find((l) => l[1] === premiere.nom)?.[0]).toMatch(/^\d\d\/\d\d\/\d{4}$/);
  });
});

describe('export Excel avec les journaux, le livre et le registre des achats', () => {
  const d = jeuPrototype();
  const feuilles = classeurEtats(e, d);
  const nom = (n: string) => feuilles.find((f) => f.sheet === n);

  it('ajoute un journal par compte, les journaux de suivi, le livre et le registre des achats', () => {
    expect(feuilles.map((f) => f.sheet)).toEqual(['Compte de résultat', 'Bilan', 'Notes', 'Journal Caisse', 'Journal M-Pesa', 'Journal Orange Money', 'Journal Banque', 'Suivi des créances', 'Suivi des dettes', 'Livre', 'Registre des achats']);
    expect(plat(nom('Livre'))).toContain('Recettes en espèces');
    expect(plat(nom('Registre des achats'))).toContain('Récapitulation');
  });

  it('journal : tracé de la note 4, tous les mois, report à nouveau et solde à reporter justes', () => {
    const j = lignes(nom('Journal Caisse'));
    expect(j).toContainEqual(expect.arrayContaining(['Date', 'Libellés', 'N° pièce', 'Recettes (CDF)', 'Dépenses (CDF)', 'Solde (CDF)', 'Ventes', 'Autres', 'Matériel et mobilier', 'Achats marchandises', 'Achats matières et fournitures', 'Loyers', 'Salaires', 'Impôts et taxes']));
    expect(j.filter((l) => typeof l[0] === 'string' && l[0].startsWith('Mois de '))).toHaveLength(12);
    const janvier = journalBureau(d, 'caisse', '2026-01');
    const reports = j.filter((l) => l[1] === 'Report à nouveau');
    expect(reports[0]?.[5]).toBe(janvier.reportANouveau);
    expect(j.filter((l) => l[1] === 'Solde à reporter')[0]?.[5]).toBe(janvier.soldeAReporter);
    // Le solde à reporter d'un mois est le report du mois suivant.
    expect(reports[1]?.[5]).toBe(janvier.soldeAReporter);
  });

  it('journal : la ventilation de chaque ligne retombe sur ses recettes et ses dépenses', () => {
    for (const mois of ['2026-01', '2026-05', '2026-08']) {
      const j = journalBureau(d, 'caisse', mois);
      const r = Object.values(j.ventilation.recettes).reduce((s, v) => s + v, 0);
      const dep = Object.values(j.ventilation.depenses).reduce((s, v) => s + v, 0);
      expect(r).toBe(j.totalRecettes);
      expect(dep).toBe(j.totalDepenses);
      expect(j.lignes.filter((l) => l.cote === 'recette').reduce((s, l) => s + l.recette, 0)).toBe(j.totalRecettes);
    }
  });

  it('journaux de suivi : toutes les factures, soldées comprises, avec la date de paiement', () => {
    const s = suiviTiers(d, 'creance', d.exercice.fin);
    expect(s.length).toBe(d.creances.length);
    const soldee = s.find((x) => x.soldee);
    expect(soldee?.dernierReglement).not.toBeNull();
    const f = lignes(nom('Suivi des créances'));
    expect(f).toContainEqual(['Date', 'N° facture', 'Nom du client', 'Montant', 'Réglé', 'Reste', 'Devise', 'Date de paiement']);
    expect(f.filter((l) => d.creances.some((c) => c.facture === l[1]))).toHaveLength(d.creances.length);
    expect(lignes(nom('Suivi des dettes'))).toContainEqual(['Date', 'N° facture', 'Nom du fournisseur', 'Montant', 'Réglé', 'Reste', 'Devise', 'Date de paiement']);
  });

  it('produit toujours un vrai fichier .xlsx', async () => {
    const tampon = await writeExcelFile(feuilles).toBuffer();
    expect(tampon.subarray(0, 2).toString()).toBe('PK');
  });
});

describe('compte en dollars et première année', () => {
  const d = dossierDeBase({
    comptes: [
      { id: 'caisse', type: 'caisse', libelle: 'Caisse', devise: 'CDF' },
      { id: 'usd', type: 'caisse', libelle: 'Caisse dollars', devise: 'USD' },
    ],
    soldesOuverture: { caisse: 1_000_000, usd: 0 },
    operations: [
      op({ date: '2026-03-02', type: 'recette', compte: 'usd', nature: 'ventes', montant: 10_000, devise: 'USD', taux: 2_800, reference: 'R-12' }),
      op({ date: '2026-03-09', type: 'depense', compte: 'usd', nature: 'loyers', montant: 2_500, devise: 'USD', taux: 2_850 }),
    ],
  });

  it('journal en dollars : contre-valeur en francs de chaque ligne et du solde (AUDCIF, art. 17.1)', () => {
    const j = journalBureau(d, 'usd', '2026-03');
    expect(j.lignes.map((l) => l.fc)).toEqual([280_000, -71_250]);
    expect(j.lignes[0]?.reference).toBe('R-12');
    expect(j.soldeFC).toBe(208_750);
    const f = lignes(classeurEtats(calculerEtats(d), d).find((x) => x.sheet === 'Journal Caisse dollars'));
    expect(f).toContainEqual(expect.arrayContaining(['Contre-valeur (CDF)']));
    expect(f.find((l) => l[1] === 'Opération de test' && l[2] === 'R-12')?.[3]).toBe(100);
  });

  it("bilan N-1 : bilan d'ouverture la première année, compte de résultat N-1 non disponible", () => {
    const et = calculerEtats(d);
    const ouverture = bilanOuverture(d, et);
    const f = classeurEtats(et, d, undefined, null, { ouverture });
    const bilan = lignes(f[1]);
    expect(bilan.find((l) => l[0] === 'Caisse')?.[3]).toBe(1_000_000);
    expect(bilan.find((l) => l[0] === 'Total actif')?.[3]).toBe(1_500_000);
    expect(bilan.find((l) => l[0] === 'Total passif')?.[3]).toBe(1_500_000);
    expect(plat(f[0])).toContain('Colonne 2025 non disponible : première année tenue dans Mbongo.');
  });
});
