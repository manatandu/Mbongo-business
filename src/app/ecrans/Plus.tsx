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

export function Plus() {
  const { t } = useLangue();
  return (
    <nav className="menu">
      {ENTREES.map((e) => (
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
