import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { RibbonGroupe } from './Ribbon';

interface RibbonContextValue {
  groupes: RibbonGroupe[];
  droite: ReactNode;
  definir: (groupes: RibbonGroupe[], droite?: ReactNode) => void;
}

const RibbonContext = createContext<RibbonContextValue | null>(null);

export function RibbonProvider({ children }: { children: ReactNode }) {
  const [groupes, setGroupes] = useState<RibbonGroupe[]>([]);
  const [droite, setDroite] = useState<ReactNode>(null);

  return (
    <RibbonContext.Provider
      value={{
        groupes,
        droite,
        definir: (g, d) => {
          setGroupes(g);
          setDroite(d ?? null);
        },
      }}
    >
      {children}
    </RibbonContext.Provider>
  );
}

export function useRibbonContext() {
  const ctx = useContext(RibbonContext);
  if (!ctx) throw new Error('useRibbonContext doit être utilisé dans un <RibbonProvider>');
  return ctx;
}

/**
 * À appeler dans chaque page pour déclarer les groupes de boutons du ruban
 * contextuel.
 *
 * PIÈGE DÉJÀ RENCONTRÉ ET À NE PAS REPRODUIRE : si l'effet ci-dessous suit
 * `[groupes, droite]` (ou aucun tableau de dépendances) au lieu de `[]`,
 * chaque re-rendu de la page recrée un nouvel objet `groupes`/`droite`
 * (nouvelle référence), ce qui redéclenche l'effet -> nouveau set-state ->
 * nouveau re-rendu -> boucle infinie ("Maximum update depth exceeded").
 * Avec `[]`, l'enregistrement se fait une seule fois au montage de la page.
 *
 * Contrepartie acceptée : les gestionnaires onClick capturés au montage
 * restent des closures sur les valeurs de ce moment-là (state, navigate...).
 * C'est suffisant tant que ces gestionnaires n'ont pas besoin de réagir à un
 * état qui change en cours de vie de la page (navigate/actions stables le
 * sont ; un compteur local affiché dans le libellé d'un bouton ne le
 * serait pas ; dans ce cas, prévoir un mécanisme dédié plutôt que de
 * retirer le tableau de dépendances).
 */
export function useRibbon(groupes: RibbonGroupe[], droite?: ReactNode) {
  const { definir } = useRibbonContext();
  useEffect(() => {
    definir(groupes, droite);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
