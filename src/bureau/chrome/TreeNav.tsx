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
    <aside className="w-[200px] flex-shrink-0 bg-chrome border-r border-border flex flex-col">
      {enTete && (
        <div className="px-2.5 py-2 border-b border-border bg-surface-alt">
          <div className="text-[11px] font-bold truncate">{enTete.titre}</div>
          {enTete.sousTitre && <div className="font-mono text-[10px] tracking-wide text-text-dim">{enTete.sousTitre}</div>}
        </div>
      )}

      <nav className="flex-1 overflow-auto py-1">
        {groupes.map((g) => (
          <div key={g.titre}>
            <div className="px-2.5 pt-2.5 pb-1">
              <span className="font-mono text-[10px] font-semibold tracking-wider text-text-dim">{g.titre}</span>
            </div>
            {g.items.map((item) => {
              const actif = item.exact ? chemin === item.to : chemin === item.to || chemin.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  aria-current={actif ? 'page' : undefined}
                  className={`flex items-center gap-2.5 pl-4 pr-2.5 py-1.5 text-[12.5px] border-l-2 no-underline ${
                    actif ? 'bg-chrome-alt border-sel text-text font-semibold' : 'border-transparent text-text-dim hover:bg-chrome-alt/60'
                  }`}
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
        <div className="px-2.5 py-2 border-t border-border flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${couleurStatut}`} />
          <span className="text-[10px] text-text-dim">{statut.label}</span>
        </div>
      )}
    </aside>
  );
}
