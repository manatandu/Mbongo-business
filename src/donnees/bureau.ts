/**
 * Bureau de la structure : l'assistant consulte et contrôle, l'expert-comptable partenaire arrête les états.
 * L'assistant n'écrit rien dans le dossier du commerçant (loi n° 15/002, art. 43.1).
 */
import { calculerEtats, controler, ligneBilan, versFC, type Bilan, type DateISO, type DossierExercice, type Etats } from '../moteur';
import type { BaseMbongo } from './base';
import type { Chargement } from './dossier';
import { PARAMETRES_CONTROLE } from './parametres';
import { ecrireReglage, lireReglage } from './reglages';
import { ErreurSaisie } from './saisie';

/** Résumé d'un dossier pour la liste des clients. */
/** AUDCIF, art. 23 : les états sont arrêtés au plus tard dans les quatre mois qui suivent la clôture, soit le 30 avril. */
export const limiteArrete = (annee: number): DateISO => `${annee + 1}-04-30`;

export function resumeDossier(c: Chargement, aujourdhui: DateISO) {
  const ref = aujourdhui > c.exercice.fin ? c.exercice.fin : aujourdhui;
  const anomalies = controler(c.dossier, ref, PARAMETRES_CONTROLE).filter((a) => a.niveau !== 'information');
  const etats = calculerEtats(c.dossier, { auDate: ref });
  const derniere = c.dossier.operations.reduce((m, o) => (o.date > m ? o.date : m), '');
  return {
    derniereSaisie: derniere || null,
    ventes: etats.compteDeResultat.recettesVentes,
    resultat: etats.compteDeResultat.G,
    aTraiter: anomalies.filter((a) => a.niveau === 'a_traiter').length,
    aRevoir: anomalies.filter((a) => a.niveau === 'a_revoir').length,
    anomalies,
  };
}

/** Ce qui empêche encore l'arrêté ; liste vide : l'expert peut arrêter. */
export function obstaclesArrete(c: Chargement, aujourdhui: DateISO): string[] {
  const { dossier, exercice } = c;
  const obstacles: string[] = [];
  if (aujourdhui < exercice.fin) obstacles.push(`L'exercice se termine le 31/12/${exercice.annee}.`);
  if (exercice.stockFinal === null) obstacles.push("Le commerçant n'a pas encore validé l'inventaire du stock.");
  const dollars = dossier.comptes.some((x) => x.devise === 'USD') || [...dossier.creances, ...dossier.dettes].some((l) => l.devise === 'USD');
  if (dollars && exercice.tauxCloture === null) obstacles.push('Saisissez le taux du dollar au 31 décembre.');
  return obstacles;
}

export async function definirTauxCloture(db: BaseMbongo, exerciceId: string, taux: number): Promise<void> {
  if (!(taux > 0)) throw new ErreurSaisie(['Taux invalide.']);
  const ex = await db.exercices.get(exerciceId);
  if (!ex) throw new ErreurSaisie(['Exercice introuvable.']);
  if (ex.statut === 'arrete') throw new ErreurSaisie(['Les états sont arrêtés.']);
  await db.exercices.update(exerciceId, { tauxCloture: taux });
}

/** L'expert-comptable partenaire inscrit à l'Ordre (ONEC) : demandé une fois au bureau, repris à chaque arrêté. */
export interface IdentiteExpert {
  nom: string;
  /** N° d'inscription au tableau de l'Ordre national des experts-comptables. */
  onec: string;
}

const CLE_EXPERT = 'bureau.expert';

export const lireIdentiteExpert = (db: BaseMbongo): Promise<IdentiteExpert | null> => lireReglage<IdentiteExpert | null>(db, CLE_EXPERT, null);

function verifierExpert(x: IdentiteExpert | null | undefined): IdentiteExpert {
  const nom = x?.nom.trim() ?? '';
  const onec = x?.onec.trim() ?? '';
  const manque = [...(nom ? [] : ["Indiquez le nom de l'expert-comptable partenaire."]), ...(onec ? [] : ["Indiquez son n° d'inscription à l'ONEC."])];
  if (manque.length) throw new ErreurSaisie(manque);
  return { nom, onec };
}

export async function enregistrerIdentiteExpert(db: BaseMbongo, x: IdentiteExpert): Promise<void> {
  await ecrireReglage(db, CLE_EXPERT, verifierExpert(x));
}

/**
 * Trace des arrêtés d'un exercice, en ajout seulement : l'arrêté en cours, et chaque arrêté annulé avec sa date d'annulation
 * (AUDCIF, art. 22.2 : pas d'effacement sans trace).
 */
export interface TraceArrete {
  arrete: { arreteLe: DateISO; expert: IdentiteExpert | null } | null;
  annules: { arreteLe: DateISO; expert: IdentiteExpert | null; annuleLe: DateISO }[];
}

const cleArrete = (exerciceId: string) => `arrete:${exerciceId}`;

export const lireTraceArrete = (db: BaseMbongo, exerciceId: string): Promise<TraceArrete> => lireReglage<TraceArrete>(db, cleArrete(exerciceId), { arrete: null, annules: [] });

const jj = (d: DateISO) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

/**
 * Formule de l'arrêté. Les états sont l'œuvre du responsable de l'entité (AUDCIF, art. 71 ; Titre X, ch. 1) ;
 * l'expert-comptable partenaire les a revus (loi n° 15/002, art. 43).
 */
