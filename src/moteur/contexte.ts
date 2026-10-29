/**
 * Index interne d'un dossier, construit une fois par calcul.
 * Suppose un dossier déjà validé.
 */
import { versFC } from './montants';
import type { CompteTresorerie, DateISO, DossierExercice, Montant, Operation } from './types';

export interface Contexte {
  dossier: DossierExercice;
  comptes: Map<string, CompteTresorerie>;
  /** Triées par date ; à date égale, l'ordre de saisie est conservé. */
  operations: readonly Operation[];
  parId: Map<string, Operation>;
  /** Opération annulée → son annulation. */
  annulations: Map<string, Operation>;
  confirmations: Map<string, number>;
}

export function preparer(dossier: DossierExercice): Contexte {
  const operations = [...dossier.operations].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const annulations = new Map<string, Operation>();
  for (const op of operations) if (op.annule) annulations.set(op.annule, op);
  return {
    dossier,
    comptes: new Map(dossier.comptes.map((c) => [c.id, c])),
    operations,
    parId: new Map(operations.map((o) => [o.id, o])),
    annulations,
    confirmations: new Map(dossier.confirmationsTaux.map((c) => [c.operation, c.taux])),
  };
}

export function compte(ctx: Contexte, id: string): CompteTresorerie {
  const c = ctx.comptes.get(id);
  if (!c) throw new Error(`Compte inconnu : ${id}`);
  return c;
}

/** +1 pour une opération, −1 pour une annulation (contre-passation). */
export const signe = (op: Operation): 1 | -1 => (op.annule ? -1 : 1);

/** Vrai si l'opération est contre-passée à la date donnée ou avant. */
export function estAnnuleeAu(ctx: Contexte, id: string, date: DateISO): boolean {
  const a = ctx.annulations.get(id);
  return a !== undefined && a.date <= date;
}

/** Taux confirmé par l'expert s'il existe, sinon taux de la saisie. Une annulation suit son original. */
export function tauxEffectif(ctx: Contexte, op: Operation): number | null {
  return ctx.confirmations.get(op.annule ?? op.id) ?? op.taux;
}

/** Montant crédité sur le compte de destination d'un transfert. */
export function montantRecu(ctx: Contexte, op: Operation): Montant {
  const source = compte(ctx, op.compte);
  const dest = compte(ctx, op.compteDestination ?? '');
  return source.devise === dest.devise ? op.montant : (op.montantDestination ?? 0);
}

/**
 * Valeur en francs d'une opération, avant signe.
 * Un change entre dollars et francs vaut le montant en francs réellement échangé : il ne touche pas le résultat.
 */
export function valeurFC(ctx: Contexte, op: Operation): Montant {
  const source = compte(ctx, op.compte);
  if (op.type !== 'transfert') return versFC(op.montant, source.devise, tauxEffectif(ctx, op));
  const dest = compte(ctx, op.compteDestination ?? '');
  if (source.devise === 'CDF') return op.montant;
  if (dest.devise === 'CDF') return montantRecu(ctx, op);
  return versFC(op.montant, 'USD', tauxEffectif(ctx, op));
}

export interface Mouvement {
  compte: string;
  /** Dans la devise du compte, signé. */
  natif: Montant;
  /** En francs, signé. */
  fc: Montant;
}

/** Effet d'une opération sur chaque compte touché. */
export function mouvements(ctx: Contexte, op: Operation): Mouvement[] {
  const s = signe(op);
  const v = valeurFC(ctx, op);
  if (op.type === 'recette') return [{ compte: op.compte, natif: s * op.montant, fc: s * v }];
  if (op.type === 'depense') return [{ compte: op.compte, natif: -s * op.montant, fc: -s * v }];
  return [
    { compte: op.compte, natif: -s * op.montant, fc: -s * v },
    { compte: op.compteDestination ?? '', natif: s * montantRecu(ctx, op), fc: s * v },
  ];
}

/** Solde d'ouverture d'un compte, dans sa devise et en francs au taux d'ouverture. */
export function ouverture(ctx: Contexte, id: string): { natif: Montant; fc: Montant } {
  const natif = ctx.dossier.soldesOuverture[id] ?? 0;
  return { natif, fc: versFC(natif, compte(ctx, id).devise, ctx.dossier.tauxOuverture) };
}
