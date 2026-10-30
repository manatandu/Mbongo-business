/**
 * Envoi des saisies à TRK Consulting, après liaison du téléphone par le code client.
 * Le téléphone reste la référence : l'envoi ne fait que recopier, et n'efface rien ici.
 * Sans réseau, rien ne se perd : les saisies attendent le prochain envoi.
 * Le serveur range chaque saisie chez ce client seulement ; l'équipe de TRK ne les lit pas.
 */
import type { BaseMbongo } from './base';
import { ecrireReglage, lireReglage } from './reglages';

const SERVEUR = 'https://vloavruyppvmbqlfldad.supabase.co/rest/v1/rpc/';
const CLE_PUBLIQUE = 'sb_publishable_KCJsAwlWR4ILrX05JWTUNQ_DnUdNcg5';
const PAR_ENVOI = 500;

export interface Liaison {
  jeton: string;
  /** Nom du client dans la console de TRK. */
  client: string;
  lieLe: string;
  dernierEnvoi?: string;
  /** Empreinte des fiches (entreprise, exercices, comptes, inventaires) déjà envoyées : on ne les renvoie que si elles changent. */
  empreinteFiches?: string;
}

interface LigneEnvoyee {
  id: string;
  type: string;
  contenu: unknown;
  saisi_le?: string;
}

/** Saisies comptables : envoyées une fois, puis marquées. */
const SAISIES = [
  ['operations', 'operation'],
  ['tiers', 'tiers'],
  ['immobilisations', 'immobilisation'],
  ['sorties', 'sortie'],
  ['articles', 'article'],
  ['mouvementsStock', 'mouvement_stock'],
] as const;

const cle = (entrepriseId: string) => `liaison:${entrepriseId}`;

export const liaison = (db: BaseMbongo, entrepriseId: string): Promise<Liaison | null> => lireReglage<Liaison | null>(db, cle(entrepriseId), null);

export class ErreurEnvoi extends Error {}

async function appeler<T>(fonction: string, corps: unknown, envoyerRequete: typeof fetch = fetch): Promise<T> {
  let r: Response;
  try {
    r = await envoyerRequete(SERVEUR + fonction, { method: 'POST', headers: { apikey: CLE_PUBLIQUE, 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
  } catch {
    throw new ErreurEnvoi('Pas de réseau. Réessayez plus tard.');
  }
  const donnees = (await r.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!r.ok) throw new ErreurEnvoi(donnees?.message || "Le serveur n'a pas répondu.");
  return donnees as T;
}

/** Relie ce téléphone à la fiche du client chez TRK, avec le code donné par l'équipe. */
export async function relier(db: BaseMbongo, entrepriseId: string, code: string, envoyerRequete: typeof fetch = fetch): Promise<Liaison> {
  const entreprise = await db.entreprises.get(entrepriseId);
  if (!entreprise) throw new ErreurEnvoi('Entreprise introuvable.');
  if (entreprise.demo) throw new ErreurEnvoi('La démonstration ne se relie pas.');
  const propre = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (propre.length !== 8) throw new ErreurEnvoi('Le code a huit caractères, par exemple KX7P-29QD.');
  const r = await appeler<{ jeton: string; client: string }>('lier_appareil', { p_code: propre, p_nom: entreprise.nom }, envoyerRequete);
  const l: Liaison = { jeton: r.jeton, client: r.client, lieLe: new Date().toISOString() };
  await ecrireReglage(db, cle(entrepriseId), l);
  return l;
}

export const delier = (db: BaseMbongo, entrepriseId: string): Promise<void> => db.reglages.delete(cle(entrepriseId));

/** Nombre de saisies comptables pas encore envoyées. */
export async function enAttente(db: BaseMbongo, entrepriseId: string): Promise<number> {
  let n = 0;
  for (const [table] of SAISIES) n += await db.table(table).where('entrepriseId').equals(entrepriseId).filter((l: { envoi?: string }) => l.envoi !== 'envoye').count();
  return n;
}

function empreinte(texte: string): string {
  let h = 5381;
  for (let i = 0; i < texte.length; i++) h = (h * 33) ^ texte.charCodeAt(i);
  return `${texte.length}-${(h >>> 0).toString(36)}`;
}

/**
 * Envoie ce qui manque au serveur. Renvoie le nombre de lignes envoyées, ou null si le téléphone n'est pas relié.
 * Les saisies sont marquées « envoyées » lot par lot : une coupure en cours de route ne fait rien perdre.
 */
export async function envoyer(db: BaseMbongo, entrepriseId: string, envoyerRequete: typeof fetch = fetch): Promise<number | null> {
  const l = await liaison(db, entrepriseId);
  if (!l) return null;

  const exercices = await db.exercices.where('entrepriseId').equals(entrepriseId).toArray();
  const fiches: LigneEnvoyee[] = [
    { id: entrepriseId, type: 'entreprise', contenu: await db.entreprises.get(entrepriseId) },
    ...exercices.map((e) => ({ id: e.id, type: 'exercice', contenu: e })),
    ...(await db.comptes.where('entrepriseId').equals(entrepriseId).toArray()).map((c) => ({ id: c.id, type: 'compte', contenu: c })),
    ...(await db.inventaires.where('exerciceId').anyOf(exercices.map((e) => e.id)).toArray()).map((i) => ({ id: i.id, type: 'inventaire', contenu: i })),
  ];
  const empreinteFiches = empreinte(JSON.stringify(fiches));

  const saisies: (LigneEnvoyee & { table: string })[] = [];
  for (const [table, type] of SAISIES) {
    const lignes = await db.table(table).where('entrepriseId').equals(entrepriseId).filter((x: { envoi?: string }) => x.envoi !== 'envoye').toArray();
    for (const x of lignes as { id: string; creeLe?: string; envoi?: string }[]) {
      const { envoi: _envoi, ...contenu } = x;
      saisies.push({ table, id: x.id, type, contenu, ...(x.creeLe ? { saisi_le: x.creeLe } : {}) });
    }
  }
  const aEnvoyer: (LigneEnvoyee & { table?: string })[] = [...(empreinteFiches !== l.empreinteFiches ? fiches : []), ...saisies];
  if (!aEnvoyer.length) return 0;

  for (let i = 0; i < aEnvoyer.length; i += PAR_ENVOI) {
    const lot = aEnvoyer.slice(i, i + PAR_ENVOI);
    await appeler<number>('envoyer_saisies', { p_jeton: l.jeton, p_lignes: lot.map(({ table: _t, ...x }) => x) }, envoyerRequete);
    await db.transaction('rw', SAISIES.map(([t]) => db.table(t)), async () => {
      for (const x of lot) if (x.table) await db.table(x.table).update(x.id, { envoi: 'envoye' });
    });
  }
  await ecrireReglage(db, cle(entrepriseId), { ...l, dernierEnvoi: new Date().toISOString(), empreinteFiches });
  return aEnvoyer.length;
}
