/**
 * Contrôle de cohérence d'un dossier avant tout calcul.
 * Un dossier refusé ne produit pas d'états : mieux vaut un message clair qu'un bilan faux.
 */
import { anneeDe, estDateISO } from './dates';
import { estMontant, estTaux, versFC } from './montants';
import { estNature, NATURES, NATURES_CREANCE, NATURES_DETTE, NATURES_IMMOBILISATION, type Nature } from './natures';
import type { CompteTresorerie, DossierExercice, GenreTiers, Operation, PieceTiers } from './types';

export class ErreurDossier extends Error {
  readonly erreurs: string[];
  constructor(erreurs: string[]) {
    super(`Dossier invalide :\n- ${erreurs.join('\n- ')}`);
    this.name = 'ErreurDossier';
    this.erreurs = erreurs;
  }
}

const TYPES_COMPTE = ['caisse', 'banque', 'mobile', 'tontine'];
const DEVISES = ['CDF', 'USD'];
const CATEGORIES = ['materiel', 'mobilier', 'caution'];

const positif = (v: unknown): boolean => estMontant(v) && v > 0;
const positifOuNul = (v: unknown): boolean => estMontant(v) && v >= 0;

/** Liste des incohérences ; vide si le dossier est utilisable. */
export function valider(d: DossierExercice): string[] {
  const err: string[] = [];
  const ex = d.exercice;
  if (!estDateISO(ex.debut) || !estDateISO(ex.fin) || ex.debut > ex.fin || anneeDe(ex.fin) !== ex.annee) {
    return [`Exercice ${ex.annee} : dates de début et de fin invalides.`];
  }
  const dansExercice = (date: unknown): boolean => estDateISO(date) && date >= ex.debut && date <= ex.fin;

  // Comptes et ouverture
  const comptes = new Map<string, CompteTresorerie>();
  for (const c of d.comptes) {
    if (comptes.has(c.id)) err.push(`Compte en double : ${c.id}.`);
    if (!TYPES_COMPTE.includes(c.type)) err.push(`Compte ${c.id} : type inconnu.`);
    if (!DEVISES.includes(c.devise)) err.push(`Compte ${c.id} : devise inconnue.`);
    comptes.set(c.id, c);
  }
  for (const [id, m] of Object.entries(d.soldesOuverture)) {
    if (!comptes.has(id)) err.push(`Solde d'ouverture pour un compte inconnu : ${id}.`);
    if (!estMontant(m)) err.push(`Solde d'ouverture de ${id} : montant non entier.`);
  }
  if (!positifOuNul(d.stockInitial)) err.push('Stock initial : montant entier positif ou nul attendu.');
  if (d.stockFinal !== null && !positifOuNul(d.stockFinal)) err.push('Stock final : montant entier positif ou nul attendu.');
  if (!positifOuNul(d.empruntOuverture)) err.push("Emprunt à l'ouverture : montant entier positif ou nul attendu.");
  if (d.tauxOuverture !== null && !estTaux(d.tauxOuverture)) err.push("Taux d'ouverture invalide.");
  if (d.tauxCloture !== null && !estTaux(d.tauxCloture)) err.push('Taux de clôture invalide.');

  // Créances et dettes
  const validerTiers = (genre: GenreTiers, lignes: PieceTiers[], natures: readonly Nature[]): Map<string, PieceTiers> => {
    const quoi = genre === 'creance' ? 'Créance' : 'Dette';
    const index = new Map<string, PieceTiers>();
    for (const l of lignes) {
      if (index.has(l.id)) err.push(`${quoi} en double : ${l.id}.`);
      index.set(l.id, l);
      if (!estDateISO(l.date) || l.date > ex.fin) err.push(`${quoi} ${l.id} : date invalide ou après la clôture.`);
      if (!positif(l.montant)) err.push(`${quoi} ${l.id} : montant entier supérieur à zéro attendu.`);
      if (!l.nom || !l.nom.trim()) err.push(`${quoi} ${l.id} : nom du ${genre === 'creance' ? 'client' : 'fournisseur'} manquant.`);
      if (!DEVISES.includes(l.devise)) err.push(`${quoi} ${l.id} : devise inconnue.`);
      if (l.devise === 'USD' && !estTaux(l.taux)) err.push(`${quoi} ${l.id} en dollars : taux manquant.`);
      if (l.client !== undefined && l.client !== 'particulier' && l.client !== 'commercant') err.push(`${quoi} ${l.id} : type de client inconnu.`);
      if (!natures.includes(l.nature)) {
        err.push(
          genre === 'dette' && NATURES_IMMOBILISATION.includes(l.nature)
            ? `Dette ${l.id} : le matériel acheté à crédit n'est pas pris en charge, saisissez-le à la date du paiement.`
            : `${quoi} ${l.id} : nature « ${l.nature} » non admise.`,
        );
      }
      if (l.regleAvant !== undefined) {
        if (!positifOuNul(l.regleAvant) || l.regleAvant > l.montant) err.push(`${quoi} ${l.id} : part réglée avant l'ouverture invalide.`);
        if (l.date >= ex.debut) err.push(`${quoi} ${l.id} : une part réglée avant l'ouverture suppose une facture antérieure à l'exercice.`);
      }
    }
    return index;
  };
  const creances = validerTiers('creance', d.creances, NATURES_CREANCE);
  const dettes = validerTiers('dette', d.dettes, NATURES_DETTE);

  const besoinTauxOuverture =
    d.comptes.some((c) => c.devise === 'USD' && (d.soldesOuverture[c.id] ?? 0) !== 0) ||
    [...d.creances, ...d.dettes].some((l) => l.devise === 'USD' && l.date < ex.debut && l.montant - (l.regleAvant ?? 0) > 0);
  if (besoinTauxOuverture && !estTaux(d.tauxOuverture)) err.push("Taux d'ouverture requis : des soldes ou des factures en dollars existent à l'ouverture.");

  // Opérations
  const ops = new Map<string, Operation>();
  for (const op of d.operations) {
    if (ops.has(op.id)) err.push(`Opération en double : ${op.id}.`);
    ops.set(op.id, op);
  }
  for (const op of d.operations) {
    const ref = `Opération ${op.id}`;
    if (!dansExercice(op.date)) err.push(`${ref} : date hors de l'exercice ${ex.annee}.`);
    const c = comptes.get(op.compte);
    if (!c) {
      err.push(`${ref} : compte inconnu (${op.compte}).`);
      continue;
    }
    if (op.devise !== c.devise) err.push(`${ref} : la devise doit être celle du compte ${c.libelle} (${c.devise}).`);
    if (!positif(op.montant)) err.push(`${ref} : montant entier supérieur à zéro attendu.`);
    if (!estNature(op.nature)) {
      err.push(`${ref} : nature inconnue.`);
      continue;
    }
    if (NATURES[op.nature].type !== op.type) err.push(`${ref} : la nature « ${op.nature} » ne convient pas à une ${op.type}.`);

    let tauxRequis = op.type !== 'transfert' && c.devise === 'USD';
    if (op.type === 'transfert') {
      const dest = comptes.get(op.compteDestination ?? '');
      if (!dest) err.push(`${ref} : compte de destination inconnu.`);
      else if (dest.id === c.id) err.push(`${ref} : choisissez deux comptes différents.`);
      else if (dest.devise !== c.devise && !positif(op.montantDestination)) err.push(`${ref} : montant reçu requis pour un change entre devises.`);
      else if (dest.devise === 'USD' && c.devise === 'USD') tauxRequis = true;
    } else if (op.compteDestination !== undefined) {
      err.push(`${ref} : seul un transfert a un compte de destination.`);
    }
    if (tauxRequis && !estTaux(op.taux)) err.push(`${ref} en dollars : taux manquant.`);

    if (op.reglementDe) {
      const { genre, ligne } = op.reglementDe;
      const l = (genre === 'creance' ? creances : dettes).get(ligne);
      if (!l) err.push(`${ref} : ${genre === 'creance' ? 'créance' : 'dette'} inconnue (${ligne}).`);
      else {
        if (op.type !== (genre === 'creance' ? 'recette' : 'depense')) err.push(`${ref} : un ${genre === 'creance' ? 'encaissement est une recette' : 'règlement est une dépense'}.`);
        if (op.nature !== l.nature) err.push(`${ref} : la nature doit être celle de la facture (${l.nature}).`);
        if (c.devise !== l.devise) err.push(`${ref} : facture en ${l.devise}, compte en ${c.devise}.`);
        if (estDateISO(op.date) && op.date < l.date) err.push(`${ref} : règlement antérieur à la facture.`);
      }
    }

    if (op.annule !== undefined) {
      const cible = ops.get(op.annule);
      if (op.nature === 'cession_materiel') err.push(`${ref} : une cession de matériel ne s'annule pas.`);
      if (!cible) {
        if (NATURES_IMMOBILISATION.includes(op.nature)) err.push(`${ref} : un achat de matériel s'annule dans le même exercice.`);
      } else {
        if (cible.annule !== undefined) err.push(`${ref} : on n'annule pas une annulation.`);
        const identique =
          cible.type === op.type &&
          cible.compte === op.compte &&
          cible.compteDestination === op.compteDestination &&
          cible.montantDestination === op.montantDestination &&
          cible.nature === op.nature &&
          cible.montant === op.montant &&
          cible.devise === op.devise &&
          cible.reglementDe?.genre === op.reglementDe?.genre &&
          cible.reglementDe?.ligne === op.reglementDe?.ligne;
        if (!identique) err.push(`${ref} : une annulation reprend exactement l'opération ${cible.id}.`);
        if (estDateISO(op.date) && op.date < cible.date) err.push(`${ref} : annulation antérieure à l'opération annulée.`);
      }
    }
  }
  const annulees = new Map<string, number>();
  for (const op of d.operations) if (op.annule) annulees.set(op.annule, (annulees.get(op.annule) ?? 0) + 1);
  for (const [id, n] of annulees) if (n > 1) err.push(`Opération ${id} annulée ${n} fois.`);

  // Règlements : jamais au-delà de l'encours, à aucun moment.
  const parDate = [...d.operations].filter((o) => o.reglementDe).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const regle = new Map<string, number>();
  for (const op of parDate) {
    const { genre, ligne } = op.reglementDe!;
    const l = (genre === 'creance' ? creances : dettes).get(ligne);
    if (!l) continue;
    const cle = `${genre}:${ligne}`;
    const total = (regle.get(cle) ?? l.regleAvant ?? 0) + (op.annule ? -op.montant : op.montant);
    regle.set(cle, total);
    if (total > l.montant) err.push(`${genre === 'creance' ? 'Créance' : 'Dette'} ${ligne} : règlements supérieurs au montant de la facture.`);
    if (total < 0) err.push(`${genre === 'creance' ? 'Créance' : 'Dette'} ${ligne} : annulation d'un règlement absent.`);
  }

  // Emprunt en dollars : refusé en v1. La caisse en dollars est réévaluée à la clôture, l'emprunt ne l'est pas :
  // l'écart fabriquerait un gain ou une perte de change sans contrepartie (AUDCIF, art. 54 et 57). À voir avec l'expert.
  for (const op of d.operations) {
    if (op.nature === 'emprunt_recu' && !op.annule && comptes.get(op.compte)?.devise === 'USD') {
      err.push("Un emprunt en dollars se voit avec l'expert-comptable : notez-le sur un compte en francs, au taux du jour.");
      break;
    }
  }

  // Emprunt : le capital restant dû ne descend jamais sous zéro (D2).
  // Valorisé en francs historiques : un emprunt en dollars n'est pas réévalué en v1.
  let capital = d.empruntOuverture;
  for (const op of [...d.operations].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))) {
    if (op.nature !== 'emprunt_recu' && op.nature !== 'remboursement_emprunt') continue;
    const c = comptes.get(op.compte);
    const taux = op.taux;
    if (!c || !positif(op.montant) || (c.devise === 'USD' && !estTaux(taux))) continue;
    const fc = versFC(op.montant, c.devise, taux);
    capital += (op.nature === 'emprunt_recu' ? fc : -fc) * (op.annule ? -1 : 1);
    if (capital < 0) {
      err.push(`Opération ${op.id} : remboursement supérieur au capital restant dû de l'emprunt.`);
      break;
    }
  }

  // Immobilisations
  const immos = new Set<string>();
  const achatsLies = new Map<string, number>();
  const cessionsLiees = new Map<string, number>();
  for (const i of d.immobilisations) {
    const ref = `Immobilisation ${i.id}`;
    if (immos.has(i.id)) err.push(`${ref} en double.`);
    immos.add(i.id);
    if (!estDateISO(i.date) || i.date > ex.fin) err.push(`${ref} : date invalide ou après la clôture.`);
    if (!CATEGORIES.includes(i.categorie)) err.push(`${ref} : catégorie inconnue.`);
    if (!positif(i.montant)) err.push(`${ref} : montant entier supérieur à zéro attendu.`);
    if (i.categorie !== 'caution' && (!Number.isInteger(i.duree) || i.duree < 1)) err.push(`${ref} : durée d'amortissement en années entières attendue.`);
    if (estDateISO(i.date) && i.date >= ex.debut && !i.operation) err.push(`${ref} : acquise dans l'exercice, elle doit venir d'une opération de dépense.`);
    if (i.operation) {
      achatsLies.set(i.operation, (achatsLies.get(i.operation) ?? 0) + 1);
      const op = ops.get(i.operation);
      if (op) {
        const attendue = i.categorie === 'caution' ? 'caution' : 'materiel';
        if (op.nature !== attendue || op.annule) err.push(`${ref} : l'opération ${op.id} doit être une dépense « ${attendue} ».`);
        if (op.date !== i.date) err.push(`${ref} : même date que l'opération d'achat attendue.`);
      } else if (estDateISO(i.date) && i.date >= ex.debut) {
        err.push(`${ref} : opération d'achat introuvable (${i.operation}).`);
      }
    }
    if (i.sortie) {
      const s = i.sortie;
      if (!estDateISO(s.date) || s.date < i.date || s.date > ex.fin) err.push(`${ref} : date de sortie invalide.`);
      if (!positifOuNul(s.prixCession)) err.push(`${ref} : prix de cession entier positif ou nul attendu.`);
      if (s.operation) {
        cessionsLiees.set(s.operation, (cessionsLiees.get(s.operation) ?? 0) + 1);
        const op = ops.get(s.operation);
        if (!op || op.nature !== 'cession_materiel' || op.annule) err.push(`${ref} : la sortie doit renvoyer à une recette « cession de matériel ».`);
        else if (op.date !== s.date) err.push(`${ref} : même date que l'opération de cession attendue.`);
      }
    }
  }
  for (const op of d.operations) {
    if (op.annule || !NATURES_IMMOBILISATION.includes(op.nature)) continue;
    const n = achatsLies.get(op.id) ?? 0;
    if (n !== 1) err.push(`Opération ${op.id} : un achat de matériel ou une caution entre au registre une fois et une seule (${n} trouvée).`);
  }
  for (const [id, n] of cessionsLiees) if (n > 1) err.push(`Opération ${id} : liée à ${n} sorties d'immobilisation.`);

  // Inventaire détaillé
  if (d.lignesStock) {
    let total = 0;
    for (const l of d.lignesStock) {
      if (!positifOuNul(l.montant)) err.push(`Stock, ligne ${l.reference} : montant entier positif ou nul attendu.`);
      total += l.montant;
    }
    if (d.stockFinal !== null && total !== d.stockFinal) err.push(`Stock final (${d.stockFinal}) différent du total de l'inventaire (${total}).`);
  }

  return err;
}

/** Lève une ErreurDossier si le dossier est incohérent. */
export function verifierDossier(d: DossierExercice): void {
  const erreurs = valider(d);
  if (erreurs.length > 0) throw new ErreurDossier(erreurs);
}
