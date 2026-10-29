/**
 * Générateur d'exercices aléatoires mais valides, pour les tests de propriété.
 * fast-check tire une suite de commandes ; le constructeur les applique dans l'ordre des dates
 * en ne gardant que celles qui ont un sens (on ne règle pas une facture inexistante).
 */
import fc from 'fast-check';
import { versFC, type CompteTresorerie, type DossierExercice, type Immobilisation, type Nature, type Operation, type PieceTiers, type TypeCompte } from '../../src/moteur';
import { ajouterJours } from '../../src/moteur/dates';

const NATURES_R: Nature[] = ['ventes', 'autres_recettes', 'apport', 'emprunt_recu'];
const NATURES_D: Nature[] = ['achats_marchandises', 'achats_fournitures', 'loyers', 'salaires', 'impots_taxes', 'interets', 'autres_depenses', 'remboursement_emprunt', 'prelevement'];
const NATURES_DETTE: Nature[] = ['achats_marchandises', 'achats_fournitures', 'loyers', 'impots_taxes', 'autres_depenses'];

const jour = fc.integer({ min: 0, max: 364 });
const indice = fc.nat({ max: 50 });
const montant = fc.integer({ min: 1, max: 20_000_000 });
/** Taux entre 2 000 et 3 500 FC, avec deux décimales. */
const taux = fc.integer({ min: 200_000, max: 350_000 }).map((t) => t / 100);

const commande = fc.oneof(
  fc.record({ k: fc.constant('recette' as const), jour, compte: indice, nature: fc.constantFrom(...NATURES_R), montant, taux }),
  fc.record({ k: fc.constant('depense' as const), jour, compte: indice, nature: fc.constantFrom(...NATURES_D), montant, taux }),
  fc.record({ k: fc.constant('transfert' as const), jour, de: indice, vers: indice, montant, recu: montant, taux }),
  fc.record({ k: fc.constant('materiel' as const), jour, compte: indice, montant, taux, duree: fc.integer({ min: 1, max: 10 }), caution: fc.boolean() }),
  fc.record({ k: fc.constant('cession' as const), jour, immo: indice, compte: indice, montant, taux, avecOperation: fc.boolean() }),
  fc.record({ k: fc.constant('facture' as const), genre: fc.constantFrom('creance' as const, 'dette' as const), jour, montant, taux, usd: fc.boolean(), nature: indice }),
  fc.record({ k: fc.constant('reglement' as const), genre: fc.constantFrom('creance' as const, 'dette' as const), jour, ligne: indice, part: fc.integer({ min: 1, max: 100 }), compte: indice, taux }),
  fc.record({ k: fc.constant('annulation' as const), jour, cible: indice }),
);

export const graine = fc.record({
  comptes: fc.array(fc.record({ type: fc.constantFrom<TypeCompte>('caisse', 'banque', 'mobile', 'tontine'), usd: fc.boolean() }), { minLength: 1, maxLength: 4 }),
  soldes: fc.array(fc.integer({ min: -5_000_000, max: 20_000_000 }), { minLength: 4, maxLength: 4 }),
  tauxOuverture: taux,
  tauxCloture: fc.option(taux, { nil: null }),
  stockInitial: fc.integer({ min: 0, max: 30_000_000 }),
  stockFinal: fc.option(fc.integer({ min: 0, max: 30_000_000 }), { nil: null }),
  empruntOuverture: fc.integer({ min: 0, max: 10_000_000 }),
  facturesAnciennes: fc.array(fc.record({ genre: fc.constantFrom('creance' as const, 'dette' as const), montant, dejaRegle: fc.integer({ min: 0, max: 100 }), usd: fc.boolean(), taux }), { maxLength: 4 }),
  immosAnciennes: fc.array(fc.record({ annee: fc.integer({ min: 2015, max: 2025 }), montant, duree: fc.integer({ min: 1, max: 10 }), caution: fc.boolean() }), { maxLength: 3 }),
  commandes: fc.array(commande, { minLength: 5, maxLength: 120, size: 'large' }),
});

export type Graine = typeof graine extends fc.Arbitrary<infer T> ? T : never;

