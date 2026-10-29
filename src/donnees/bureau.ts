/**
 * Actions du bureau : assistant de la structure et expert-comptable partenaire.
 * L'assistant n'écrit jamais une opération du commerçant (loi n° 15/002, art. 43.1) :
 * il saisit des taux, prépare l'inventaire, contrôle. L'expert confirme les taux et arrête les états.
 * Tant que le serveur n'existe pas (étape 3), ces règles sont tenues par l'interface ;
 * elles passeront ensuite dans les règles de sécurité de la base.
 */
import { calculerEtats, controler, VERSION_MOTEUR, type DateISO, type Etats } from '../moteur';
import type { BaseMbongo } from './base';
import { chargerDossier, type Chargement } from './dossier';
import { nouvelId } from './ids';
import { ErreurSaisie } from './saisie';
import type { ActionIntervention, RoleBureau } from './types';

export async function tracer(
  db: BaseMbongo,
  role: RoleBureau,
  action: ActionIntervention,
  detail: string,
  entrepriseId: string | null = null,
  exerciceId: string | null = null,
): Promise<void> {
  await db.interventions.add({ id: nouvelId(), entrepriseId, exerciceId, le: new Date().toISOString(), role, action, detail });
}

/** Taux du jour saisi par l'assistant, proposé ensuite sur les téléphones. */
export async function saisirTaux(db: BaseMbongo, date: DateISO, valeur: number): Promise<void> {
  if (!(valeur > 0)) throw new ErreurSaisie(['Taux invalide.']);
  await db.taux.add({ id: nouvelId(), date, valeur, source: 'assistant' });
  await tracer(db, 'assistant', 'taux_saisi', `${date} : 1 $ = ${valeur} FC`);
}

/** L'expert confirme (ou corrige) le taux d'une opération en dollars. L'opération reste intacte. */
export async function confirmerTaux(db: BaseMbongo, exerciceId: string, operationId: string, taux: number): Promise<void> {
  if (!(taux > 0)) throw new ErreurSaisie(['Taux invalide.']);
  const { entreprise, dossier, exercice } = await chargerDossier(db, exerciceId);
  verifierOuvert(exercice.statut);
  const op = dossier.operations.find((o) => o.id === operationId);
  if (!op || op.devise !== 'USD') throw new ErreurSaisie(['Opération en dollars introuvable.']);
  await db.confirmations.add({ id: nouvelId(), entrepriseId: entreprise.id, operation: operationId, taux });
  await tracer(db, 'expert', 'taux_confirme', `${op.date} · ${op.libelle} : ${op.taux ?? '?'} → ${taux}`, entreprise.id, exerciceId);
}

export async function definirTauxCloture(db: BaseMbongo, exerciceId: string, taux: number): Promise<void> {
  if (!(taux > 0)) throw new ErreurSaisie(['Taux invalide.']);
  const ex = await db.exercices.get(exerciceId);
  if (!ex) throw new ErreurSaisie(['Exercice introuvable.']);
  verifierOuvert(ex.statut);
  await db.exercices.update(exerciceId, { tauxCloture: taux });
  await tracer(db, 'expert', 'taux_cloture', `31/12/${ex.annee} : 1 $ = ${taux} FC`, ex.entrepriseId, exerciceId);
}

function verifierOuvert(statut: string): void {
  if (statut === 'arrete' || statut === 'clos') throw new ErreurSaisie(['Exercice arrêté : rouvrez-le d’abord.']);
}

export interface Condition {
  libelle: string;
  ok: boolean;
  detail?: string;
}

