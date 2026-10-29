/** Traduction de l'interface : français ou lingala, choisi sur le téléphone. */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { fr, MOIS_FR, type Cle } from './fr';
import { ln, MOIS_LN } from './ln';

export type Langue = 'fr' | 'ln';
export type { Cle };

const DICTIONNAIRES: Record<Langue, Record<Cle, string>> = { fr, ln };
const MOIS: Record<Langue, string[]> = { fr: MOIS_FR, ln: MOIS_LN };

export function traduire(langue: Langue, cle: Cle, valeurs: Record<string, string | number> = {}): string {
  const modele = DICTIONNAIRES[langue][cle] || fr[cle];
  return modele.replace(/\{(\w+)\}/g, (_, k: string) => String(valeurs[k] ?? `{${k}}`));
}

interface ContexteLangue {
  langue: Langue;
  changer: (l: Langue) => void;
  t: (cle: Cle, valeurs?: Record<string, string | number>) => string;
  /** Nom du mois, 1 à 12. */
  mois: (m: number) => string;
}

const Contexte = createContext<ContexteLangue | null>(null);

const lireLangue = (): Langue => {
  try {
    return localStorage.getItem('mbongo.langue') === 'ln' ? 'ln' : 'fr';
  } catch {
    return 'fr';
  }
};

export function FournisseurLangue({ children }: { children: ReactNode }) {
  const [langue, setLangue] = useState<Langue>(lireLangue);
  const changer = useCallback((l: Langue) => {
    setLangue(l);
    document.documentElement.lang = l;
    try {
      localStorage.setItem('mbongo.langue', l);
    } catch {
      // Préférence non gardée : sans conséquence.
    }
  }, []);
  const valeur = useMemo<ContexteLangue>(
    () => ({ langue, changer, t: (cle, v) => traduire(langue, cle, v), mois: (m) => MOIS[langue][m - 1] ?? '' }),
    [langue, changer],
  );
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useLangue(): ContexteLangue {
  const c = useContext(Contexte);
  if (!c) throw new Error('FournisseurLangue manquant');
  return c;
}