export function formuleArrete(arreteLe: DateISO, expert: IdentiteExpert | null): string {
  const qui = expert ? ` ${expert.nom}, n° d'inscription ONEC ${expert.onec}` : '';
  return `Arrêtés le ${jj(arreteLe)} par le responsable de l'entité, après revue de l'expert-comptable partenaire${qui}`;
}

/**
 * L'expert arrête les états : le téléphone ne peut plus saisir sur cet exercice. Son nom et son n° ONEC sont gardés avec l'arrêté.
 * Sans identité passée, celle enregistrée au bureau est reprise ; le bouton du bureau l'exige toujours.
 */
export async function arreterEtats(db: BaseMbongo, c: Chargement, aujourdhui: DateISO, expert?: IdentiteExpert | null): Promise<void> {
  const obstacles = obstaclesArrete(c, aujourdhui);
  if (obstacles.length) throw new ErreurSaisie(obstacles);
  const x = expert !== undefined ? verifierExpert(expert) : await lireIdentiteExpert(db);
  await db.transaction('rw', db.exercices, db.reglages, async () => {
    const trace = await lireTraceArrete(db, c.exercice.id);
    await ecrireReglage(db, cleArrete(c.exercice.id), { ...trace, arrete: { arreteLe: aujourdhui, expert: x } } satisfies TraceArrete);
    await db.exercices.update(c.exercice.id, { statut: 'arrete', arreteLe: aujourdhui });
  });
}

/** L'expert annule son arrêté (une saisie oubliée, par exemple) : le commerçant peut de nouveau saisir. L'arrêté annulé reste dans la trace. */
export async function annulerArrete(db: BaseMbongo, exerciceId: string, le: DateISO): Promise<void> {
  await db.transaction('rw', db.exercices, db.reglages, async () => {
    const ex = await db.exercices.get(exerciceId);
    if (!ex) throw new ErreurSaisie(['Exercice introuvable.']);
    if (ex.statut !== 'arrete') return;
    const trace = await lireTraceArrete(db, exerciceId);
    const arreteLe = ex.arreteLe ?? trace.arrete?.arreteLe ?? le;
    await ecrireReglage(db, cleArrete(exerciceId), { arrete: null, annules: [...trace.annules, { arreteLe, expert: trace.arrete?.expert ?? null, annuleLe: le }] } satisfies TraceArrete);
    await db.exercices.update(exerciceId, { statut: 'ouvert', arreteLe: null });
  });
}

/**
 * Bilan d'ouverture, pour la colonne N-1 la première année tenue dans Mbongo (AUDCIF, art. 34 al. 4).
 * Tiré des soldes d'ouverture du dossier et des montants d'ouverture que le moteur a déjà calculés :
 * le compte exploitant d'ouverture équilibre l'actif et le passif par construction.
 * Null si un solde en dollars n'a pas de taux d'ouverture.
 */
export function bilanOuverture(d: DossierExercice, e: Etats): Bilan | null {
  let caisse = 0;
  let banque = 0;
  try {
    for (const c of d.comptes) {
      const v = versFC(d.soldesOuverture[c.id] ?? 0, c.devise, d.tauxOuverture);
      if (ligneBilan(c.type) === 'caisse') caisse += v;
      else banque += v;
    }
  } catch {
    return null;
  }
  const stocks = e.notes.note2.stockInitial;
  const creances = e.notes.note3.creances.ouverture;
  const dettes = e.notes.note3.dettes.ouverture;
  const compteExploitant = e.bilan.compteExploitant.ouverture;
  const emprunt = d.empruntOuverture;
  // ceOuverture = trésorerie + stocks + créances + immobilisations − dettes − emprunt (moteur, etats.ts).
  const immobilisations = compteExploitant - caisse - banque - stocks - creances + dettes + emprunt;
  const totalActif = immobilisations + stocks + creances + caisse + banque;
  const totalPassif = compteExploitant + emprunt + dettes;
  return {
    actif: { immobilisations, stocks, creances, caisse, banque, total: totalActif },
    passif: { compteExploitant, resultat: 0, emprunt, dettes, total: totalPassif },
    equilibre: totalActif === totalPassif,
    compteExploitant: { ouverture: compteExploitant, apports: 0, prelevements: 0 },
  };
}

/**
 * L'expert-comptable rouvre un inventaire validé (erreur de comptage, validation trop tôt).
 * Impossible une fois les états arrêtés, ou si l'année suivante est déjà ouverte : son stock initial en dépend.
 */
export async function rouvrirInventaire(db: BaseMbongo, exerciceId: string): Promise<void> {
  const ex = await db.exercices.get(exerciceId);
  if (!ex) throw new ErreurSaisie(['Exercice introuvable.']);
  if (ex.statut === 'arrete') throw new ErreurSaisie(["Les états sont arrêtés : annulez d'abord l'arrêté."]);
  if (ex.stockFinal === null) return;
  const suivant = await db.exercices.where('[entrepriseId+annee]').equals([ex.entrepriseId, ex.annee + 1]).first();
  if (suivant) throw new ErreurSaisie([`L'année ${ex.annee + 1} est déjà commencée sur son stock : l'inventaire ne se rouvre plus.`]);
  await db.exercices.update(exerciceId, { stockFinal: null, statut: 'ouvert' });
}
