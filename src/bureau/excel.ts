/**
 * Export des états SMT en classeur Excel : compte de résultat, bilan, notes, et, quand le dossier est fourni,
 * un journal de trésorerie par compte (note 4), les journaux de suivi des créances et des dettes, le livre et le registre des achats.
 * Les montants sont de vrais nombres (entiers en francs) : on peut les reprendre dans un tableur.
 * La bibliothèque n'est chargée qu'au clic, et jamais par le téléphone du commerçant.
 */
import type { Cell, SheetData } from 'write-excel-file/browser';
import { livreRecettesDepenses, registreAchats, type Bilan, type Devise, type DossierExercice, type Etats, type GenreTiers, type Montant } from '../moteur';
import { champsEntete, type Mentions } from './entete';
import { cleTiers, datesParTiers, DEPENSES_AJOUTEES, DEPENSES_MODELE, detailBanque, journalBureau, LIBELLE_DEPENSE, LIBELLE_RECETTE, moisExercice, RECETTES_AJOUTEES, RECETTES_MODELE, suiviTiers } from './journaux';

const FORMAT = '#,##0';
const gras = (value: string): Cell => ({ value, fontWeight: 'bold' });
const nombre = (value: Montant, fontWeight?: 'bold'): Cell => ({ value, type: Number, format: FORMAT, ...(fontWeight ? { fontWeight } : {}) });
const jj = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

export type { Mentions } from './entete';

/** Mentions du classeur ; `ouverture` : bilan d'ouverture repris en colonne N-1 la première année (AUDCIF, art. 34 al. 4). */
export interface MentionsClasseur extends Mentions {
  ouverture?: Bilan | null;
}

/** En-tête du modèle (Titre X, ch. 2), le même qu'au bureau et à l'impression. */
function entete(e: Etats, m: Mentions, titre: string): SheetData {
  return [[{ value: titre, fontWeight: 'bold', fontSize: 14 }], ...(m.fictif ? [[gras('Données fictives de démonstration')]] : []), ...champsEntete(e, m).map(([l, v]): Cell[] => [l, v]), []];
}

/** Montant dans la devise : francs entiers, ou dollars à deux décimales (stockés en centimes). */
const enDevise = (v: Montant, devise: Devise, fontWeight?: 'bold'): Cell =>
  devise === 'CDF' ? nombre(v, fontWeight) : { value: v / 100, type: Number, format: '#,##0.00', ...(fontWeight ? { fontWeight } : {}) };

/** Nom de feuille valable (31 caractères, sans : \\ / ? * [ ]) et unique dans le classeur. */
function nomFeuille(base: string, pris: Set<string>): string {
  const propre = base.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31).trim();
  let nom = propre;
  for (let i = 2; pris.has(nom.toLowerCase()); i++) nom = `${propre.slice(0, 27)} (${i})`;
  pris.add(nom.toLowerCase());
  return nom;
}

