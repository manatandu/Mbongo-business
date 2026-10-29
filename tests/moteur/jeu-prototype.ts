/**
 * Jeu de données du prototype validé (prototype/index.html, fonction seed).
 * DONNÉES FICTIVES : « Alimentation Maman Nsimba » n'existe pas.
 *
 * Trois écarts de forme avec le prototype, sans effet sur les montants des états :
 * 1. Les dates impossibles du prototype (30 et 29 février) sont ramenées au 28 février.
 * 2. Le prototype mélangeait dollars et francs dans la même caisse (contraire à D3).
 *    Les trois opérations en dollars sont reprises en francs, au taux du prototype (2 850).
 * 3. Le prototype marquait réglées deux créances et une dette de 2025 sans écrire l'opération de
 *    trésorerie : le règlement était noyé dans le report mensuel du cahier. Ici, il devient une
 *    opération à part entière (D4), et le report du mois est diminué d'autant. La créance V-121,
 *    marquée « banque » dans le prototype sans aucun mouvement de banque, est encaissée en caisse.
 */
import type { DossierExercice, Nature, Operation, TypeOperation } from '../../src/moteur';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août'];
const TAUX_PROTOTYPE = 2850;

export function jeuPrototype(): DossierExercice {
  const operations: Operation[] = [];
  let n = 0;
  const ajouter = (
    date: string,
    type: TypeOperation,
    compte: string,
    nature: Nature,
    libelle: string,
    montant: number,
    extra: Partial<Operation> = {},
  ): string => {
    const id = `op-${++n}`;
    operations.push({ id, date, type, compte, nature, libelle, montant, devise: 'CDF', taux: null, piece: true, ...extra });
    return id;
  };
  const jour = (m: string, j: number): string => (m === '02' && j > 28 ? `2026-02-28` : `2026-${m}-${String(j).padStart(2, '0')}`);

  // Janvier à août : reports mensuels du cahier de caisse
  const base: [number, number][] = [[9.1, 6.4], [8.6, 6.0], [9.8, 7.1], [9.3, 6.6], [10.2, 7.3], [9.7, 6.9], [10.6, 7.6], [11.1, 8.0]];
  base.forEach(([v, a], i) => {
    const m = String(i + 1).padStart(2, '0');
    const mn = MOIS[i];
    let ventes = Math.round(v * 1e6);
    let achats = Math.round(a * 1e6);
    if (i === 0) {
      ventes -= 520_000;
      achats -= 1_150_000;
    }
    if (i === 1) ventes -= 280_000;
    ajouter(jour(m, 28), 'recette', 'caisse', 'ventes', `Report du cahier de caisse, ventes de ${mn}`, ventes, { reprise: true });
    ajouter(jour(m, 28), 'depense', 'caisse', 'achats_marchandises', `Report du cahier, achats de ${mn}`, achats, { reprise: true });
    ajouter(jour(m, 5), 'depense', 'banque', 'loyers', `Loyer du dépôt, ${mn}`, 450_000);
    ajouter(jour(m, 30), 'depense', 'caisse', 'salaires', `Salaire du vendeur, ${mn}`, 320_000);
    ajouter(jour(m, 15), 'depense', 'caisse', 'autres_depenses', `Transport et petits frais, ${mn}`, 165_000);
    if (i % 3 === 0) ajouter(jour(m, 20), 'depense', 'banque', 'impots_taxes', `Taxes et redevances, ${mn}`, 180_000);
    ajouter(jour(m, 29), 'depense', 'caisse', 'prelevement', `Prélèvement pour le ménage, ${mn}`, 700_000);
  });

  // Règlements des factures de 2025 (sortis des reports de janvier et février)
  ajouter('2026-01-08', 'depense', 'caisse', 'achats_marchandises', 'Règlement facture F-3390, Ets Mukoko', 1_150_000, { reglementDe: { genre: 'dette', ligne: 'd-1' } });
  ajouter('2026-01-12', 'recette', 'caisse', 'ventes', 'Encaissement facture V-118, Restaurant Chez Tantine', 520_000, { reglementDe: { genre: 'creance', ligne: 'c-1' } });
  ajouter('2026-02-03', 'recette', 'caisse', 'ventes', 'Encaissement facture V-121, École primaire Lisanga', 280_000, { reglementDe: { genre: 'creance', ligne: 'c-2' } });

  // Septembre
  ajouter('2026-09-01', 'depense', 'banque', 'loyers', 'Loyer du dépôt, septembre', 450_000);
  ajouter('2026-09-03', 'recette', 'caisse', 'ventes', 'Ventes de la journée', 412_000);
  ajouter('2026-09-04', 'depense', 'caisse', 'achats_marchandises', 'Riz et huile, grossiste Marché central', 1_850_000);
  ajouter('2026-09-06', 'recette', 'mpesa', 'ventes', 'Ventes payées par M-Pesa', 186_000);
  ajouter('2026-09-10', 'recette', 'caisse', 'ventes', 'Ventes de la journée', 388_000);
  ajouter('2026-09-12', 'depense', 'caisse', 'achats_marchandises', 'Sucre et lait en poudre (420 $ au taux 2 850)', 420 * TAUX_PROTOTYPE);
  ajouter('2026-09-15', 'transfert', 'caisse', 'transfert', 'Versement de la caisse à la banque', 2_500_000, { compteDestination: 'banque' });
  ajouter('2026-09-18', 'recette', 'caisse', 'ventes', 'Ventes de la journée', 455_000);
  ajouter('2026-09-20', 'depense', 'mpesa', 'autres_depenses', 'Crédit téléphone et forfait internet', 35_000, { piece: false });
  ajouter('2026-09-24', 'recette', 'caisse', 'ventes', 'Ventes de la semaine', 1_960_000);
  const congelateur = ajouter('2026-09-27', 'depense', 'banque', 'materiel', 'Congélateur pour les boissons (650 $ au taux 2 850)', 650 * TAUX_PROTOTYPE);
  ajouter('2026-09-30', 'depense', 'caisse', 'salaires', 'Salaire du vendeur, septembre', 320_000);
  ajouter('2026-09-30', 'recette', 'caisse', 'ventes', 'Ventes de fin de mois', 2_240_000);
  ajouter('2026-09-30', 'depense', 'caisse', 'prelevement', 'Prélèvement pour le ménage, septembre', 700_000);

  // Octobre
  ajouter('2026-10-02', 'depense', 'banque', 'loyers', 'Loyer du dépôt, octobre', 450_000);
  ajouter('2026-10-03', 'recette', 'caisse', 'ventes', 'Ventes de la semaine', 2_105_000);
  ajouter('2026-10-06', 'depense', 'caisse', 'achats_marchandises', 'Boissons, dépôt Bralima', 1_340_000);
  ajouter('2026-10-08', 'recette', 'orange', 'ventes', 'Ventes payées par Orange Money', 92_000);
  ajouter('2026-10-10', 'recette', 'caisse', 'ventes', 'Ventes de la semaine', 2_380_000);
  ajouter('2026-10-13', 'depense', 'caisse', 'autres_depenses', "Réparation de l'étagère", 60_000, { piece: false });
  ajouter('2026-10-14', 'depense', 'banque', 'impots_taxes', "Taxe communale sur l'enseigne", 95_000);
  ajouter('2026-10-17', 'recette', 'caisse', 'ventes', 'Ventes de la semaine', 2_210_000);
  ajouter('2026-10-18', 'recette', 'mpesa', 'ventes', 'Ventes payées par M-Pesa', 214_000);
  ajouter('2026-10-20', 'depense', 'caisse', 'achats_marchandises', 'Conserves et savon (380 $ au taux 2 850)', 380 * TAUX_PROTOTYPE);
  ajouter('2026-10-24', 'recette', 'caisse', 'ventes', 'Ventes de la semaine', 2_460_000);
  ajouter('2026-10-27', 'depense', 'mpesa', 'autres_depenses', 'Livraison par moto', 25_000, { piece: false });

  return {
    entreprise: { nom: 'Alimentation Maman Nsimba (fictif)', secteur: 'negoce', nif: 'démo A0000000' },
    exercice: { annee: 2026, debut: '2026-01-01', fin: '2026-12-31' },
    comptes: [
      { id: 'caisse', type: 'caisse', libelle: 'Caisse', devise: 'CDF' },
      { id: 'mpesa', type: 'mobile', libelle: 'M-Pesa', devise: 'CDF' },
      { id: 'orange', type: 'mobile', libelle: 'Orange Money', devise: 'CDF' },
      { id: 'banque', type: 'banque', libelle: 'Banque', devise: 'CDF' },
    ],
    soldesOuverture: { caisse: 1_850_000, mpesa: 240_000, orange: 60_000, banque: 3_900_000 },
    tauxOuverture: null,
    empruntOuverture: 0,
    operations,
    creances: [
      { id: 'c-1', date: '2025-12-20', facture: 'V-118', nom: 'Restaurant Chez Tantine', nature: 'ventes', montant: 520_000, devise: 'CDF', taux: null },
      { id: 'c-2', date: '2025-12-28', facture: 'V-121', nom: 'École primaire Lisanga', nature: 'ventes', montant: 280_000, devise: 'CDF', taux: null },
      { id: 'c-3', date: '2026-09-09', facture: 'V-204', nom: 'Restaurant Chez Tantine', nature: 'ventes', montant: 610_000, devise: 'CDF', taux: null },
      { id: 'c-4', date: '2026-10-11', facture: 'V-219', nom: 'Paroisse Saint-Pierre, kermesse', nature: 'ventes', montant: 385_000, devise: 'CDF', taux: null },
      { id: 'c-5', date: '2026-10-22', facture: 'V-226', nom: 'M. Kalala, voisin', nature: 'ventes', montant: 74_000, devise: 'CDF', taux: null },
    ],
    dettes: [
      { id: 'd-1', date: '2025-12-23', facture: 'F-3390', nom: 'Ets Mukoko', nature: 'achats_marchandises', montant: 1_150_000, devise: 'CDF', taux: null },
      { id: 'd-2', date: '2026-10-21', facture: 'F-5120', nom: 'Ets Mukoko', nature: 'achats_marchandises', montant: 1_480_000, devise: 'CDF', taux: null },
      { id: 'd-3', date: '2026-10-25', facture: 'B-0877', nom: 'Dépôt de boissons du quartier', nature: 'achats_marchandises', montant: 690_000, devise: 'CDF', taux: null },
    ],
    immobilisations: [
      { id: 'i-1', date: '2023-03-10', designation: 'Étagères métalliques', categorie: 'mobilier', montant: 1_800_000, duree: 5 },
      { id: 'i-2', date: '2024-06-02', designation: 'Balance électronique', categorie: 'materiel', montant: 420_000, duree: 5 },
      { id: 'i-3', date: '2026-09-27', designation: 'Congélateur pour les boissons', categorie: 'materiel', montant: 650 * TAUX_PROTOTYPE, duree: 5, operation: congelateur },
    ],
    stockInitial: 6_500_000,
    stockFinal: 7_350_000,
    tauxCloture: null,
  };
}
