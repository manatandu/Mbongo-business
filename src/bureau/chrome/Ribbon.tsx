import type { ReactNode } from 'react';
import type { Icone } from './icons';
import { MenuBar, type MenuDef } from './MenuBar';

export interface RibbonGroupe {
  titre: string;
  boutons: Array<{
    label: string;
    Icon: Icone;
    onClick?: () => void;
    disabled?: boolean;
  }>;
}

export interface RibbonProps {
  /** Nom de l'application, affiché dans la barre de titre. */
  nomApp: string;
  /** Contexte courant (dossier ouvert), affiché à côté du nom de l'app. */
  contexte?: string;
  /**
   * Menus de la barre de menus classique, CHACUN avec ses vrais items (voir MenuBar.tsx).
   * Un menu dont la fonction n'existe pas encore garde `items: []` : MenuBar affiche alors
   * « Pas encore disponible ». Jamais de barre de menus décorative.
   */
  menus: MenuDef[];
  /** Groupes de boutons du ruban, déclarés par la page active via `useRibbon`. */
  groupes: RibbonGroupe[];
  /** Contenu additionnel affiché à droite du ruban. */
  droite?: ReactNode;
}

/**
 * Barre de titre + barre de menus + ruban à groupes de boutons contextuels.
 * Pièce structurante de l'archétype « logiciel expert Windows » : ne pas la remplacer par un header web.
 */
export function Ribbon({ nomApp, contexte, menus, groupes, droite }: RibbonProps) {
  return (
    <div className="relative z-10">
      <header className="h-9 flex items-center gap-3 px-3 text-chrome-text" style={{ background: 'var(--bandeau)' }}>
        {/* La marque Mbongo : le carré bleu barré de l'étoile jaune, comme sur le téléphone. */}
        <span className="relative w-5 h-5 rounded overflow-hidden grid place-items-center" style={{ background: 'var(--a-600)' }} aria-hidden="true">
          <span className="absolute w-7 h-[5px] -rotate-[35deg]" style={{ background: 'var(--etoile)' }} />
          <span className="relative font-bold text-[11px] text-white">M</span>
        </span>
        <span className="font-semibold text-[12.5px]">{nomApp}</span>
        {contexte && <span className="text-chrome-text-dim">· {contexte}</span>}
      </header>
      <div className="h-[2px]" style={{ background: 'var(--etoile)' }} aria-hidden="true" />

      <MenuBar menus={menus} />

      <div className="flex items-stretch justify-between min-h-[52px] bg-chrome border-b border-chrome-border">
        <div className="flex items-stretch px-2 py-1">
          {groupes.map((g) => (
            <div key={g.titre} className="flex flex-col items-center px-2 border-r border-chrome-border last:border-r-0">
              <div className="flex-1 flex items-center gap-1">
                {g.boutons.map((b) => (
                  <button
                    key={b.label}
                    type="button"
                    onClick={b.onClick}
                    disabled={b.disabled}
                    className="flex flex-col items-center gap-0.5 px-1 py-1 w-[64px] rounded text-text hover:enabled:bg-sel-soft disabled:opacity-40"
                  >
                    <b.Icon width={18} height={18} />
                    <span className="text-[10.5px] text-text-dim text-center leading-tight">{b.label}</span>
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-text-dim">{g.titre}</div>
            </div>
          ))}
        </div>
        {droite && <div className="flex items-center px-3">{droite}</div>}
      </div>
    </div>
  );
}