/** Un journal de trésorerie par compte, tous les mois de l'exercice jusqu'à la date de situation (note 4). */
function feuillesJournaux(e: Etats, d: DossierExercice, m: Mentions, pris: Set<string>): FeuilleEtats[] {
  const mois = moisExercice(d, e.auDate);
  return d.comptes.map((c): FeuilleEtats => {
    const journaux = mois.map((x) => journalBureau(d, c.id, x));
    const usd = c.devise === 'USD';
    const recettes = [...RECETTES_MODELE, ...RECETTES_AJOUTEES.filter((k) => journaux.some((j) => j.recettesAjoutees.includes(k)))];
    const depenses = [...DEPENSES_MODELE, ...DEPENSES_AJOUTEES.filter((k) => journaux.some((j) => j.depensesAjoutees.includes(k)))];
    const vides = (n: number): Cell[] => Array.from({ length: n }, () => '');
    const fixes = usd ? 7 : 6;
    const data: SheetData = [...entete(e, m, `Journal de trésorerie (note 4) · ${c.libelle} (${c.devise})`)];
    for (const j of journaux) {
      const titreMois = `${j.mois.slice(5, 7)}/${j.mois.slice(0, 4)}`;
      data.push([gras(`Mois de ${titreMois}`)]);
      data.push([...vides(fixes), gras('Ventilation recettes'), ...vides(recettes.length - 1), gras('Ventilation dépenses')]);
      data.push([
        gras('Date'),
        gras('Libellés'),
        gras('N° pièce'),
        gras(`Recettes (${c.devise})`),
        gras(`Dépenses (${c.devise})`),
        gras(`Solde (${c.devise})`),
        ...(usd ? [gras('Contre-valeur (CDF)')] : []),
        ...recettes.map((k) => gras(LIBELLE_RECETTE[k])),
        ...depenses.map((k) => gras(LIBELLE_DEPENSE[k])),
      ]);
      data.push([`01/${titreMois}`, 'Report à nouveau', '', '', '', enDevise(j.reportANouveau, c.devise), ...(usd ? [j.reportFC === null ? '' : nombre(j.reportFC)] : [])]);
      for (const l of j.lignes) {
        data.push([
          jj(l.date),
          l.annulation ? `${l.libelle} (annulation)` : l.libelle,
          l.reference || (l.piece ? '' : 'sans pièce'),
          l.recette ? enDevise(l.recette, c.devise) : '',
          l.depense ? enDevise(l.depense, c.devise) : '',
          enDevise(l.solde, c.devise),
          ...(usd ? [l.fc === null ? '' : nombre(l.fc)] : []),
          ...recettes.map((k): Cell => (l.cote === 'recette' && l.colonne === k ? enDevise(l.recette, c.devise) : '')),
          ...depenses.map((k): Cell => (l.cote === 'depense' && l.colonne === k ? enDevise(l.depense, c.devise) : '')),
        ]);
      }
      data.push([
        '',
        gras('Totaux du mois'),
        '',
        enDevise(j.totalRecettes, c.devise, 'bold'),
        enDevise(j.totalDepenses, c.devise, 'bold'),
        '',
        ...(usd ? [''] : []),
        ...recettes.map((k) => enDevise(j.ventilation.recettes[k], c.devise, 'bold')),
        ...depenses.map((k) => enDevise(j.ventilation.depenses[k], c.devise, 'bold')),
      ]);
      data.push(['', gras('Solde à reporter'), '', '', '', enDevise(j.soldeAReporter, c.devise, 'bold'), ...(usd ? [j.soldeFC === null ? '' : nombre(j.soldeFC, 'bold')] : [])]);
      data.push([]);
    }
    if (usd) data.push(["Contre-valeur en francs au taux du jour de chaque opération ; report au taux d'ouverture."]);
    return {
      sheet: nomFeuille(`Journal ${c.libelle}`, pris),
      data,
      columns: [{ width: 12 }, { width: 38 }, { width: 14 }, { width: 16 }, { width: 16 }, { width: 16 }, ...(usd ? [{ width: 18 }] : []), ...recettes.map(() => ({ width: 15 })), ...depenses.map(() => ({ width: 15 }))],
    };
  });
}

/** Journaux de suivi des créances impayées et des dettes à payer : toutes les factures de l'exercice. */
function feuilleSuivi(e: Etats, d: DossierExercice, m: Mentions, genre: GenreTiers): FeuilleEtats {
  const creance = genre === 'creance';
  const lignes = suiviTiers(d, genre, e.auDate);
  const data: SheetData = [
    ...entete(e, m, creance ? 'Journal de suivi des créances impayées' : 'Journal de suivi des dettes à payer'),
    [gras('Date'), gras('N° facture'), gras(creance ? 'Nom du client' : 'Nom du fournisseur'), gras('Montant'), gras('Réglé'), gras('Reste'), gras('Devise'), gras('Date de paiement')],
    ...lignes.map((x): Cell[] => [
      jj(x.ligne.date),
      x.ligne.facture,
      x.ligne.nom,
      enDevise(x.ligne.montant, x.ligne.devise),
      enDevise(x.regle, x.ligne.devise),
      enDevise(x.reste, x.ligne.devise),
      x.ligne.devise,
      x.dernierReglement ? `${jj(x.dernierReglement)}${x.soldee ? '' : ' (en partie)'}` : '',
    ]),
    [],
    ['Date de paiement : celle du dernier règlement. Factures soldées comprises.'],
  ];
  return { sheet: creance ? 'Suivi des créances' : 'Suivi des dettes', data, columns: [{ width: 12 }, { width: 14 }, { width: 32 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 8 }, { width: 22 }] };
}

