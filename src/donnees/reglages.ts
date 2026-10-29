/** Réglages de l'appareil : langue, code d'accès, entreprise ouverte. */
import type { BaseMbongo } from './base';
import { nouvelId } from './ids';

export async function lireReglage<T>(db: BaseMbongo, cle: string, defaut: T): Promise<T> {
  const r = await db.reglages.get(cle);
  return r === undefined ? defaut : (r.valeur as T);
}

export async function ecrireReglage(db: BaseMbongo, cle: string, valeur: unknown): Promise<void> {
  await db.reglages.put({ cle, valeur });
}

/** Identifiant stable de l'appareil, utilisé comme auteur des saisies tant qu'il n'y a pas de compte en ligne. */
export async function identifiantAppareil(db: BaseMbongo): Promise<string> {
  const existant = await lireReglage<string | null>(db, 'appareil', null);
  if (existant) return existant;
  const id = `appareil-${nouvelId()}`;
  await ecrireReglage(db, 'appareil', id);
  return id;
}

async function empreinte(texte: string): Promise<string> {
  const octets = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte)));
  return [...octets].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Code à quatre chiffres. Discrétion pour un téléphone partagé, pas une sécurité forte. */
export async function definirCode(db: BaseMbongo, code: string | null): Promise<void> {
  if (code === null) {
    await db.reglages.delete('code');
    return;
  }
  if (!/^\d{4}$/.test(code)) throw new Error('Le code doit avoir quatre chiffres.');
  const sel = nouvelId();
  await ecrireReglage(db, 'code', { sel, empreinte: await empreinte(sel + code) });
}

export async function codeDefini(db: BaseMbongo): Promise<boolean> {
  return (await db.reglages.get('code')) !== undefined;
}

export async function verifierCode(db: BaseMbongo, code: string): Promise<boolean> {
  const r = await lireReglage<{ sel: string; empreinte: string } | null>(db, 'code', null);
  return r === null || (await empreinte(r.sel + code)) === r.empreinte;
}
