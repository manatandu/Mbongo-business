/**
 * Fin d'année : le commerçant compte son stock, puis commence l'année suivante.
 * L'arrêté des états par l'expert-comptable partenaire vient après, sans bloquer les saisies de janvier.
 */
import { cloturer, ErreurDossier, type DateISO } from '../moteur';
import type { BaseMbongo } from './base';
import type { Chargement } from './dossier';
import { nouvelId } from './ids';
import { ErreurSaisie } from './saisie';

/** Vrai si le prix du dollar au 31 décembre doit être donné pour commencer l'année suivante. */
/** Le taux du 31 décembre est demandé dès qu'il y a des dollars : un compte, une créance ou une dette en USD. */
export const tauxClotureDemande = (c: Chargement): boolean =>
  c.exercice.tauxCloture === null && (c.comptes.some((x) => x.devise === 'USD') || [...c.dossier.creances, ...c.dossier.dettes].some((l) => l.devise === 'USD'));

/** Ce qui manque pour commencer l'année suivante. Vide : on peut y aller. */
export function obstaclesAnneeSuivante(c: Chargement, aujourdhui: DateISO): string[] {
  const r: string[] = [];
  if (aujourdhui <= c.exercice.fin) r.push(`L'année ${c.exercice.annee} n'est pas finie.`);
  if (c.exercice.stockFinal === null) r.push("Faites d'abord l'inventaire du stock.");
  return r;
}

/**
 * Ouvre l'exercice suivant à partir de la clôture de celui-ci (soldes, stock, factures et matériel reportés).
 * `taux` : prix du dollar au 31 décembre, si personne ne l'a encore saisi. L'expert peut le corriger avant l'arrêté ;
 * l'ouverture de l'année suivante suit alors toute seule (voir chargerDossier).
 */
export async function ouvrirExerciceSuivant(db: BaseMbongo, c: Chargement, aujourdhui: DateISO, taux?: number): Promise<string> {
  const obstacles = obstaclesAnneeSuivante(c, aujourdhui);
  if (obstacles.length) throw new ErreurSaisie(obstacles);
  const annee = c.exercice.annee + 1;
  const deja = await db.exercices.where('entrepriseId').equals(c.entreprise.id).filter((e) => e.annee === annee).count();
  if (deja) throw new ErreurSaisie([`L'année ${annee} est déjà commencée.`]);
  if (taux !== undefined && !(taux > 0)) throw new ErreurSaisie(['Prix du dollar invalide.']);

  const tauxCloture = c.exercice.tauxCloture ?? taux ?? null;
  let o;
  try {
    o = cloturer({ ...c.dossier, tauxCloture });
  } catch (x) {
    if (x instanceof ErreurDossier) throw new ErreurSaisie(x.erreurs.map((m) => (/taux de clôture/.test(m) ? 'Donnez le prix du dollar au 31 décembre.' : m)));
    throw x;
  }

  const id = nouvelId();
  await db.transaction('rw', db.exercices, async () => {
    if (tauxCloture !== c.exercice.tauxCloture) await db.exercices.update(c.exercice.id, { tauxCloture });
    await db.exercices.add({
      id,
      entrepriseId: c.entreprise.id,
      annee,
      debut: o.exercice.debut,
      fin: o.exercice.fin,
      statut: 'ouvert',
      soldesOuverture: o.soldesOuverture,
      tauxOuverture: o.tauxOuverture,
      empruntOuverture: o.empruntOuverture,
      stockInitial: o.stockInitial,
      stockFinal: null,
      tauxCloture: null,
    });
  });
  return id;
}
