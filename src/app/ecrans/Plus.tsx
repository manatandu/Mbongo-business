/** Menu des écrans moins fréquents. */
import { Link } from 'wouter';
import { useLangue, type Cle } from '../../i18n';
import { Icone } from '../composants';

const ENTREES: { href: string; icone: string; titre: Cle; aide: Cle }[] = [
  { href: '/etats', icone: 'etats', titre: 'plus.etats', aide: 'plus.etatsAide' },
  { href: '/materiel', icone: 'materiel', titre: 'plus.materiel', aide: 'plus.materielAide' },
  { href: '/stock', icone: 'stock', titre: 'plus.stock', aide: 'plus.stockAide' },
  { href: '/reglages', icone: 'reglages', titre: 'plus.reglages', aide: 'plus.reglagesAide' },
];

/** Livre des recettes et des dépenses, registre des achats. */
const LIVRES: typeof ENTREES = [
  { href: '/livre', icone: 'journal', titre: 'plus.livre', aide: 'plus.livreAide' },
  { href: '/achats', icone: 'stock', titre: 'plus.achats', aide: 'plus.achatsAide' },
];

export function Plus() {
  const { t } = useLangue();
  return (
    <nav className="menu">
      {[...ENTREES.slice(0, 1), ...LIVRES, ...ENTREES.slice(1)].map((e) => (
        <Link key={e.href} href={e.href}>
          <Icone nom={e.icone} />
          <span>
            {t(e.titre)}
            <small>{t(e.aide)}</small>
          </span>
        </Link>
      ))}
    </nav>
  );
}
