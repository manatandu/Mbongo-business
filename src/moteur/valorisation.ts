/**
 * Valorisation des stocks (fiches de stock, inventaire permanent).
 * AUDCIF, art. 44 : biens interchangeables évalués soit au coût moyen pondéré (CMP), soit selon le « premier entré,
 * premier sorti » (PEPS) ; le CMP se calcule après chaque entrée ou sur une période (SYSCOHADA, titre VIII).
 * La méthode retenue est mentionnée dans les notes annexes.
 *
 * Valeurs en francs congolais entiers. Les quantités peuvent être décimales (kg, litres).
 * Conservation : stock initial + entrées = sorties + stock final, au franc près, quelle que soit la méthode.
 */
import type { DateISO, Montant } from './types';

export type MethodeValorisation = 'cump_entree' | 'cump_periode' | 'peps';

export const LIBELLE_METHODE: Record<MethodeValorisation, string> = {
  cump_entree: 'Coût moyen pondéré après chaque entrée (CUMP)',
  cump_periode: 'Coût moyen pondéré de la période',
  peps: 'Premier entré, premier sorti (PEPS)',
};

export interface MouvementStock {
  date: DateISO;
  sens: 'entree' | 'sortie';
  quantite: number;
  /** Coût unitaire d'entrée, en francs congolais. Ignoré pour une sortie. */
  prixUnitaire?: Montant;
}

export interface SortieValorisee {
  date: DateISO;
  quantite: number;
  valeur: Montant;
}

export interface EtatArticle {
  quantite: number;
  valeur: Montant;
  /** Coût unitaire du stock restant (0 si le stock est vide). */
  coutUnitaire: number;
  entrees: Montant;
  sorties: SortieValorisee[];
  /** Quantité sortie au-delà du stock disponible : une entrée a été oubliée. */
  manque: number;
}

const EPS = 1e-9;
const arrondiQ = (q: number) => Math.round(q * 1000) / 1000;

/** Mouvements dans l'ordre : par date, et à date égale les entrées avant les sorties, puis l'ordre de saisie. */
function ordonner(m: MouvementStock[]): MouvementStock[] {
  return m
    .map((x, i) => ({ x, i }))
    .sort((a, b) => (a.x.date < b.x.date ? -1 : a.x.date > b.x.date ? 1 : a.x.sens === b.x.sens ? a.i - b.i : a.x.sens === 'entree' ? -1 : 1))
    .map(({ x }) => x);
}

export function valoriser(mouvements: MouvementStock[], methode: MethodeValorisation, auDate?: DateISO): EtatArticle {
  const liste = ordonner(mouvements.filter((m) => !auDate || m.date <= auDate));
  const entrees = liste.filter((m) => m.sens === 'entree').reduce((s, m) => s + Math.round(m.quantite * (m.prixUnitaire ?? 0)), 0);
  if (methode === 'cump_periode') return parPeriode(liste, entrees);
  return methode === 'peps' ? pepsArticle(liste, entrees) : cumpEntree(liste, entrees);
}

function cumpEntree(liste: MouvementStock[], entrees: Montant): EtatArticle {
  let q = 0;
  let v = 0;
  let manque = 0;
  const sorties: SortieValorisee[] = [];
  for (const m of liste) {
    if (m.sens === 'entree') {
      q = arrondiQ(q + m.quantite);
      v += Math.round(m.quantite * (m.prixUnitaire ?? 0));
      continue;
    }
    const prise = Math.min(m.quantite, q);
    manque = arrondiQ(manque + m.quantite - prise);
    // La dernière unité emporte la valeur restante : pas de franc perdu par arrondi.
    const valeur = prise >= q - EPS ? v : Math.round((v * prise) / q);
    sorties.push({ date: m.date, quantite: m.quantite, valeur });
    q = arrondiQ(q - prise);
    v -= valeur;
  }
  return { quantite: q, valeur: v, coutUnitaire: q > EPS ? v / q : 0, entrees, sorties, manque };
}

function pepsArticle(liste: MouvementStock[], entrees: Montant): EtatArticle {
  // Couches d'entrée : quantité restante et valeur restante (entière).
  const couches: { q: number; v: number }[] = [];
  let manque = 0;
  const sorties: SortieValorisee[] = [];
  for (const m of liste) {
    if (m.sens === 'entree') {
      couches.push({ q: m.quantite, v: Math.round(m.quantite * (m.prixUnitaire ?? 0)) });
      continue;
    }
    let reste = m.quantite;
    let valeur = 0;
    while (reste > EPS && couches.length) {
      const c = couches[0]!;
      const prise = Math.min(reste, c.q);
      const v = prise >= c.q - EPS ? c.v : Math.round((c.v * prise) / c.q);
      valeur += v;
      c.q = arrondiQ(c.q - prise);
      c.v -= v;
      reste = arrondiQ(reste - prise);
      if (c.q <= EPS) couches.shift();
    }
    manque = arrondiQ(manque + reste);
    sorties.push({ date: m.date, quantite: m.quantite, valeur });
  }
  const quantite = arrondiQ(couches.reduce((s, c) => s + c.q, 0));
  const valeur = couches.reduce((s, c) => s + c.v, 0);
  return { quantite, valeur, coutUnitaire: quantite > EPS ? valeur / quantite : 0, entrees, sorties, manque };
}

function parPeriode(liste: MouvementStock[], entrees: Montant): EtatArticle {
  const qEntree = liste.filter((m) => m.sens === 'entree').reduce((s, m) => s + m.quantite, 0);
  const cout = qEntree > EPS ? entrees / qEntree : 0;
  let q = 0;
  let manque = 0;
  const brutes: { date: DateISO; quantite: number; prise: number }[] = [];
  for (const m of liste) {
    if (m.sens === 'entree') {
      q = arrondiQ(q + m.quantite);
      continue;
    }
    const prise = Math.min(m.quantite, q);
    manque = arrondiQ(manque + m.quantite - prise);
    brutes.push({ date: m.date, quantite: m.quantite, prise });
    q = arrondiQ(q - prise);
  }
  // Sans aucune sortie, tout le stock est encore là : sa valeur est celle des entrées, au franc près.
  const valeur = brutes.length ? Math.round(q * cout) : entrees;
  // Les sorties se partagent le reste, la dernière prend l'arrondi.
  let aRepartir = entrees - valeur;
  const sorties = brutes.map((s, i) => {
    const v = i === brutes.length - 1 ? aRepartir : Math.round(s.prise * cout);
    aRepartir -= v;
    return { date: s.date, quantite: s.quantite, valeur: v };
  });
  return { quantite: q, valeur, coutUnitaire: q > EPS ? cout : 0, entrees, sorties, manque };
}