export interface FeuilleEtats {
  sheet: string;
  data: SheetData;
  columns: { width: number }[];
}

const MODE = { especes: 'Espèces', autre: 'Autre mode', credit: 'À crédit' } as const;

/** Livre des recettes et des dépenses, registre des achats : ajoutés au classeur quand le dossier est fourni. */
function feuillesLivres(e: Etats, d: DossierExercice, m: Mentions): FeuilleEtats[] {
  const l = livreRecettesDepenses(d, d.exercice.debut, e.auDate);
  const livre: SheetData = [
    ...entete(e, m, 'Livre des recettes et des dépenses'),
    [gras('Date'), gras('Origine ou destination'), gras('Compte'), gras('Mode'), gras('Recette (CDF)'), gras('Dépense (CDF)')],
    ...l.lignes.map((x): Cell[] => [jj(x.date), x.libelle, x.compte, MODE[x.mode], x.sens === 'ressource' ? nombre(x.montantFC) : '', x.sens === 'emploi' ? nombre(x.montantFC) : '']),
    [],
    ['Recettes en espèces', '', '', '', nombre(l.ressourcesEspeces, 'bold')],
    ['Recettes par un autre mode', '', '', '', nombre(l.ressourcesAutres, 'bold')],
    ['Dépenses', '', '', '', '', nombre(l.emplois, 'bold')],
  ];
  const r = registreAchats(d);
  const achats: SheetData = [
    ...entete(e, m, `Registre des achats ${r.annee}`),
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
export function classeurEtats(e: Etats, d?: DossierExercice, methodeStock?: string, precedent: Etats | null = null, m: MentionsClasseur = {}): FeuilleEtats[] {
  const r = e.compteDeResultat;
  const b = e.bilan;
  const n = e.notes;
  // Bilan N-1 : l'exercice précédent, sinon le bilan d'ouverture la première année.
  const pb = precedent?.bilan ?? m.ouverture ?? undefined;
  const premiere = !precedent;
  // Exercice N puis N-1 (vide la première année tenue dans Mbongo).
  const ligne = (libelle: string, note: string, v: Montant, pv: Montant | undefined, total = false): Cell[] => [
    total ? gras(libelle) : libelle,
    note,
    nombre(v, total ? 'bold' : undefined),
    pv === undefined ? '' : nombre(pv),
  ];

  const resultat: SheetData = [
    ...entete(e, m, 'Compte de résultat SMT'),
    [gras('Rubriques'), gras('Note'), gras(`Exercice ${e.exercice.annee}`), gras(`Exercice ${e.exercice.annee - 1}`)],
    ligne('Recettes sur ventes ou prestations de services', '4', r.recettesVentes, precedent?.compteDeResultat.recettesVentes),
    ligne('Autres recettes sur activités', '4', r.autresRecettes, precedent?.compteDeResultat.autresRecettes),
    ligne('Total des recettes sur produits (A)', '', r.A, precedent?.compteDeResultat.A, true),
    ligne('Dépenses sur achats', '4', r.achats, precedent?.compteDeResultat.achats),
    ligne('Dépenses sur loyers', '4', r.loyers, precedent?.compteDeResultat.loyers),
    ligne('Dépenses sur salaires', '4', r.salaires, precedent?.compteDeResultat.salaires),
    ligne('Dépenses sur impôts et taxes', '4', r.impotsTaxes, precedent?.compteDeResultat.impotsTaxes),
    ligne("Charges d'intérêts", '', r.interets, precedent?.compteDeResultat.interets),
    ligne('Autres dépenses sur activités', '4', r.autresDepenses, precedent?.compteDeResultat.autresDepenses),
    ligne('Total dépenses sur charges (B)', '', r.B, precedent?.compteDeResultat.B, true),
    ligne('Solde : excédent ou insuffisance de recettes (C = A − B)', '', r.C, precedent?.compteDeResultat.C, true),
    ligne('− Variation des stocks N / N-1', '2', r.variationStocks, precedent?.compteDeResultat.variationStocks),
    ligne('− Variation des créances N / N-1', '3', r.variationCreances, precedent?.compteDeResultat.variationCreances),
    ligne("+ Variation des dettes d'exploitation N / N-1", '3', r.variationDettes, precedent?.compteDeResultat.variationDettes),
    ligne('Dotations amortissements (F)', '1', r.F, precedent?.compteDeResultat.F),
    ligne('Résultat exercice (G = C − D + E − F)', '', r.G, precedent?.compteDeResultat.G, true),
    ...(premiere ? [[], [`Colonne ${e.exercice.annee - 1} non disponible : première année tenue dans Mbongo.`]] : []),
  ];

  const bilan: SheetData = [
    ...entete(e, m, `Bilan SMT au 31 décembre ${e.exercice.annee}`),
    [gras('Actif'), gras('Note'), gras(`Exercice ${e.exercice.annee}`), gras(`Exercice ${e.exercice.annee - 1}`)],
    ligne('Immobilisations (valeur nette)', '1', b.actif.immobilisations, pb?.actif.immobilisations),
    ligne('Stocks', '2', b.actif.stocks, pb?.actif.stocks),
    ligne('Clients et débiteurs divers', '3', b.actif.creances, pb?.actif.creances),
    ligne('Caisse', '', b.actif.caisse, pb?.actif.caisse),
    ligne('Banque (en + ou en −)', '', b.actif.banque, pb?.actif.banque),
    ...(d ? detailBanque(d, e.auDate).map((x): Cell[] => [`   dont ${x.libelle}`, '', nombre(x.montant)]) : []),
    ligne('Total actif', '', b.actif.total, pb?.actif.total, true),
    [],
    [gras('Passif'), gras('Note'), gras(`Exercice ${e.exercice.annee}`), gras(`Exercice ${e.exercice.annee - 1}`)],
    ligne('Compte exploitant', '1', b.passif.compteExploitant, pb?.passif.compteExploitant),
    ligne('Résultat exercice', '', b.passif.resultat, pb?.passif.resultat),
    ligne('Emprunt', '', b.passif.emprunt, pb?.passif.emprunt),
    ligne('Fournisseurs et créditeurs divers', '3', b.passif.dettes, pb?.passif.dettes),
    ligne('Total passif', '', b.passif.total, pb?.passif.total, true),
    ...(premiere && m.ouverture ? [[], [`Première année tenue dans Mbongo : la colonne ${e.exercice.annee - 1} reprend le bilan d'ouverture au ${jj(e.exercice.debut)}.`]] : []),
    ...(d && detailBanque(d, e.auDate).length ? [['Banque : comptes bancaires, monnaie électronique et tontine, en francs.']] : []),
  ];

  const pct = (v: number | null) => (v === null ? 'n.s.' : `${Math.round(v * 100)} %`);
  const datesC = d ? datesParTiers(d, 'creance') : null;
  const datesD = d ? datesParTiers(d, 'dette') : null;
  const dateDe = (dates: Map<string, string> | null, nom: string) => {
    const x = dates?.get(cleTiers(nom));
    return x ? jj(x) : '';
  };
  const notes: SheetData = [
    ...entete(e, m, 'Notes annexes 1 à 3'),
    [gras('Note 1 · Tableau SMT de suivi du matériel, du mobilier et des cautions')],
    [gras('Date'), gras('Désignation'), gras('Montant'), gras('Dotation'), gras('Valeur nette'), gras('Date de sortie'), gras('Prix de cession')],
    ...n.note1.lignes.map((l): Cell[] => [
      jj(l.date),
      l.designation,
      nombre(l.montant),
      nombre(l.dotation),
      nombre(l.valeurNette),
      l.dateSortie ? jj(l.dateSortie) : '',
      l.prixCession !== null ? nombre(l.prixCession) : '',
    ]),
    [gras('Total'), '', nombre(n.note1.totalMontant, 'bold'), nombre(n.note1.totalDotations, 'bold'), nombre(n.note1.totalValeurNette, 'bold')],
    [],
    [gras('Note 2 · État des stocks')],
    ...(methodeStock ? [[methodeStock]] : []),
    [gras('Référence'), gras('Désignation'), gras('Quantité'), gras('Prix unitaire'), gras('Montant')],
    ...n.note2.lignes.map((l): Cell[] =>
      l.travauxEnCours ? [l.reference, `${l.designation} (travail en cours)`, '', '', nombre(l.montant)] : [l.reference, l.designation, { value: l.quantite, type: Number }, nombre(l.prixUnitaire), nombre(l.montant)],
    ),
    [gras('Valeur du stock final'), n.note2.inventaireFait ? '' : 'inventaire non fait : stock initial repris', '', '', nombre(n.note2.stockFinal, 'bold')],
    ['Valeur du stock initial', '', '', '', nombre(n.note2.stockInitial)],
    [],
    [gras('Note 3 · Créances et dettes non échues')],
    [gras('Date'), gras('Nom du client ou du fournisseur'), gras('Montant au 31 décembre'), gras('Montant au 1er janvier'), gras('Variation')],
    ...n.note3.creances.lignes.map((l): Cell[] => [dateDe(datesC, l.nom), l.nom, nombre(l.cloture), nombre(l.ouverture), pct(l.variation)]),
    [gras('Total des créances'), '', nombre(n.note3.creances.cloture, 'bold'), nombre(n.note3.creances.ouverture, 'bold'), pct(n.note3.creances.variation)],
    ...n.note3.dettes.lignes.map((l): Cell[] => [dateDe(datesD, l.nom), l.nom, nombre(l.cloture), nombre(l.ouverture), pct(l.variation)]),
    [gras('Total des dettes'), '', nombre(n.note3.dettes.cloture, 'bold'), nombre(n.note3.dettes.ouverture, 'bold'), pct(n.note3.dettes.variation)],
    ...(d ? [[], ['Date : celle de la plus ancienne facture du client ou du fournisseur.']] : []),
  ];

  const pris = new Set(['compte de résultat', 'bilan', 'notes', 'livre', 'registre des achats', 'suivi des créances', 'suivi des dettes']);
  const journaux = d ? [...feuillesJournaux(e, d, m, pris), feuilleSuivi(e, d, m, 'creance'), feuilleSuivi(e, d, m, 'dette')] : [];
  const livres = d ? feuillesLivres(e, d, m) : [];
  return [
    { sheet: 'Compte de résultat', data: resultat, columns: [{ width: 58 }, { width: 8 }, { width: 18 }, { width: 18 }] },
    { sheet: 'Bilan', data: bilan, columns: [{ width: 52 }, { width: 8 }, { width: 18 }, { width: 18 }] },
    { sheet: 'Notes', data: notes, columns: [{ width: 14 }, { width: 38 }, { width: 20 }, { width: 20 }, { width: 14 }, { width: 14 }, { width: 16 }] },
    ...journaux,
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
export async function telechargerExcel(e: Etats, d?: DossierExercice, methodeStock?: string, precedent: Etats | null = null, m: MentionsClasseur = {}): Promise<void> {
  const { default: ecrire } = await import('write-excel-file/browser');
  await ecrire(classeurEtats(e, d, methodeStock, precedent, m)).toFile(nomFichier(e));
}
