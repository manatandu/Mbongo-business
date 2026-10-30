/**
 * Journaux du bureau, tirés des saisies : journal de trésorerie au tracé de la note 4 (Titre X, ch. 3),
 * journaux de suivi des créances impayées et des dettes à payer, détail de la ligne Banque du bilan.
 * Lecture seule, sans dépendance à l'écran : le même calcul sert à la page, à l'impression et à l'Excel.
 */
import {
  journalMensuel,
  NATURES,
  situationTiers,
  soldesTresorerie,
  versFC,
  type ColonneDepense,
  type ColonneRecette,
  type DateISO,
  type DossierExercice,
  type GenreTiers,
  type JournalTresorerie,
  type LigneJournal,
  type Montant,
  type PieceTiers,
} from '../moteur';
import { mouvements, ouverture, preparer } from '../moteur/contexte';
import { moisEntre } from '../moteur/dates';

/** Colonnes de ventilation du modèle (note 4), dans l'ordre du Titre X. */
export const RECETTES_MODELE: readonly ColonneRecette[] = ['ventes', 'autres', 'materiel'];
export const DEPENSES_MODELE: readonly ColonneDepense[] = ['achats_marchandises', 'achats_fournitures', 'loyers', 'salaires', 'impots_taxes', 'autres'];
/** Colonnes ajoutées, admises par le NB du modèle (« notamment compte exploitant ») ; montrées seulement quand elles servent. */
export const RECETTES_AJOUTEES: readonly ColonneRecette[] = ['exploitant', 'emprunts', 'transferts'];
export const DEPENSES_AJOUTEES: readonly ColonneDepense[] = ['materiel', 'exploitant', 'emprunts', 'transferts'];

export const LIBELLE_RECETTE: Record<ColonneRecette, string> = {
  ventes: 'Ventes',
  autres: 'Autres',
  materiel: 'Matériel et mobilier',
  exploitant: 'Compte exploitant',
  emprunts: 'Emprunts',
  transferts: 'Transferts',
};
export const LIBELLE_DEPENSE: Record<ColonneDepense, string> = {
  achats_marchandises: 'Achats marchandises',
  achats_fournitures: 'Achats matières et fournitures',
  loyers: 'Loyers',
  salaires: 'Salaires',
  impots_taxes: 'Impôts et taxes',
  autres: 'Autres',
  materiel: 'Matériel et mobilier',
  exploitant: 'Compte exploitant',
  emprunts: 'Emprunts',
  transferts: 'Transferts',
};

export interface LigneJournalBureau extends LigneJournal {
  /** N° de la facture ou du reçu, s'il a été noté. */
  reference: string;
  /** Colonne de ventilation : côté recettes si `recette` est non nul, sinon côté dépenses. */
  cote: 'recette' | 'depense';
  colonne: ColonneRecette | ColonneDepense;
  /** Contre-valeur en francs au taux de l'opération (compte en dollars seulement), signée : + recette, − dépense. */
  fc: Montant | null;
}

export interface JournalBureau extends Omit<JournalTresorerie, 'lignes'> {
  lignes: LigneJournalBureau[];
  /** Compte en dollars : report et solde en francs, à la valeur historique (AUDCIF, art. 17.1). Null pour un compte en francs ou sans taux d'ouverture. */
  reportFC: Montant | null;
  soldeFC: Montant | null;
  /** Colonnes ajoutées utilisées dans le mois. */
  recettesAjoutees: ColonneRecette[];
  depensesAjoutees: ColonneDepense[];
}

/** Mois de l'exercice, au format AAAA-MM, jusqu'à la date de situation. */
export function moisExercice(d: DossierExercice, jusquA: DateISO = d.exercice.fin): string[] {
  const fin = jusquA < d.exercice.fin ? jusquA : d.exercice.fin;
  return moisEntre(d.exercice.debut.slice(0, 7), fin.slice(0, 7));
}

