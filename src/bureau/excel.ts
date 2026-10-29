/**
 * Export des états SMT en classeur Excel : compte de résultat, bilan, notes.
 * Les montants sont de vrais nombres (entiers en francs) : on peut les reprendre dans un tableur.
 * La bibliothèque n'est chargée qu'au clic, et jamais par le téléphone du commerçant.
 */
import type { Cell, SheetData } from 'write-excel-file/browser';
import { livreRecettesDepenses, registreAchats, type DossierExercice, type Etats, type Montant } from '../moteur';

const FORMAT = '#,##0';
const gras = (value: string): Cell => ({ value, fontWeight: 'bold' });
const nombre = (value: Montant, fontWeight?: 'bold'): Cell => ({ value, type: Number, format: FORMAT, ...(fontWeight ? { fontWeight } : {}) });
const jj = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

function entete(e: Etats, titre: string): SheetData {
  return [
    [{ value: titre, fontWeight: 'bold', fontSize: 14 }],
    ['Entité', e.entreprise.nom],
    ["N° d'identification", e.entreprise.nif || 'néant'],
    ['Exercice clos le', `31/12/${e.exercice.annee}`],
    ['Situation', e.provisoire ? `provisoire au ${jj(e.auDate)}` : 'définitive'],
    [],
  ];
}

export interface FeuilleEtats {
  sheet: string;
  data: SheetData;
  columns: { width: number }[];
}

const MODE = { especes: 'Espèces', autre: 'Autre mode', credit: 'À crédit' } as const;

/** Livre des recettes et des dépenses, registre des achats : ajoutés au classeur quand le dossier est fourni. */
function feuillesLivres(e: Etats, d: DossierExercice): FeuilleEtats[] {
  const l = livreRecettesDepenses(d, d.exercice.debut, e.auDate);
  const livre: SheetData = [
    ...entete(e, 'Livre des recettes et des dépenses'),
    [gras('Date'), gras('Origine ou destination'), gras('Compte'), gras('Mode'), gras('Recette (CDF)'), gras('Dépense (CDF)')],
    ...l.lignes.map((x): Cell[] => [jj(x.date), x.libelle, x.compte, MODE[x.mode], x.sens === 'ressource' ? nombre(x.montantFC) : '', x.sens === 'emploi' ? nombre(x.montantFC) : '']),
    [],
    ['Recettes en espèces', '', '', '', nombre(l.ressourcesEspeces, 'bold')],
    ['Recettes par un autre mode', '', '', '', nombre(l.ressourcesAutres, 'bold')],
    ['Dépenses', '', '', '', '', nombre(l.emplois, 'bold')],
  ];
  const r = registreAchats(d);
  const achats: SheetData = [
    ...entete(e, `Registre des achats ${r.annee}`),
    [gras('Date'), gras('Détail'), gras('Mode de règlement'), gras('Référence de la pièce'), gras('Montant (CDF)')],
    ...r.lignes.map((x): Cell[] => [jj(x.date), x.libelle, x.mode === 'credit' ? MODE.credit : `${MODE[x.mode]} (${x.compte})`, x.reference || (x.reprise ? 'repris du cahier' : ''), nombre(x.montantFC)]),
    [],
    [gras('Récapitulation')],
    ...r.parMois.map((m): Cell[] => [`${m.mois.slice(5, 7)}/${m.mois.slice(0, 4)}`, '', '', '', nombre(m.total)]),
    [gras(`Total ${r.annee}`), '', '', '', nombre(r.total, 'bold')],
  ];
  return [
    { sheet: 'Livre', data: livre, columns: [{ width: 12 }, { width: 40 }, { width: 18 }, { width: 12 }, { width: 16 }, { width: 16 }] },
    { sheet: 'Registre des achats', data: achats, columns: [{ width: 12 }, { width: 40 }, { width: 28 }, { width: 22 }, { width: 16 }] },
  ];
}

