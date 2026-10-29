/**
 * Paramètres des contrôles, communs au téléphone et au bureau.
 *
 * Seuils d'éligibilité au SMT (AUDCIF, art. 13), en francs congolais : chiffre d'affaires HT annuel par secteur.
 * Valeurs retenues pour 2026, d'après le cours de la BCC. À revoir chaque année avec l'expert-comptable partenaire.
 */
import type { ParametresControle } from '../moteur';

export const PARAMETRES_CONTROLE: ParametresControle = {
  seuilsSMT: { negoce: 240_000_000, artisanat: 160_000_000, services: 120_000_000 },
};

/** Site de TRK Consulting, qui détient les droits de Mbongo Business. */
export const SITE_TRK = 'https://trk-consulting-rdc.web.app/';
