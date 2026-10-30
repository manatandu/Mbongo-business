/**
 * Registre des immobilisations (note 1).
 * Amortissement linéaire sans prorata temporis : annuité entière l'année d'acquisition.
 * D1 : pas de dotation l'année de la sortie ; la valeur nette du bien sorti va dans F.
 * D6 : une caution n'est pas amortie.
 */
import { estAnnuleeAu, valeurFC, type Contexte } from './contexte';
import { anneeDe } from './dates';
import type { DateISO, Immobilisation, Montant } from './types';

export const estAmortissable = (i: Immobilisation): boolean => i.categorie !== 'caution';

/** Valeur d'origine en francs : celle de l'opération d'achat si elle est dans le dossier. */
export function montantImmobilisation(ctx: Contexte, i: Immobilisation): Montant {
  const op = i.operation ? ctx.parId.get(i.operation) : undefined;
  return op ? valeurFC(ctx, op) : i.montant;
}

/**
 * Dotation d'une année. Annuité = montant ÷ durée arrondi à l'entier inférieur ;
 * la dernière annuité prend le reste, pour que le cumul égale exactement la valeur d'origine.
 */
export function dotationAnnuelle(i: Immobilisation, montant: Montant, annee: number): Montant {
  if (!estAmortissable(i)) return 0;
  const rang = annee - anneeDe(i.date);
  if (rang < 0 || rang >= i.duree) return 0;
  if (i.sortie && anneeDe(i.sortie.date) <= annee) return 0;
  const base = Math.floor(montant / i.duree);
  return rang === i.duree - 1 ? montant - base * (i.duree - 1) : base;
}

/** Amortissements cumulés jusqu'à la fin de l'année donnée. */
export function cumulAmortissements(i: Immobilisation, montant: Montant, annee: number): Montant {
  let cumul = 0;
  for (let a = anneeDe(i.date); a <= annee; a++) cumul += dotationAnnuelle(i, montant, a);
  return cumul;
}

export interface AnneeAmortissement {
  annee: number;
  dotation: Montant;
  cumul: Montant;
  valeurNette: Montant;
}

/**
 * Tableau d'amortissement d'un bien, année par année (Titre X, ch. 1 : « mode linéaire sans prorata temporis »).
 * S'arrête à l'année de la sortie si le bien est sorti avant la fin de sa durée.
 */
export function tableauAmortissement(i: Immobilisation, montant: Montant): AnneeAmortissement[] {
  if (!estAmortissable(i)) return [];
  const debut = anneeDe(i.date);
  const fin = Math.min(debut + i.duree - 1, i.sortie ? anneeDe(i.sortie.date) : Infinity);
  const lignes: AnneeAmortissement[] = [];
  let cumul = 0;
  for (let a = debut; a <= fin; a++) {
    const dotation = dotationAnnuelle(i, montant, a);
    cumul += dotation;
    lignes.push({ annee: a, dotation, cumul, valeurNette: montant - cumul });
  }
  return lignes;
}

export interface LigneRegistre {
  immobilisation: Immobilisation;
  montant: Montant;
  presenteOuverture: boolean;
  vncOuverture: Montant;
  acquiseDansExercice: boolean;
  dotation: Montant;
  cumul: Montant;
  vncCloture: Montant;
  sortie: { date: DateISO; prixCession: Montant; vnc: Montant } | null;
}

/** Registre à une date de l'exercice. */
export function registre(ctx: Contexte, ref: DateISO): LigneRegistre[] {
  const { annee, debut } = ctx.dossier.exercice;
  const lignes: LigneRegistre[] = [];
  for (const i of ctx.dossier.immobilisations) {
    if (i.date > ref) continue;
    if (i.sortie && i.sortie.date < debut) continue;
    // Un achat contre-passé disparaît du registre à la date de l'annulation.
    if (i.operation && estAnnuleeAu(ctx, i.operation, ref)) continue;

    const montant = montantImmobilisation(ctx, i);
    const presenteOuverture = i.date < debut;
    const cumulAvant = cumulAmortissements(i, montant, annee - 1);
    const vncOuverture = presenteOuverture ? montant - cumulAvant : 0;
    const sortieDansPeriode = i.sortie !== undefined && i.sortie.date <= ref;

    if (sortieDansPeriode && i.sortie) {
      const op = i.sortie.operation ? ctx.parId.get(i.sortie.operation) : undefined;
      lignes.push({
        immobilisation: i,
        montant,
        presenteOuverture,
        vncOuverture,
        acquiseDansExercice: !presenteOuverture,
        dotation: 0,
        cumul: cumulAvant,
        vncCloture: 0,
        sortie: { date: i.sortie.date, prixCession: op ? valeurFC(ctx, op) : i.sortie.prixCession, vnc: montant - cumulAvant },
      });
      continue;
    }

    const dotation = dotationAnnuelle(i, montant, annee);
    const cumul = cumulAvant + dotation;
    lignes.push({
      immobilisation: i,
      montant,
      presenteOuverture,
      vncOuverture,
      acquiseDansExercice: !presenteOuverture,
      dotation,
      cumul,
      vncCloture: montant - cumul,
      sortie: null,
    });
  }
  return lignes;
}