/** Les feuilles du classeur, prêtes à écrire : états SMT, plus le livre et le registre des achats si le dossier est fourni. */
export function classeurEtats(e: Etats, d?: DossierExercice): FeuilleEtats[] {
  const r = e.compteDeResultat;
  const b = e.bilan;
  const n = e.notes;
  const ligne = (libelle: string, note: string, v: Montant, total = false): Cell[] => [total ? gras(libelle) : libelle, note, nombre(v, total ? 'bold' : undefined)];

  const resultat: SheetData = [
    ...entete(e, 'Compte de résultat SMT'),
    [gras('Rubriques'), gras('Note'), gras('Montant (CDF)')],
    ligne('Recettes sur ventes ou prestations de services', '4', r.recettesVentes),
    ligne('Autres recettes sur activités', '4', r.autresRecettes),
    ligne('Total des recettes sur produits (A)', '', r.A, true),
    ligne('Dépenses sur achats', '4', r.achats),
    ligne('Dépenses sur loyers', '4', r.loyers),
    ligne('Dépenses sur salaires', '4', r.salaires),
    ligne('Dépenses sur impôts et taxes', '4', r.impotsTaxes),
    ligne("Charges d'intérêts", '', r.interets),
    ligne('Autres dépenses sur activités', '4', r.autresDepenses),
    ligne('Total dépenses sur charges (B)', '', r.B, true),
    ligne('Solde : excédent ou insuffisance de recettes (C = A − B)', '', r.C, true),
    ligne('− Variation des stocks N / N-1', '2', r.variationStocks),
    ligne('− Variation des créances N / N-1', '3', r.variationCreances),
    ligne("+ Variation des dettes d'exploitation N / N-1", '3', r.variationDettes),
    ligne('Dotations amortissements (F)', '1', r.F),
    ligne('Résultat exercice (G = C − D + E − F)', '', r.G, true),
  ];

  const bilan: SheetData = [
    ...entete(e, `Bilan SMT au 31 décembre ${e.exercice.annee}`),
    [gras('Actif'), gras('Note'), gras('Montant (CDF)')],
    ligne('Immobilisations (valeur nette)', '1', b.actif.immobilisations),
    ligne('Stocks', '2', b.actif.stocks),
    ligne('Clients et débiteurs divers', '3', b.actif.creances),
    ligne('Caisse', '', b.actif.caisse),
    ligne('Banque, monnaie électronique, tontine (en + ou en −)', '', b.actif.banque),
    ligne('Total actif', '', b.actif.total, true),
    [],
    [gras('Passif'), gras('Note'), gras('Montant (CDF)')],
    ligne('Compte exploitant', '1', b.passif.compteExploitant),
    ligne('Résultat exercice', '', b.passif.resultat),
    ligne('Emprunt', '', b.passif.emprunt),
    ligne('Fournisseurs et créditeurs divers', '3', b.passif.dettes),
    ligne('Total passif', '', b.passif.total, true),
  ];

  const notes: SheetData = [
    ...entete(e, 'Notes annexes 1 à 3'),
    [gras('Note 1 · Matériel, mobilier et cautions')],
    [gras('Date'), gras('Désignation'), gras('Montant'), gras('Dotation'), gras('Valeur nette'), gras('Sortie'), gras('Prix de cession')],
    ...n.note1.lignes.map((l): Cell[] => [
      jj(l.date),
      l.designation,
      nombre(l.montant),
      nombre(l.dotation),
      nombre(l.valeurNette),
      l.dateSortie ? jj(l.dateSortie) : '',
      l.prixCession !== null ? nombre(l.prixCession) : '',
    ]),
    [],
    [gras('Note 2 · État des stocks')],
    ...n.note2.lignes.map((l): Cell[] => [l.reference, l.designation, { value: l.quantite, type: Number }, nombre(l.prixUnitaire), nombre(l.montant)]),
    ['Valeur du stock final', n.note2.inventaireFait ? '' : 'inventaire non fait', nombre(n.note2.stockFinal, 'bold')],
    ['Valeur du stock initial', '', nombre(n.note2.stockInitial)],
    [],
    [gras('Note 3 · Créances et dettes non échues'), gras('Au 31 décembre'), gras('Au 1er janvier')],
    ['Total des créances', nombre(n.note3.creances.cloture), nombre(n.note3.creances.ouverture)],
    ['Total des dettes', nombre(n.note3.dettes.cloture), nombre(n.note3.dettes.ouverture)],
  ];

  const livres = d ? feuillesLivres(e, d) : [];
  return [
    { sheet: 'Compte de résultat', data: resultat, columns: [{ width: 58 }, { width: 8 }, { width: 18 }] },
    { sheet: 'Bilan', data: bilan, columns: [{ width: 52 }, { width: 8 }, { width: 18 }] },
    { sheet: 'Notes', data: notes, columns: [{ width: 34 }, { width: 34 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 16 }] },
    ...livres,
  ];
}

export function nomFichier(e: Etats): string {
  const nom = e.entreprise.nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `Etats-SMT-${nom}-${e.exercice.annee}.xlsx`;
}

/** Fabrique et télécharge le classeur dans le navigateur. */
export async function telechargerExcel(e: Etats, d?: DossierExercice): Promise<void> {
  const { default: ecrire } = await import('write-excel-file/browser');
  await ecrire(classeurEtats(e, d)).toFile(nomFichier(e));
}
