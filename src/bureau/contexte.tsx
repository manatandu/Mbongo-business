/** État du bureau : base locale, rôle choisi, date du jour, dossier d'un client. */
import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { BaseMbongo } from '../donnees/base';
import { chargerDossier, type Chargement } from '../donnees/dossier';
import { exerciceCourant } from '../donnees/entreprise';
import type { RoleBureau } from '../donnees/types';
import type { DateISO } from '../moteur';
import { aujourdhuiLocal } from '../ui/format';

export const db = new BaseMbongo();

export const LIBELLE_ROLE: Record<RoleBureau, string> = { assistant: 'Assistant', expert: 'Expert-comptable partenaire' };

interface ContexteBureau {
  role: RoleBureau;
  changerRole: (r: RoleBureau) => void;
  aujourdhui: DateISO;
}

const Contexte = createContext<ContexteBureau | null>(null);

const lireRole = (): RoleBureau => {
  try {
    return localStorage.getItem('mbongo.bureau.role') === 'expert' ? 'expert' : 'assistant';
  } catch {
    return 'assistant';
  }
};

export function FournisseurBureau({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<RoleBureau>(lireRole);
  const changerRole = useCallback((r: RoleBureau) => {
    setRole(r);
    try {
      localStorage.setItem('mbongo.bureau.role', r);
    } catch {
      // Préférence non gardée : sans conséquence.
    }
  }, []);
  const valeur = useMemo(() => ({ role, changerRole, aujourdhui: aujourdhuiLocal() }), [role, changerRole]);
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useBureau(): ContexteBureau {
  const c = useContext(Contexte);
  if (!c) throw new Error('FournisseurBureau manquant');
  return c;
}

/** Dossier de l'exercice en cours d'un client, rechargé à chaque écriture. `null` : introuvable. */
export function useDossierBureau(entrepriseId: string | undefined): Chargement | null | undefined {
  const { aujourdhui } = useBureau();
  return useLiveQuery(async () => {
    if (!entrepriseId) return null;
    const ex = await exerciceCourant(db, entrepriseId, Number(aujourdhui.slice(0, 4)));
    return ex ? chargerDossier(db, ex.id) : null;
  }, [entrepriseId, aujourdhui]);
}

export const dateRefDe = (c: Chargement, aujourdhui: DateISO): DateISO => (aujourdhui > c.exercice.fin ? c.exercice.fin : aujourdhui);
