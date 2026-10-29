/** Petits constructeurs pour les tests. Données fictives. */
import type { DossierExercice, Operation } from '../../src/moteur';

export function dossierDeBase(p: Partial<DossierExercice> = {}): DossierExercice {
  return {
    entreprise: { nom: 'Boutique de test (fictif)', secteur: 'negoce' },
    exercice: { annee: 2026, debut: '2026-01-01', fin: '2026-12-31' },
    comptes: [
      { id: 'caisse', type: 'caisse', libelle: 'Caisse', devise: 'CDF' },
      { id: 'banque', type: 'banque', libelle: 'Banque', devise: 'CDF' },
    ],
    soldesOuverture: { caisse: 1_000_000, banque: 2_000_000 },
    tauxOuverture: null,
    empruntOuverture: 0,
    operations: [],
    creances: [],
    dettes: [],
    immobilisations: [],
    stockInitial: 500_000,
    stockFinal: 500_000,
    tauxCloture: null,
    ...p,
  };
}

let compteur = 0;

export function op(p: Partial<Operation> & Pick<Operation, 'type' | 'nature' | 'montant'>): Operation {
  return {
    id: `op-${++compteur}`,
    date: '2026-03-10',
    compte: 'caisse',
    libelle: 'Opération de test',
    devise: 'CDF',
    taux: null,
    piece: true,
    ...p,
  };
}

/** Contre-passation d'une opération (D5). */
export function annulation(cible: Operation, date: string, id = `annul-${cible.id}`): Operation {
  return { ...cible, id, date, libelle: `Annulation : ${cible.libelle}`, annule: cible.id };
}
