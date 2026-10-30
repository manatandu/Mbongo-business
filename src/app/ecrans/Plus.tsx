/** Menu des écrans moins fréquents, dans l'ordre d'usage. */
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useLocation } from 'wouter';
import { useLangue, type Cle } from '../../i18n';
import { codeDefini } from '../../donnees/reglages';
import { Icone } from '../composants';
import { db, useDossier } from '../session';

export const ENTREES: { href: string; icone: string; titre: Cle }[] = [
  { href: '/etats', icone: 'etats', titre: 'plus.etats' },
  { href: '/impots', icone: 'impots', titre: 'plus.impots' },
  { href: '/echeances', icone: 'echeances', titre: 'plus.echeances' },
  { href: '/livre', icone: 'livre', titre: 'plus.livre' },
  { href: '/materiel', icone: 'materiel', titre: 'plus.materiel' },
  { href: '/stock', icone: 'stock', titre: 'plus.stock' },
  { href: '/reglages', icone: 'reglages', titre: 'plus.reglages' },
];

/** Se déconnecter = verrouiller : Mbongo n'a pas de compte en ligne, le code à quatre chiffres rouvre l'appli.
 * Sans code, on conduit le commerçant à l'endroit où il en choisit un. */
export function Deconnexion({ classe }: { classe?: string }) {
  const { t } = useLangue();
  const { annoncer } = useDossier();
  const [, aller] = useLocation();
  const aCode = useLiveQuery(() => codeDefini(db), []);
  return (
    <button
      type="button"
      className={classe}
      onClick={() => {
        if (aCode) window.dispatchEvent(new Event('mbongo:verrouiller'));
        else {
          annoncer(t('deconnexion.sansCode'));
          aller('/reglages/code');
        }
      }}
    >
      <Icone nom="deconnexion" />
      <span>{t('nav.deconnexion')}</span>
    </button>
  );
}

export function Plus() {
  const { t } = useLangue();
  return (
    <nav className="menu">
      {ENTREES.map((e) => (
        <Link key={e.href} href={e.href}>
          <Icone nom={e.icone} />
          <span>{t(e.titre)}</span>
        </Link>
      ))}
      <Deconnexion />
    </nav>
  );
}
