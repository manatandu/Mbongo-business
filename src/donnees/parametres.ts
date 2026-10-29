/**
 * Paramètres des contrôles, communs au téléphone et au bureau.
 *
 * Les seuils du SMT sont fixés en FCFA (AUDCIF, art. 13). Pour les comparer aux ventes en francs congolais,
 * il faut un équivalent : environ 5 FC pour 1 FCFA en 2026 (le FCFA suit l'euro, le franc congolais suit
 * le dollar). Valeur indicative, à revoir chaque année avec l'expert-comptable partenaire.
 */
import type { ParametresControle } from '../moteur';

export const PARAMETRES_CONTROLE: ParametresControle = {
  fcfaVersCdf: 5,
};
