/** Coque de l'appli commerçant : verrou, accueil sans entreprise, ou écrans avec la barre d'onglets. */
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Link, Route, Router, Switch, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { FournisseurLangue, useLangue, type Cle } from '../i18n';
import { envoyer } from '../donnees/envoi';
import { codeDefini, definirCode, verifierCode } from '../donnees/reglages';
import { Icone, Marque } from './composants';
import { mettreAJour, useInstallation } from './installation';
import { Accueil } from './ecrans/Accueil';
import { Bienvenue, CreerEntreprise } from './ecrans/Bienvenue';
import { Livre, RegistreAchats } from './ecrans/Livres';
import { DossierCreance } from './ecrans/DossierCreance';
import { Echeances } from './ecrans/Echeances';
import { Etats } from './ecrans/Etats';
import { Impots } from './ecrans/Impots';
import { FinJournee } from './ecrans/FinJournee';
import { Journal } from './ecrans/Journal';
import { Materiel } from './ecrans/Materiel';
import { Deconnexion, ENTREES, Plus } from './ecrans/Plus';
import { Reglages } from './ecrans/Reglages';
import { Saisir } from './ecrans/Saisir';
import { Stock } from './ecrans/Stock';
import { Tiers } from './ecrans/Tiers';
import { db, FournisseurSession, useDossier, useSession } from './session';

const ONGLETS: { href: string; icone: string; cle: Cle; actif: (chemin: string) => boolean }[] = [
  { href: '/', icone: 'accueil', cle: 'nav.accueil', actif: (c) => c === '/' || c === '/journee' },
  { href: '/journal', icone: 'journal', cle: 'nav.journal', actif: (c) => c.startsWith('/journal') },
  // Au milieu, sous le pouce : le geste le plus fréquent.
  { href: '/saisir', icone: 'saisir', cle: 'nav.saisir', actif: (c) => c.startsWith('/saisir') },
  { href: '/clients', icone: 'clients', cle: 'nav.clients', actif: (c) => c.startsWith('/clients') || c.startsWith('/creance') },
  { href: '/plus', icone: 'plus', cle: 'nav.plus', actif: (c) => ['/plus', '/etats', '/materiel', '/stock', '/reglages', '/livre', '/achats', '/echeances', '/impots'].some((p) => c.startsWith(p)) },
];

/** Titre de la fenêtre selon l'écran : la barre de titre nomme l'écran, aucun titre de page ne le répète. */
const TITRES: [string, Cle][] = [
  ['/saisir', 'fenetre.saisir'],
  ['/journal', 'fenetre.journal'],
  ['/clients', 'fenetre.clients'],
  ['/creance', 'fenetre.creance'],
  ['/plus', 'fenetre.plus'],
  ['/etats', 'fenetre.etats'],
  ['/materiel', 'fenetre.materiel'],
  ['/stock', 'fenetre.stock'],
  ['/reglages', 'fenetre.reglages'],
  ['/livre', 'fenetre.livre'],
  ['/achats', 'fenetre.achats'],
  ['/echeances', 'fenetre.echeances'],
  ['/impots', 'fenetre.impots'],
  ['/journee', 'fenetre.journee'],
];