/** Conditions de l'arrêté. Toutes doivent être remplies. */
export function conditionsArrete(c: Chargement, aujourdhui: DateISO): Condition[] {
  const { dossier, exercice } = c;
  const usd = dossier.operations.filter((o) => o.devise === 'USD' && !o.annule && o.type !== 'transfert');
  const nonConfirmees = usd.filter((o) => !dossier.confirmationsTaux.some((x) => x.operation === o.id));
  const dollars = dossier.comptes.some((x) => x.devise === 'USD') || [...dossier.creances, ...dossier.dettes].some((l) => l.devise === 'USD');
  const etats = calculerEtats(dossier, { auDate: aujourdhui > exercice.fin ? exercice.fin : aujourdhui });
  return [
    { libelle: 'Exercice terminé', ok: aujourdhui >= exercice.fin, detail: `clôture le ${exercice.fin.slice(8, 10)}/${exercice.fin.slice(5, 7)}/${exercice.fin.slice(0, 4)}` },
    { libelle: 'Inventaire du stock validé par le commerçant', ok: exercice.stockFinal !== null },
    { libelle: 'Taux de clôture du dollar saisi', ok: !dollars || exercice.tauxCloture !== null, detail: dollars ? undefined : 'sans objet' },
    { libelle: 'Taux des opérations en dollars confirmés', ok: nonConfirmees.length === 0, detail: nonConfirmees.length ? `${nonConfirmees.length} à confirmer` : undefined },
    { libelle: 'Bilan équilibré', ok: etats.bilan.equilibre },
  ];
}

async function empreinte(texte: string): Promise<string> {
  const o = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte)));
  return [...o].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** L'expert arrête les états : instantané figé, empreinte, exercice fermé à la saisie. */
export async function arreterEtats(db: BaseMbongo, exerciceId: string, auteur: string, aujourdhui: DateISO): Promise<string> {
  const c = await chargerDossier(db, exerciceId);
  verifierOuvert(c.exercice.statut);
  const manquantes = conditionsArrete(c, aujourdhui).filter((x) => !x.ok);
  if (manquantes.length) throw new ErreurSaisie(manquantes.map((x) => `Condition non remplie : ${x.libelle}.`));
  const etats: Etats = calculerEtats(c.dossier);
  const texte = JSON.stringify(etats);
  const id = nouvelId();
  const le = new Date().toISOString();
  const hash = await empreinte(texte);
  await db.transaction('rw', [db.arretes, db.exercices, db.interventions], async () => {
    await db.arretes.add({ id, entrepriseId: c.entreprise.id, exerciceId, le, auteur, etats: texte, empreinte: hash, versionMoteur: VERSION_MOTEUR, nombreOperations: c.dossier.operations.length });
    await db.exercices.update(exerciceId, { statut: 'arrete' });
    await tracer(db, 'expert', 'arrete', `États ${c.exercice.annee} arrêtés, résultat ${etats.compteDeResultat.G} FC, empreinte ${hash.slice(0, 12)}…`, c.entreprise.id, exerciceId);
  });
  return id;
}

/** Vérifie qu'un arrêté n'a pas été altéré : l'empreinte recalculée doit être identique. */
export async function verifierArrete(db: BaseMbongo, arreteId: string): Promise<boolean> {
  const a = await db.arretes.get(arreteId);
  return a !== undefined && (await empreinte(a.etats)) === a.empreinte;
}

/** Réouverture par l'expert, motivée et tracée. L'arrêté précédent reste conservé. */
export async function rouvrirExercice(db: BaseMbongo, exerciceId: string, motif: string): Promise<void> {
  if (!motif.trim()) throw new ErreurSaisie(['Indiquez le motif de la réouverture.']);
  const ex = await db.exercices.get(exerciceId);
  if (!ex || ex.statut !== 'arrete') throw new ErreurSaisie(["L'exercice n'est pas arrêté."]);
  await db.exercices.update(exerciceId, { statut: 'ouvert' });
  await tracer(db, 'expert', 'reouverture', motif.trim(), ex.entrepriseId, exerciceId);
}

/** Résumé d'un dossier pour le portefeuille de l'assistant. */
export function resumeDossier(c: Chargement, aujourdhui: DateISO) {
  const ref = aujourdhui > c.exercice.fin ? c.exercice.fin : aujourdhui;
  const anomalies = controler(c.dossier, ref);
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
