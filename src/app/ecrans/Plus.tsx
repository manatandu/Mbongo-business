/** Menu des écrans moins fréquents, dans l'ordre d'usage. */
import { Link } from 'wouter';
import { useLangue, type Cle } from '../../i18n';
import { Icone } from '../composants';

const ENTREES: { href: string; icone: string; titre: Cle }[] = [
  { href: '/etats', icone: 'etats', titre: 'plus.etats' },
  { href: '/echeances', icone: 'journal', titre: 'plus.echeances' },
  { href: '/livre', icone: 'journal', titre: 'plus.livre' },
  { href: '/achats', icone: 'stock', titre: 'plus.achats' },
  { href: '/materiel', icone: 'materiel', titre: 'plus.materiel' },
  { href: '/stock', icone: 'stock', titre: 'plus.stock' },
  { href: '/reglages', icone: 'reglages', titre: 'plus.reglages' },
];

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
    </nav>
  );
}
