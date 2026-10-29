import { Link, useLocation } from 'wouter';
import type { Icone } from './icons';

export interface NavItem {
  to: string;
  label: string;
  Icon: Icone;
  /** Correspondance exacte requise (typiquement l'item d'accueil). */
  exact?: boolean;
}

export interface NavGroupe {
  titre: string;
  items: NavItem[];
}

export interface TreeNavProps {
  groupes: NavGroupe[];
  /** En-tête au-dessus des groupes (dossier ouvert et son type). */
  enTete?: { titre: string; sousTitre?: string };
  /** Statut affiché en pied de navigation. */
  statut?: { label: string; couleur?: 'positive' | 'warning' | 'danger' };
}

/**
 * Arborescence de navigation latérale, groupée par thème, jamais une liste plate.
 * L'un des deux piliers (avec le ruban) de l'archétype.
 */
export function TreeNav({ groupes, enTete, statut }: TreeNavProps) {
  const [chemin] = useLocation();
  const couleurStatut = statut?.couleur === 'warning' ? 'bg-warning' : statut?.couleur === 'danger' ? 'bg-danger' : 'bg-positive';

  return (
    <aside className="w-[210px] flex-shrink-0 flex flex-col text-chrome-text" style={{ background: 'var(--bandeau)' }}>
      {enTete && (
        <div className="px-3 py-2.5 border-b border-white/10">
          <div className="text-[12px] font-semibold truncate">{enTete.titre}</div>
          {enTete.sousTitre && <div className="text-[11px] text-chrome-text-dim">{enTete.sousTitre}</div>}
        </div>
      )}

      <nav className="flex-1 overflow-auto py-1">
        {groupes.map((g) => (
          <div key={g.titre}>
            <div className="px-2.5 pt-2.5 pb-1">
              <span className="text-[10.5px] font-semibold tracking-wider text-chrome-text-dim">{g.titre}</span>
            </div>
            {g.items.map((item) => {
              const actif = item.exact ? chemin === item.to : chemin === item.to || chemin.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  aria-current={actif ? 'page' : undefined}
                  className={`mx-1.5 flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded text-[12.5px] no-underline ${
                    actif ? 'font-semibold' : 'text-chrome-text-dim hover:text-chrome-text'
                  }`}
                  style={{ background: actif ? 'var(--bandeau-survol)' : undefined, color: actif ? '#ffffff' : undefined }}
                >
                  <item.Icon width={14} height={14} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {statut && (
        <div className="px-3 py-2 border-t border-white/10 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${couleurStatut}`} />
          <span className="text-[11px] text-chrome-text-dim">{statut.label}</span>
        </div>
      )}
    </aside>
  );
}