function Coque() {
  const { entreprise, chargement } = useDossier();
  const { t } = useLangue();
  const [chemin] = useLocation();
  const titre = TITRES.find(([p]) => chemin.startsWith(p))?.[1] ?? 'fenetre.accueil';
  const accueil = titre === 'fenetre.accueil';
  // Chaque écran s'ouvre en haut, pas à la hauteur où l'on avait laissé le précédent.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [chemin]);
  // Envoi à TRK, si le téléphone est relié : à l'ouverture, au retour du réseau, puis toutes les cinq minutes.
  // Une erreur se tait ici : Réglages montre ce qui reste à envoyer.
  useEffect(() => {
    const tenter = () => {
      if (navigator.onLine && document.visibilityState === 'visible') void envoyer(db, entreprise.id).catch(() => undefined);
    };
    tenter();
    window.addEventListener('online', tenter);
    document.addEventListener('visibilitychange', tenter);
    const minuterie = window.setInterval(tenter, 5 * 60_000);
    return () => {
      window.removeEventListener('online', tenter);
      document.removeEventListener('visibilitychange', tenter);
      window.clearInterval(minuterie);
    };
  }, [entreprise.id]);
  return (
    // Sur téléphone, la coque s'efface (display: contents) ; sur ordinateur, elle pose le menu à gauche.
    <div className="coque">
      <header className="entete">
        <Marque />
        <div className="txt">
          <span className="nom-marque">Mbongo</span>
          <span className="dossier">{entreprise.nom}</span>
        </div>
        {entreprise.demo && <span className="fictif">{t('app.fictif')}</span>}
      </header>
      <main className={accueil ? 'ecran accueil' : 'ecran'}>
        {/* La clé rejoue l'entrée de la fenêtre à chaque changement d'écran. */}
        <section className="fenetre" key={titre}>
          {/* Sur l'accueil, la caisse tient lieu de titre. */}
          <h1 className={accueil ? 'fenetre-titre visuellement-cache' : 'fenetre-titre'}>
            {t(titre)}
            <small>{t('fenetre.exercice', { annee: chargement.exercice.annee })}</small>
          </h1>
          <div className="fenetre-corps">
            <Switch>
              <Route path="/" component={Accueil} />
              {/* La clé force un formulaire neuf quand on passe de « Recette » à « Dépense » depuis l'accueil. */}
              <Route path="/saisir/:type?">{(p) => <Saisir key={p.type ?? 'recette'} />}</Route>
              <Route path="/journal/:compte?/:mois?" component={Journal} />
              <Route path="/clients/:genre?" component={Tiers} />
              <Route path="/plus" component={Plus} />
              <Route path="/etats" component={Etats} />
              <Route path="/materiel" component={Materiel} />
              <Route path="/stock/:onglet?" component={Stock} />
              <Route path="/reglages/:section?" component={Reglages} />
              <Route path="/livre/:mois?" component={Livre} />
              <Route path="/achats" component={RegistreAchats} />
              <Route path="/creance/:id" component={DossierCreance} />
              <Route path="/echeances" component={Echeances} />
              <Route path="/impots" component={Impots} />
              <Route path="/journee" component={FinJournee} />
              <Route>
                <Accueil />
              </Route>
            </Switch>
          </div>
        </section>
      </main>
      <nav className="onglets" aria-label="Navigation">
        {ONGLETS.map((o) => (
          <Link key={o.href} href={o.href} className={o.href === '/plus' ? 'etroit-seul' : o.href === '/saisir' ? 'saisir' : undefined} aria-current={o.actif(chemin) ? 'page' : undefined}>
            <Icone nom={o.icone} />
            {t(o.cle)}
          </Link>
        ))}
        {/* Sur ordinateur, les écrans du menu « Plus » sont tous dans la colonne de gauche. */}
        <span className="large-seul separateur" aria-hidden="true" />
        {ENTREES.map((e) => (
          <Link key={e.href} href={e.href} className="large-seul" aria-current={chemin.startsWith(e.href) ? 'page' : undefined}>
            <Icone nom={e.icone} />
            {t(e.titre)}
          </Link>
        ))}
        <span className="large-seul separateur" aria-hidden="true" />
        <Deconnexion classe="large-seul" />
      </nav>
    </div>
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
  // Code oublié : taper le nom de l'entreprise retire le code. Discrétion, pas sécurité (voir definirCode).
  const [oubli, setOubli] = useState(false);
  const [nom, setNom] = useState('');
  const [nomFaux, setNomFaux] = useState(false);
  const retirer = async () => {
    const simple = (x: string) => x.trim().toLowerCase().replace(/\s+/g, ' ');
    const noms = (await db.entreprises.toArray()).map((e) => simple(e.nom));
    if (!noms.includes(simple(nom))) return setNomFaux(true);
    await definirCode(db, null);
    ouvrir();
  };
  return (
    <div className="verrou">
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 21, margin: 0 }}>{t('verrou.titre')}</h1>
      <input type="password" inputMode="numeric" autoComplete="off" autoFocus aria-label={t('verrou.titre')} value={code} onChange={(e) => void saisir(e.target.value)} />
      {faux && <p className="erreur">{t('verrou.faux')}</p>}
      {oubli ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void retirer();
          }}
        >
          <label className="champ">
            {t('verrou.nom')}
            <input autoComplete="off" value={nom} onChange={(e) => (setNom(e.target.value), setNomFaux(false))} />
          </label>
          {nomFaux && <p className="erreur">{t('verrou.nomFaux')}</p>}
          <button className="bouton">{t('verrou.retirer')}</button>
        </form>
      ) : (
        <button className="lien-bouton" onClick={() => setOubli(true)}>
          {t('verrou.oublie')}
        </button>
      )}
    </div>
  );
}

function Contenu() {
  const { entreprise, enAttente } = useSession();
  const { t } = useLangue();
  const aCode = useLiveQuery(() => codeDefini(db), []);
  const [ouvert, setOuvert] = useState(false);
  // Pas de code à l'ouverture : l'appli est ouverte. Choisir un code ensuite ne la referme pas d'un coup.
  useEffect(() => {
    if (aCode === false) setOuvert(true);
  }, [aCode]);
  // « Se déconnecter » : l'appli se referme derrière le code.
  useEffect(() => {
    const fermer = () => setOuvert(false);
    window.addEventListener('mbongo:verrouiller', fermer);
    return () => window.removeEventListener('mbongo:verrouiller', fermer);
  }, []);

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
