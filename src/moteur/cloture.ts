/**
 * Passage de l'exercice N à l'ouverture de N+1.
 * Compte exploitant N+1 = compte exploitant N + résultat N.
 */
import { preparer } from './contexte';
import { calculerEtats } from './etats';
import { montantImmobilisation } from './immobilisations';
import { encoursA } from './tiers';
import { calculerSoldes } from './tresorerie';
import { ErreurDossier } from './validation';
import type { DossierExercice, Exercice, GenreTiers, Immobilisation, Montant, PieceTiers } from './types';

export interface OuvertureSuivante {
  exercice: Exercice;
  soldesOuverture: Record<string, Montant>;
  tauxOuverture: number | null;
  stockInitial: Montant;
  empruntOuverture: Montant;
  creances: PieceTiers[];
  dettes: PieceTiers[];
  immobilisations: Immobilisation[];
  /** Pour contrôle : doit égaler le compte exploitant d'ouverture recalculé sur N+1. */
  compteExploitant: Montant;
}

export function cloturer(dossier: DossierExercice): OuvertureSuivante {
  const etats = calculerEtats(dossier);
  if (dossier.stockFinal === null) throw new ErreurDossier(["Clôture impossible : l'inventaire du stock final n'est pas fait."]);
  const ctx = preparer(dossier);
  const { fin, annee } = dossier.exercice;
  const soldes = calculerSoldes(ctx, fin);

  const reporter = (genre: GenreTiers, lignes: PieceTiers[]): PieceTiers[] =>
    lignes.flatMap((l) => {
      const reste = encoursA(ctx, genre, l, fin);
      return reste > 0 ? [{ ...l, regleAvant: l.montant - reste }] : [];
    });
  const creances = reporter('creance', dossier.creances);
  const dettes = reporter('dette', dossier.dettes);

  const dollars =
    [...soldes.values()].some((s) => s.compte.devise === 'USD' && s.natif !== 0) ||
    [...creances, ...dettes].some((l) => l.devise === 'USD');
  if (dollars && dossier.tauxCloture === null) throw new ErreurDossier(['Clôture impossible : taux de clôture du dollar manquant.']);

  const immobilisations = dossier.immobilisations
    .filter((i) => !(i.sortie && i.sortie.date <= fin) && !(i.operation && ctx.annulations.has(i.operation)))
    .map((i) => ({ ...i, montant: montantImmobilisation(ctx, i) }));

  return {
    exercice: { annee: annee + 1, debut: `${annee + 1}-01-01`, fin: `${annee + 1}-12-31` },
    soldesOuverture: Object.fromEntries([...soldes.values()].map((s) => [s.compte.id, s.natif])),
    tauxOuverture: dossier.tauxCloture,
    stockInitial: dossier.stockFinal,
    empruntOuverture: etats.bilan.passif.emprunt,
    creances,
    dettes,
    immobilisations,
    compteExploitant: etats.bilan.passif.compteExploitant + etats.bilan.passif.resultat,
  };
}

/** Dossier vide de l'exercice suivant, prêt à recevoir les saisies. */
export function dossierSuivant(dossier: DossierExercice): DossierExercice {
  const o = cloturer(dossier);
  return {
    entreprise: dossier.entreprise,
    exercice: o.exercice,
    comptes: dossier.comptes,
    soldesOuverture: o.soldesOuverture,
    tauxOuverture: o.tauxOuverture,
    empruntOuverture: o.empruntOuverture,
    operations: [],
    creances: o.creances,
    dettes: o.dettes,
    immobilisations: o.immobilisations,
    stockInitial: o.stockInitial,
    stockFinal: null,
    confirmationsTaux: [],
    tauxCloture: null,
  };
}
