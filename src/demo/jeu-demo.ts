/**
 * Jeu de démonstration : « Alimentation Maman Nsimba », Kinshasa. DONNÉES FICTIVES.
 * Construit par rapport à la date du jour, pour que la démonstration montre toujours
 * l'exercice en cours, des ventes récentes et des factures à suivre.
 * Mois écoulés : totaux repris du cahier de caisse. Mois précédent et mois en cours : saisies détaillées.
 */
import { ajouterJours, jourSemaine } from '../moteur/dates';
import type { DateISO, DossierExercice, GenreTiers, Immobilisation, Nature, Operation, PieceTiers, TypeOperation } from '../moteur';
import type { LigneCompte, LigneEntreprise, LigneExercice, LigneTaux } from '../donnees/types';

export interface JeuDemo {
  entreprise: LigneEntreprise;
  exercice: LigneExercice;
  comptes: LigneCompte[];
  operations: Operation[];
  tiers: (PieceTiers & { genre: GenreTiers })[];
  immobilisations: Immobilisation[];
  taux: LigneTaux[];
  dossier: DossierExercice;
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
/** Ventes et achats mensuels du cahier, en millions de francs. */
const VENTES = [9.1, 8.6, 9.8, 9.3, 10.2, 9.7, 10.6, 11.1, 10.4, 10.9, 11.6, 13.2];
const ACHATS = [6.4, 6.0, 7.1, 6.6, 7.3, 6.9, 7.6, 8.0, 7.5, 7.8, 8.3, 9.6];
const TAUX_OUVERTURE = 2800;
const TAUX_DU_JOUR = 2850;

const finDeMois = (a: number, m: number): number => new Date(Date.UTC(a, m, 0)).getUTCDate();
const pad = (n: number): string => String(n).padStart(2, '0');

/** Variation stable d'un montant selon la date : la démo est la même à chaque chargement. */
function varier(base: number, graine: string, ecart: number): number {
  let h = 2166136261;
  for (const c of graine) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const f = ((h >>> 0) % 1000) / 1000;
  return Math.round((base * (1 - ecart + 2 * ecart * f)) / 1000) * 1000;
}

export function creerJeuDemo(aujourdhui: DateISO, id: () => string): JeuDemo {
  const annee = Number(aujourdhui.slice(0, 4));
  const moisCourant = Number(aujourdhui.slice(5, 7));
  const entrepriseId = id();
  const exerciceId = id();
  const creeLe = `${aujourdhui}T08:00:00.000Z`;

  const compte = (ordre: number, type: LigneCompte['type'], libelle: string, devise: LigneCompte['devise'] = 'CDF'): LigneCompte => ({
    id: id(),
    entrepriseId,
    ordre,
    type,
    libelle,
    devise,
  });
  const caisse = compte(0, 'caisse', 'Caisse');
  const dollars = compte(1, 'caisse', 'Caisse dollars', 'USD');
  const mpesa = compte(2, 'mobile', 'M-Pesa');
  const orange = compte(3, 'mobile', 'Orange Money');
  const banque = compte(4, 'banque', 'Banque');
  const likelemba = compte(5, 'tontine', 'Likelemba du marché');
  const comptes = [caisse, dollars, mpesa, orange, banque, likelemba];

  const operations: Operation[] = [];
  const ajouter = (date: DateISO, type: TypeOperation, c: LigneCompte, nature: Nature, libelle: string, montant: number, extra: Partial<Operation> = {}): string | null => {
    if (date > aujourdhui || date < `${annee}-01-01`) return null;
    const o: Operation = { id: id(), date, type, compte: c.id, nature, libelle, montant, devise: c.devise, taux: c.devise === 'USD' ? TAUX_DU_JOUR : null, piece: true, ...extra };
    operations.push(o);
    return o.id;
  };
  const transfert = (date: DateISO, de: LigneCompte, vers: LigneCompte, libelle: string, montant: number, extra: Partial<Operation> = {}) =>
    ajouter(date, 'transfert', de, 'transfert', libelle, montant, { compteDestination: vers.id, taux: null, ...extra });

  const immobilisations: Immobilisation[] = [
    { id: id(), date: `${annee - 3}-03-10`, designation: 'Étagères métalliques', categorie: 'mobilier', montant: 1_800_000, duree: 5 },
    { id: id(), date: `${annee - 2}-06-02`, designation: 'Balance électronique', categorie: 'materiel', montant: 420_000, duree: 5 },
  ];

  for (let m = 1; m <= moisCourant; m++) {
    const fin = finDeMois(annee, m);
    const j = (n: number): DateISO => `${annee}-${pad(m)}-${pad(Math.min(n, fin))}`;
    const nom = MOIS[m - 1] ?? '';
    const detaille = m >= moisCourant - 1;

    ajouter(j(5), 'depense', banque, 'loyers', `Loyer du dépôt, ${nom}`, 450_000);
    transfert(j(10), caisse, likelemba, 'Cotisation au likelemba', 100_000);
    if (m === 6) transfert(j(11), likelemba, caisse, 'Main du likelemba reçue', 500_000);
    ajouter(j(15), 'depense', caisse, 'autres_depenses', `Transport et petits frais, ${nom}`, 165_000, { piece: !(detaille && m === moisCourant) });
    if (m % 3 === 1) ajouter(j(20), 'depense', banque, 'impots_taxes', `Taxes et redevances, ${nom}`, 180_000);
    transfert(j(25), caisse, banque, 'Versement de la caisse à la banque', 1_000_000);
    ajouter(j(29), 'depense', caisse, 'prelevement', `Argent pour la maison, ${nom}`, 700_000);
    ajouter(j(31), 'depense', caisse, 'salaires', `Salaire du vendeur, ${nom}`, 320_000);

    if (!detaille) {
      ajouter(j(28), 'recette', caisse, 'ventes', `Report du cahier de caisse, ventes de ${nom}`, Math.round((VENTES[m - 1] ?? 10) * 1e6), { reprise: true });
      ajouter(j(28), 'depense', caisse, 'achats_marchandises', `Report du cahier, achats de ${nom}`, Math.round((ACHATS[m - 1] ?? 7) * 1e6), { reprise: true });
      continue;
    }

    // Mois détaillés : ventes quatre jours par semaine, achats le jeudi.
    for (let d = 1; d <= fin; d++) {
      const date = j(d);
      const js = jourSemaine(date);
      if (js === 1 || js === 3 || js === 5 || js === 6) ajouter(date, 'recette', caisse, 'ventes', 'Ventes de la journée', varier(520_000, date, 0.3));
      if (js === 2) ajouter(date, 'recette', mpesa, 'ventes', 'Ventes payées par M-Pesa', varier(200_000, date, 0.2));
      if (js === 4) ajouter(date, 'depense', caisse, 'achats_marchandises', d < 15 ? 'Riz et huile, grossiste Marché central' : 'Boissons, dépôt Bralima', varier(1_500_000, date, 0.25));
    }
    ajouter(j(8), 'recette', orange, 'ventes', 'Ventes payées par Orange Money', 92_000);
    ajouter(j(12), 'recette', dollars, 'ventes', 'Vente en gros payée en dollars', 12_000);
    ajouter(j(19), 'depense', dollars, 'achats_marchandises', 'Sucre et lait en poudre, payés en dollars', 15_000);
    transfert(j(22), dollars, caisse, 'Change de 100 $ chez le cambiste', 10_000, { montantDestination: 285_000 });
    ajouter(j(20), 'depense', mpesa, 'autres_depenses', 'Crédit téléphone et forfait internet', 35_000, { piece: false });
    if (m === moisCourant - 1 || (moisCourant === 1 && m === 1)) {
      const achat = ajouter(j(27), 'depense', banque, 'materiel', 'Congélateur pour les boissons', 1_852_500);
      if (achat) immobilisations.push({ id: id(), date: j(27), designation: 'Congélateur pour les boissons', categorie: 'materiel', montant: 1_852_500, duree: 5, operation: achat });
    }
  }

  // Factures : deux de l'an dernier, puis des ventes et achats à crédit récents.
  const tiers: (PieceTiers & { genre: GenreTiers })[] = [];
  const facture = (genre: GenreTiers, date: DateISO, numero: string, nom: string, montant: number, nature: Nature = genre === 'creance' ? 'ventes' : 'achats_marchandises') => {
    if (date > aujourdhui) return null;
    const t = { id: id(), genre, date, facture: numero, nom, nature, montant, devise: 'CDF' as const, taux: null };
    tiers.push(t);
    return t;
  };
  const avant = (jours: number): DateISO => ajouterJours(aujourdhui, -jours);
  const reglement = (t: { id: string; nature: Nature; facture: string; nom: string } | null, genre: GenreTiers, date: DateISO, c: LigneCompte, montant: number) => {
    if (!t) return;
    ajouter(date, genre === 'creance' ? 'recette' : 'depense', c, t.nature, `${genre === 'creance' ? 'Encaissement' : 'Règlement'} facture ${t.facture}, ${t.nom}`, montant, {
      reglementDe: { genre, ligne: t.id },
    });
  };
  reglement(facture('creance', `${annee - 1}-12-20`, 'V-118', 'Restaurant Chez Tantine', 520_000), 'creance', `${annee}-01-12`, caisse, 520_000);
  reglement(facture('creance', `${annee - 1}-12-28`, 'V-121', 'École primaire Lisanga', 280_000), 'creance', `${annee}-02-03`, caisse, 100_000);
  reglement(facture('dette', `${annee - 1}-12-23`, 'F-3390', 'Ets Mukoko', 1_150_000), 'dette', `${annee}-01-08`, banque, 1_150_000);
  facture('creance', avant(40), 'V-204', 'Restaurant Chez Tantine', 610_000);
  facture('creance', avant(18), 'V-219', 'Paroisse Saint-Pierre, kermesse', 385_000);
  facture('creance', avant(7), 'V-226', 'M. Kalala, voisin', 74_000);
  facture('dette', avant(8), 'F-5120', 'Ets Mukoko', 1_480_000);
  facture('dette', avant(4), 'B-0877', 'Dépôt de boissons du quartier', 690_000);

  const soldesOuverture = { [caisse.id]: 2_350_000, [dollars.id]: 30_000, [mpesa.id]: 240_000, [orange.id]: 60_000, [banque.id]: 3_900_000, [likelemba.id]: 0 };
  const entreprise: LigneEntreprise = {
    id: entrepriseId,
    nom: 'Alimentation Maman Nsimba',
    activite: 'Commerce de détail, alimentation générale',
    secteur: 'negoce',
    commune: 'Kinshasa',
    nif: 'démo A0000000',
    responsable: 'Mme Nsimba (fictif)',
    telephone: '+243 000 000 000',
    demo: true,
    creeLe,
  };
  const exercice: LigneExercice = {
    id: exerciceId,
    entrepriseId,
    annee,
    debut: `${annee}-01-01`,
    fin: `${annee}-12-31`,
    statut: 'ouvert',
    soldesOuverture,
    tauxOuverture: TAUX_OUVERTURE,
    empruntOuverture: 0,
    stockInitial: 6_500_000,
    stockFinal: null,
    tauxCloture: null,
  };
  const taux: LigneTaux[] = [
    { id: id(), date: `${annee}-01-01`, valeur: TAUX_OUVERTURE, source: 'demo' },
    { id: id(), date: avant(30) < `${annee}-01-01` ? `${annee}-01-01` : avant(30), valeur: TAUX_DU_JOUR, source: 'demo' },
  ];

  const parGenre = (g: GenreTiers): PieceTiers[] => tiers.filter((t) => t.genre === g).map(({ genre: _genre, ...t }) => t);
  const dossier: DossierExercice = {
    entreprise: { nom: entreprise.nom, secteur: entreprise.secteur, nif: entreprise.nif },
    exercice: { annee, debut: exercice.debut, fin: exercice.fin },
    comptes: comptes.map((c) => ({ id: c.id, type: c.type, libelle: c.libelle, devise: c.devise })),
    soldesOuverture,
    tauxOuverture: TAUX_OUVERTURE,
    empruntOuverture: 0,
    operations: [...operations].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    creances: parGenre('creance'),
    dettes: parGenre('dette'),
    immobilisations,
    stockInitial: exercice.stockInitial,
    stockFinal: null,
    tauxCloture: null,
  };

  return { entreprise, exercice, comptes, operations, tiers, immobilisations, taux, dossier };
}
