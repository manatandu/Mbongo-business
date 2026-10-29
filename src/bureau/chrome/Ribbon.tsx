import type { ReactNode } from 'react';
import { IconLogo, type Icone } from './icons';
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
    <div className="border-b border-border-dark bg-chrome">
      <div
        className="h-[26px] flex items-center justify-between px-2 text-white text-[11.5px]"
        style={{ background: 'linear-gradient(180deg, var(--titlebar-from), var(--titlebar-to))' }}
      >
        <div className="flex items-center gap-2">
          <IconLogo width={14} height={14} />
          <span>
            {nomApp}
            {contexte ? ` · ${contexte}` : ''}
          </span>
        </div>
      </div>

      <MenuBar menus={menus} />

      <div className="flex items-stretch justify-between min-h-[58px]">
        <div className="flex items-stretch px-2 py-1">
          {groupes.map((g) => (
            <div key={g.titre} className="flex flex-col items-center px-2.5 border-r border-border">
              <div className="flex-1 flex items-center gap-2">
                {g.boutons.map((b) => (
                  <button
                    key={b.label}
                    type="button"
                    onClick={b.onClick}
                    disabled={b.disabled}
                    className="flex flex-col items-center gap-0.5 px-1 py-0.5 w-[60px] hover:enabled:bg-chrome-alt disabled:opacity-40"
                  >
                    <b.Icon width={20} height={20} />
                    <span className="text-[9.5px] text-text-dim text-center leading-tight">{b.label}</span>
                  </button>
                ))}
              </div>
              <div className="text-[9px] text-text-dim mt-0.5">{g.titre}</div>
            </div>
          ))}
        </div>
        {droite && <div className="flex items-center px-3">{droite}</div>}
      </div>
    </div>
  );
}