/** Construit un dossier valide à partir d'une graine. `cloturable` force inventaire et taux de clôture. */
export function construire(g: Graine, cloturable = false): DossierExercice {
  const debut = '2026-01-01';
  const comptes: CompteTresorerie[] = g.comptes.map((c, i) => ({ id: `k${i}`, type: c.type, libelle: `Compte ${i}`, devise: c.usd ? 'USD' : 'CDF' }));
  const soldesOuverture: Record<string, number> = {};
  comptes.forEach((c, i) => {
    const s = g.soldes[i] ?? 0;
    soldesOuverture[c.id] = c.type === 'banque' ? s : Math.abs(s);
  });
  const operations: Operation[] = [];
  const creances: PieceTiers[] = [];
  const dettes: PieceTiers[] = [];
  const immobilisations: Immobilisation[] = [];
  const encours = new Map<string, number>();
  /** Capital restant dû, en francs : un remboursement ne peut pas le rendre négatif. */
  let capital = g.empruntOuverture;
  const effetCapital = (o: Pick<Operation, 'nature' | 'montant' | 'devise' | 'taux'>): number =>
    o.nature === 'emprunt_recu' ? versFC(o.montant, o.devise, o.taux) : o.nature === 'remboursement_emprunt' ? -versFC(o.montant, o.devise, o.taux) : 0;
  let n = 0;
  const id = (p: string) => `${p}${++n}`;
  const compteParIndice = (i: number) => comptes[i % comptes.length] as CompteTresorerie;
  const tauxSi = (c: CompteTresorerie, t: number) => (c.devise === 'USD' ? t : null);

  for (const f of g.facturesAnciennes) {
    const l: PieceTiers = {
      id: id(f.genre === 'creance' ? 'c' : 'd'),
      date: '2025-11-15',
      facture: 'ancienne',
      nom: 'Tiers (fictif)',
      nature: f.genre === 'creance' ? 'ventes' : 'achats_marchandises',
      montant: f.montant,
      devise: f.usd ? 'USD' : 'CDF',
      taux: f.usd ? f.taux : null,
    };
    const regle = Math.min(f.montant, Math.floor((f.montant * f.dejaRegle) / 100));
    if (regle > 0) l.regleAvant = regle;
    encours.set(l.id, f.montant - regle);
    (f.genre === 'creance' ? creances : dettes).push(l);
  }
  for (const a of g.immosAnciennes) {
    immobilisations.push({ id: id('i'), date: `${a.annee}-06-15`, designation: 'Bien ancien', categorie: a.caution ? 'caution' : 'materiel', montant: a.montant, duree: a.duree });
  }

  const nouvelle = (o: Omit<Operation, 'id' | 'libelle' | 'piece'>): Operation => {
    const op: Operation = { id: id('o'), libelle: 'Opération générée', piece: true, ...o };
    operations.push(op);
    return op;
  };

  const tri = [...g.commandes].sort((a, b) => ('jour' in a ? a.jour : 999) - ('jour' in b ? b.jour : 999));
  for (const c of tri) {
    const date = 'jour' in c ? ajouterJours(debut, c.jour) : '2026-12-31';
    switch (c.k) {
      case 'recette':
      case 'depense': {
        const k = compteParIndice(c.compte);
        const o = { nature: c.nature, montant: c.montant, devise: k.devise, taux: tauxSi(k, c.taux) };
        if (capital + effetCapital(o) < 0) break;
        capital += effetCapital(o);
        nouvelle({ date, type: c.k, compte: k.id, ...o });
        break;
      }
      case 'transfert': {
        const de = compteParIndice(c.de);
        const vers = compteParIndice(c.vers);
        if (de.id === vers.id) break;
        const change = de.devise !== vers.devise;
        nouvelle({
          date,
          type: 'transfert',
          compte: de.id,
          compteDestination: vers.id,
          ...(change ? { montantDestination: c.recu } : {}),
          nature: 'transfert',
          montant: c.montant,
          devise: de.devise,
          taux: de.devise === 'USD' && vers.devise === 'USD' ? c.taux : null,
        });
        break;
      }
      case 'materiel': {
        const k = compteParIndice(c.compte);
        const o = nouvelle({ date, type: 'depense', compte: k.id, nature: c.caution ? 'caution' : 'materiel', montant: c.montant, devise: k.devise, taux: tauxSi(k, c.taux) });
        immobilisations.push({
          id: id('i'),
          date,
          designation: 'Bien acheté',
          categorie: c.caution ? 'caution' : 'materiel',
          montant: versFC(c.montant, k.devise, o.taux),
          duree: c.duree,
          operation: o.id,
        });
        break;
      }
      case 'cession': {
        const candidates = immobilisations.filter((i) => !i.sortie && i.date <= date && !(i.operation && operations.some((o) => o.annule === i.operation)));
        const i = candidates[c.immo % Math.max(1, candidates.length)];
        if (!i) break;
        if (c.avecOperation) {
          const k = compteParIndice(c.compte);
          const o = nouvelle({ date, type: 'recette', compte: k.id, nature: 'cession_materiel', montant: c.montant, devise: k.devise, taux: tauxSi(k, c.taux) });
          i.sortie = { date, prixCession: versFC(c.montant, k.devise, o.taux), operation: o.id };
        } else {
          i.sortie = { date, prixCession: 0 };
        }
        break;
      }
      case 'facture': {
        const natures = c.genre === 'creance' ? ['ventes', 'autres_recettes'] : NATURES_DETTE;
        const l: PieceTiers = {
          id: id(c.genre === 'creance' ? 'c' : 'd'),
          date,
          facture: `F${n}`,
          nom: 'Tiers (fictif)',
          nature: natures[c.nature % natures.length] as Nature,
          montant: c.montant,
          devise: c.usd ? 'USD' : 'CDF',
          taux: c.usd ? c.taux : null,
        };
        encours.set(l.id, l.montant);
        (c.genre === 'creance' ? creances : dettes).push(l);
        break;
      }
      case 'reglement': {
        const lignes = (c.genre === 'creance' ? creances : dettes).filter((l) => l.date <= date && (encours.get(l.id) ?? 0) > 0);
        const l = lignes[c.ligne % Math.max(1, lignes.length)];
        if (!l) break;
        const memeDevise = comptes.filter((x) => x.devise === l.devise);
        const k = memeDevise[c.compte % Math.max(1, memeDevise.length)];
        if (!k) break;
        const reste = encours.get(l.id) ?? 0;
        const m = Math.max(1, Math.floor((reste * c.part) / 100));
        nouvelle({
          date,
          type: c.genre === 'creance' ? 'recette' : 'depense',
          compte: k.id,
          nature: l.nature,
          montant: m,
          devise: k.devise,
          taux: tauxSi(k, c.taux),
          reglementDe: { genre: c.genre, ligne: l.id },
        });
        encours.set(l.id, reste - m);
        break;
      }
      case 'annulation': {
        const vendus = new Set(immobilisations.filter((i) => i.sortie).map((i) => i.operation));
        const candidates = operations.filter(
          (o) => !o.annule && o.nature !== 'cession_materiel' && !vendus.has(o.id) && !operations.some((x) => x.annule === o.id) && o.date <= date,
        );
        const cible = candidates[c.cible % Math.max(1, candidates.length)];
        if (!cible || capital - effetCapital(cible) < 0) break;
        capital -= effetCapital(cible);
        operations.push({ ...cible, id: id('a'), date, libelle: 'Annulation', annule: cible.id });
        if (cible.reglementDe) encours.set(cible.reglementDe.ligne, (encours.get(cible.reglementDe.ligne) ?? 0) + cible.montant);
        break;
      }
    }
  }

  return {
    entreprise: { nom: 'Entreprise générée (fictif)', secteur: 'negoce' },
    exercice: { annee: 2026, debut, fin: '2026-12-31' },
    comptes,
    soldesOuverture,
    tauxOuverture: g.tauxOuverture,
    empruntOuverture: g.empruntOuverture,
    operations,
    creances,
    dettes,
    immobilisations,
    stockInitial: g.stockInitial,
    stockFinal: cloturable ? (g.stockFinal ?? g.stockInitial) : g.stockFinal,
    tauxCloture: cloturable ? (g.tauxCloture ?? g.tauxOuverture) : g.tauxCloture,
  };
}
