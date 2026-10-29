/**
 * Dates AAAA-MM-JJ, calculées en UTC pour éviter tout décalage de fuseau.
 * Le moteur ne lit jamais l'horloge : la date de référence est toujours un paramètre.
 */
import type { DateISO } from './types';

const MOTIF = /^(\d{4})-(\d{2})-(\d{2})$/;
const JOUR_MS = 86_400_000;

function versMs(d: DateISO): number {
  const m = MOTIF.exec(d);
  if (!m) throw new Error(`Date invalide : ${d}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function depuisMs(ms: number): DateISO {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Vrai pour une date qui existe au calendrier (refuse le 30 février). */
export function estDateISO(v: unknown): v is DateISO {
  return typeof v === 'string' && MOTIF.test(v) && depuisMs(versMs(v)) === v;
}

export const anneeDe = (d: DateISO): number => Number(d.slice(0, 4));

/** Mois au format AAAA-MM. */
export const moisDe = (d: DateISO): string => d.slice(0, 7);

export const ajouterJours = (d: DateISO, n: number): DateISO => depuisMs(versMs(d) + n * JOUR_MS);

/** Nombre de jours de `de` à `a`. */
export const ecartJours = (de: DateISO, a: DateISO): number => Math.round((versMs(a) - versMs(de)) / JOUR_MS);

/** 0 = dimanche, 6 = samedi. */
export const jourSemaine = (d: DateISO): number => new Date(versMs(d)).getUTCDay();

/** Mois de `debut` à `fin` inclus, au format AAAA-MM. */
export function moisEntre(debut: string, fin: string): string[] {
  const liste: string[] = [];
  let a = Number(debut.slice(0, 4));
  let m = Number(debut.slice(5, 7));
  for (;;) {
    const courant = `${a}-${String(m).padStart(2, '0')}`;
    if (courant > fin) break;
    liste.push(courant);
    m += 1;
    if (m > 12) {
      m = 1;
      a += 1;
    }
  }
  return liste;
}