/** Journal de trésorerie d'un compte pour un mois, avec ventilation par ligne et contre-valeur en francs. */
export function journalBureau(d: DossierExercice, compteId: string, mois: string): JournalBureau {
  const j = journalMensuel(d, compteId, mois);
  const ctx = preparer(d);
  const usd = j.devise === 'USD';
  const fcDe = (opId: string): Montant => {
    const op = ctx.parId.get(opId);
    return op ? mouvements(ctx, op).reduce((s, m) => (m.compte === compteId ? s + m.fc : s), 0) : 0;
  };
  let reportFC: Montant | null = null;
  if (usd) {
    try {
      reportFC = ouverture(ctx, compteId).fc;
      for (const op of ctx.operations) {
        if (op.date.slice(0, 7) >= mois) break;
        for (const m of mouvements(ctx, op)) if (m.compte === compteId) reportFC += m.fc;
      }
    } catch {
      // Solde d'ouverture en dollars sans taux d'ouverture : pas de contre-valeur du report.
      reportFC = null;
    }
  }
  const lignes = j.lignes.map((l): LigneJournalBureau => {
    const op = ctx.parId.get(l.operation);
    const transfert = op?.type === 'transfert';
    const cote = transfert ? (op.compte === compteId ? 'depense' : 'recette') : op?.type === 'recette' ? 'recette' : 'depense';
    const colonne = transfert || !op ? 'transferts' : NATURES[op.nature].colonne;
    return { ...l, reference: op?.reference ?? '', cote, colonne, fc: usd ? fcDe(l.operation) : null };
  });
  const soldeFC = reportFC === null ? null : lignes.reduce((s, l) => s + (l.fc ?? 0), reportFC);
  const recettesAjoutees = RECETTES_AJOUTEES.filter((k) => j.ventilation.recettes[k] !== 0 || lignes.some((l) => l.cote === 'recette' && l.colonne === k));
  const depensesAjoutees = DEPENSES_AJOUTEES.filter((k) => j.ventilation.depenses[k] !== 0 || lignes.some((l) => l.cote === 'depense' && l.colonne === k));
  return { ...j, lignes, reportFC, soldeFC, recettesAjoutees, depensesAjoutees };
}

export interface LigneSuivi {
  ligne: PieceTiers;
  regle: Montant;
  reste: Montant;
  /** Date du dernier règlement non annulé, à la date de situation. */
  dernierReglement: DateISO | null;
  soldee: boolean;
}

/** Journal de suivi : toutes les factures de l'exercice, soldées comprises, avec le dernier règlement. */
export function suiviTiers(d: DossierExercice, genre: GenreTiers, date: DateISO): LigneSuivi[] {
  const annulees = new Set(d.operations.filter((o) => o.annule && o.date <= date).map((o) => o.annule));
  return situationTiers(d, genre, date)
    .map((s): LigneSuivi => {
      const dates = d.operations.filter((o) => o.date <= date && !o.annule && !annulees.has(o.id) && o.reglementDe?.genre === genre && o.reglementDe.ligne === s.ligne.id).map((o) => o.date);
      return { ligne: s.ligne, regle: s.regle, reste: s.encours, dernierReglement: dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null, soldee: s.soldee };
    })
    .sort((a, b) => (a.ligne.date < b.ligne.date ? -1 : a.ligne.date > b.ligne.date ? 1 : a.ligne.nom.localeCompare(b.ligne.nom)));
}

/** Note 3 : date de la plus ancienne facture de chaque tiers, par nom (même regroupement que le moteur). */
export function datesParTiers(d: DossierExercice, genre: GenreTiers): Map<string, DateISO> {
  const dates = new Map<string, DateISO>();
  for (const l of genre === 'creance' ? d.creances : d.dettes) {
    const cle = l.nom.trim().toLowerCase();
    const avant = dates.get(cle);
    if (!avant || l.date < avant) dates.set(cle, l.date);
  }
  return dates;
}
export const cleTiers = (nom: string) => nom.trim().toLowerCase();

/**
 * Comptes regroupés sous « Banque (en + ou en −) » au bilan, en francs : banques, monnaie électronique, tontine.
 * Même valorisation que le moteur : dollars au taux de clôture à la clôture, sinon valeur historique.
 */
export function detailBanque(d: DossierExercice, date: DateISO): { libelle: string; montant: Montant }[] {
  const aLaCloture = date === d.exercice.fin;
  return soldesTresorerie(d, date)
    .filter((s) => s.compte.type !== 'caisse')
    .map((s) => {
      let montant = s.fcHistorique;
      if (s.compte.devise === 'USD') montant = s.natif === 0 ? 0 : aLaCloture && d.tauxCloture !== null ? versFC(s.natif, 'USD', d.tauxCloture) : s.fcHistorique;
      return { libelle: s.compte.devise === 'USD' ? `${s.compte.libelle} (USD)` : s.compte.libelle, montant };
    });
}
