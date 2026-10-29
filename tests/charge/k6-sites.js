/**
 * Test de charge k6 des sites de Mbongo : l'appli, le bureau, le site de TRK Consulting (avec la page Mbongo Business)
 * et la console. Chaque utilisateur virtuel ouvre une page, puis tous les fichiers qu'elle appelle (scripts, styles,
 * images, manifeste) ; tout doit répondre 200, vite.
 *
 * En ligne (depuis un ordinateur avec k6 installé) :
 *   k6 run tests/charge/k6-sites.js
 * En local, sur des serveurs de test, avec la charge forte (60 utilisateurs) :
 *   CHARGE=forte APPLI=http://localhost:4173 TRK=http://localhost:4174 CONSOLE=http://localhost:4175 k6 run tests/charge/k6-sites.js
 *
 * Avec SUPABASE=1, il vérifie aussi qu'un visiteur non connecté ne lit aucune donnée de la console (règles RLS).
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';

const APPLI = __ENV.APPLI || 'https://mbongo-business.web.app';
const TRK = __ENV.TRK || 'https://trkconsulting.web.app';
const CONSOLE = __ENV.CONSOLE || 'https://trkconsole.web.app';
const SUPABASE_URL = 'https://vloavruyppvmbqlfldad.supabase.co';
const CLE_PUBLIQUE = 'sb_publishable_KCJsAwlWR4ILrX05JWTUNQ_DnUdNcg5';

// Par défaut, une charge légère : l'offre gratuite de Firebase limite le trafic par jour, et une charge forte
// (près de 2 Go en une minute) rendrait les sites indisponibles jusqu'au lendemain. CHARGE=forte : en local seulement.
const FORTE = __ENV.CHARGE === 'forte';

export const options = {
  scenarios: {
    visiteurs: FORTE
      ? {
          executor: 'ramping-vus',
          stages: [
            { duration: '15s', target: 30 },
            { duration: '30s', target: 60 },
            { duration: '10s', target: 0 },
          ],
        }
      : { executor: 'constant-vus', vus: 3, duration: '20s' },
  },
  thresholds: {
    // Aucune erreur tolérée, et des pages rapides.
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
    checks: ['rate>0.99'],
  },
};

const PAGES = [
  { nom: 'appli', url: `${APPLI}/` },
  { nom: 'bureau', url: `${APPLI}/bureau.html` },
  { nom: 'manifeste', url: `${APPLI}/manifest.webmanifest` },
  { nom: 'service worker', url: `${APPLI}/sw.js` },
  { nom: 'site TRK', url: `${TRK}/` },
  { nom: 'page Mbongo Business', url: `${TRK}/mbongo-business/` },
  { nom: 'console', url: `${CONSOLE}/` },
];

/** Fichiers appelés par une page HTML (src et href relatifs), résolus par rapport à la page. */
function ressources(html, base) {
  const liens = new Set();
  const motif = /(?:src|href)="([^"#]+)"/g;
  let m;
  while ((m = motif.exec(html)) !== null) {
    const lien = m[1];
    if (/^(https?:|mailto:|tel:|data:)/.test(lien)) continue;
    const dossier = base.endsWith('/') ? base : base.slice(0, base.lastIndexOf('/') + 1);
    liens.add(lien.startsWith('/') ? base.replace(/^(https?:\/\/[^/]+).*$/, '$1') + lien : dossier + lien.replace(/^\.\//, ''));
  }
  return [...liens].filter((u) => /\.(js|css|svg|png|ico|woff2|webmanifest)$/.test(u));
}

export default function () {
  for (const p of PAGES) {
    group(p.nom, () => {
      const r = http.get(p.url, { tags: { page: p.nom } });
      check(r, { [`${p.nom} : 200`]: (x) => x.status === 200, [`${p.nom} : non vide`]: (x) => (x.body || '').length > 100 });
      if (r.status === 200 && /\.html$|\/$/.test(p.url)) {
        const lots = ressources(r.body, p.url).map((u) => ['GET', u, null, { tags: { page: p.nom } }]);
        for (const [i, x] of http.batch(lots).entries()) check(x, { [`${p.nom} : fichier ${lots[i][1].split('/').pop()} 200`]: (y) => y.status === 200 });
      }
    });
  }
  sleep(1);
}

/** Une seule fois au départ : un visiteur non connecté ne doit rien lire dans la console. */
export function setup() {
  if (!__ENV.SUPABASE) return;
  for (const table of ['clients', 'abonnements', 'paiements', 'sms', 'saisies', 'administrateurs']) {
    const r = http.get(`${SUPABASE_URL}/rest/v1/${table}?select=*`, { headers: { apikey: CLE_PUBLIQUE, Authorization: `Bearer ${CLE_PUBLIQUE}` } });
    check(r, { [`Supabase ${table} : rien pour un visiteur`]: (x) => x.status === 401 || x.status === 403 || x.body === '[]' });
  }
}
