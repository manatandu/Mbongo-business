/**
 * Paramètres des contrôles, communs au téléphone et au bureau.
 *
 * Seuils d'éligibilité au SMT (AUDCIF, art. 13 : 60, 40 et 30 millions de FCFA « ou l'équivalent »), en francs
 * congolais : chiffre d'affaires HT annuel par secteur. Équivalent au cours croisé de la BCC, moyenne d'août 2026
 * (100 FCFA = 397,30 FC) : 238,38, 158,92 et 119,19 M FC, arrondis au million inférieur pour ne pas laisser au SMT
 * une entité qui l'aurait dépassé. À revoir chaque année avec l'expert-comptable partenaire.
 */
import type { ParametresControle } from '../moteur';

export const PARAMETRES_CONTROLE: ParametresControle = {
  seuilsSMT: { negoce: 238_000_000, artisanat: 158_000_000, services: 119_000_000 },
  // 10 000 USD au cours BCC d'août 2026 (environ 2 260 FC), pour l'interdiction des espèces (loi n° 22/068, art. 23).
  seuilEspecesCDF: 22_600_000,
};

/** Site de TRK Consulting, qui détient les droits de Mbongo Business. */
export const SITE_TRK = 'https://trkconsulting.web.app/';
