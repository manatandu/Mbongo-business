import type { ReactNode } from 'react';
import type { MenuDef } from './MenuBar';
import { Ribbon } from './Ribbon';
import { RibbonProvider, useRibbonContext } from './ribbon-context';
import { StatusBar } from './StatusBar';
import { TreeNav, type NavGroupe, type TreeNavProps } from './TreeNav';

export interface AppShellProps {
  nomApp: string;
  contexte?: string;
  menus: MenuDef[];
  navGroupes: NavGroupe[];
  navEnTete?: TreeNavProps['enTete'];
  navStatut?: TreeNavProps['statut'];
  statusGauche?: string;
  statusDroite?: string;
  children: ReactNode;
}

function ShellInterieur(props: AppShellProps) {
  const { groupes, droite } = useRibbonContext();
  return (
    <div className="h-screen flex flex-col bg-bg text-text">
      <Ribbon nomApp={props.nomApp} contexte={props.contexte} menus={props.menus} groupes={groupes} droite={droite} />
      <div className="flex-1 flex min-h-0">
        <TreeNav groupes={props.navGroupes} enTete={props.navEnTete} statut={props.navStatut} />
        <main className="flex-1 min-w-0 overflow-auto">{props.children}</main>
      </div>
      <StatusBar gauche={props.statusGauche} droite={props.statusDroite} />
    </div>
  );
}

/**
 * Coquille complète : ruban + navigation latérale + zone de contenu + barre d'état.
 * Les pages déclarent le contenu du ruban via `useRibbon()` (voir ribbon-context.tsx).
 */
export function AppShell(props: AppShellProps) {
  return (
    <RibbonProvider>
      <ShellInterieur {...props} />
    </RibbonProvider>
  );
}
