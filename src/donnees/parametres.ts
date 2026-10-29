/**
 * Paramètres des contrôles, communs au téléphone et au bureau.
 *
 * Les seuils du SMT sont fixés en FCFA (AUDCIF, art. 13). Pour les comparer aux ventes en francs congolais,
 * il faut un équivalent. Cours de la BCC (skill bcc-banque-centrale-donnees-macro, série cours-de-change) :
 * 100 FCFA = 397,30 FC en moyenne d'août 2026, soit environ 4 FC pour 1 FCFA. Le FCFA suit l'euro, le franc
 * congolais flotte : à revoir chaque année avec l'expert-comptable partenaire.
 */
import type { ParametresControle } from '../moteur';

export const PARAMETRES_CONTROLE: ParametresControle = {
  fcfaVersCdf: 4,
};
