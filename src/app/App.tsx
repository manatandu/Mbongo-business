/** Coque de l'appli commerçant : verrou, accueil sans entreprise, ou écrans avec la barre d'onglets. */
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Link, Route, Router, Switch, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { FournisseurLangue, useLangue, type Cle } from '../i18n';
import { codeDefini, verifierCode } from '../donnees/reglages';
import { Icone } from './composants';
import { mettreAJour, useInstallation } from './installation';
import { Accueil } from './ecrans/Accueil';
import { Bienvenue, CreerEntreprise } from './ecrans/Bienvenue';
import { Etats } from './ecrans/Etats';
import { Journal } from './ecrans/Journal';
import { Materiel } from './ecrans/Materiel';
import { Plus } from './ecrans/Plus';
import { Reglages } from './ecrans/Reglages';
import { Saisir } from './ecrans/Saisir';
import { Stock } from './ecrans/Stock';
import { Tiers } from './ecrans/Tiers';
import { db, FournisseurSession, useDossier, useSession } from './session';

const ONGLETS: { href: string; icone: string; cle: Cle; actif: (chemin: string) => boolean }[] = [
  { href: '/', icone: 'accueil', cle: 'nav.accueil', actif: (c) => c === '/' },
  { href: '/saisir', icone: 'saisir', cle: 'nav.saisir', actif: (c) => c.startsWith('/saisir') },
  { href: '/journal', icone: 'journal', cle: 'nav.journal', actif: (c) => c.startsWith('/journal') },
  { href: '/clients', icone: 'clients', cle: 'nav.clients', actif: (c) => c.startsWith('/clients') },
  { href: '/plus', icone: 'plus', cle: 'nav.plus', actif: (c) => ['/plus', '/etats', '/materiel', '/stock', '/reglages'].some((p) => c.startsWith(p)) },
];

function Coque() {
  const { entreprise } = useDossier();
  const { t } = useLangue();
  const [chemin] = useLocation();
  // Chaque écran s'ouvre en haut, pas à la hauteur où l'on avait laissé le précédent.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [chemin]);
  return (
    <>
      <header className="entete">
        <div className="txt">
          <div className="qui">
            {entreprise.responsable}
            {entreprise.commune ? ` · ${entreprise.commune}` : ''}
          </div>
          <h1>{entreprise.nom}</h1>
        </div>
        {entreprise.demo && <span className="fictif">{t('app.fictif')}</span>}
      </header>
      <main className="ecran">
        <Switch>
          <Route path="/" component={Accueil} />
          {/* La clé force un formulaire neuf quand on passe de « Recette » à « Dépense » depuis l'accueil. */}
          <Route path="/saisir/:type?">{(p) => <Saisir key={p.type ?? 'recette'} />}</Route>
          <Route path="/journal/:compte?/:mois?" component={Journal} />
          <Route path="/clients/:genre?" component={Tiers} />
          <Route path="/plus" component={Plus} />
          <Route path="/etats" component={Etats} />
          <Route path="/materiel" component={Materiel} />
          <Route path="/stock" component={Stock} />
          <Route path="/reglages" component={Reglages} />
          <Route>
            <Accueil />
          </Route>
        </Switch>
      </main>
      <nav className="onglets" aria-label="Navigation">
        {ONGLETS.map((o) => (
          <Link key={o.href} href={o.href} aria-current={o.actif(chemin) ? 'page' : undefined}>
            <Icone nom={o.icone} />
            {t(o.cle)}
          </Link>
        ))}
      </nav>
    </>
  );
}

function Verrou({ ouvrir }: { ouvrir: () => void }) {
  const { t } = useLangue();
  const [code, setCode] = useState('');
  const [faux, setFaux] = useState(false);
  const saisir = async (v: string) => {
    const chiffres = v.replace(/\D/g, '').slice(0, 4);
    setCode(chiffres);
    setFaux(false);
    if (chiffres.length === 4) {
      if (await verifierCode(db, chiffres)) ouvrir();
      else {
        setFaux(true);
        setCode('');
      }
    }
  };
  return (
    <div className="verrou">
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 21, margin: 0 }}>{t('verrou.titre')}</h1>
      <input type="password" inputMode="numeric" autoComplete="off" autoFocus aria-label={t('verrou.titre')} value={code} onChange={(e) => void saisir(e.target.value)} />
      {faux && <p className="erreur">{t('verrou.faux')}</p>}
    </div>
  );
}

function Contenu() {
  const { entreprise, enAttente } = useSession();
  const { t } = useLangue();
  const aCode = useLiveQuery(() => codeDefini(db), []);
  const [ouvert, setOuvert] = useState(false);

  if (enAttente || aCode === undefined) return <p className="ecran aide">{t('app.chargement')}</p>;
  if (aCode && !ouvert) return <Verrou ouvrir={() => setOuvert(true)} />;
  if (!entreprise) {
    return (
      <Switch>
        <Route path="/creer" component={CreerEntreprise} />
        <Route>
          <Bienvenue />
        </Route>
      </Switch>
    );
  }
  return <Coque />;
}

/** Une nouvelle version attend : le commerçant choisit le moment, jamais au milieu d'une saisie. */
function MiseAJour() {
  const { t } = useLangue();
  const { majPrete } = useInstallation();
  if (!majPrete) return null;
  return (
    <div className="maj" role="status">
      <span>{t('maj.texte')}</span>
      <button className="bouton" onClick={mettreAJour}>
        {t('maj.bouton')}
      </button>
    </div>
  );
}

export function App() {
  return (
    <FournisseurLangue>
      <FournisseurSession>
        <Router hook={useHashLocation}>
          <div className="app">
            <MiseAJour />
            <Contenu />
          </div>
        </Router>
      </FournisseurSession>
    </FournisseurLangue>
  );
}
