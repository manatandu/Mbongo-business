/** État du bureau : base locale, rôle choisi, date du jour, dossier ouvert. */
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
  /** Message de la barre d'état. */
  message: string;
  annoncer: (m: string) => void;
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
  const [message, setMessage] = useState('Prêt');
  const changerRole = useCallback((r: RoleBureau) => {
    setRole(r);
    setMessage(`Rôle : ${LIBELLE_ROLE[r]}`);
    try {
      localStorage.setItem('mbongo.bureau.role', r);
    } catch {
      // Préférence non gardée : sans conséquence.
    }
  }, []);
  const valeur = useMemo(() => ({ role, changerRole, aujourdhui: aujourdhuiLocal(), message, annoncer: setMessage }), [role, changerRole, message]);
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useBureau(): ContexteBureau {
  const c = useContext(Contexte);
  if (!c) throw new Error('FournisseurBureau manquant');
  return c;
}

/** Dossier de l'exercice en cours d'une entreprise, rechargé à chaque écriture. `null` : introuvable. */
export function useDossierBureau(entrepriseId: string | undefined): Chargement | null | undefined {
  const { aujourdhui } = useBureau();
  return useLiveQuery(async () => {
    if (!entrepriseId) return null;
    const ex = await exerciceCourant(db, entrepriseId, Number(aujourdhui.slice(0, 4)));
    return ex ? chargerDossier(db, ex.id) : null;
  }, [entrepriseId, aujourdhui]);
}

export const dateRefDe = (c: Chargement, aujourdhui: DateISO): DateISO => (aujourdhui > c.exercice.fin ? c.exercice.fin : aujourdhui);

/** Cadre commun des pages : titre d'écran (15 px au plus) et contenu dense. */
export function Page({ titre, sousTitre, children }: { titre: string; sousTitre?: string; children: ReactNode }) {
  return (
    <div className="p-2.5 flex flex-col gap-2.5">
      <div className="flex items-baseline gap-3">
        <h1 className="m-0 text-[15px] font-semibold">{titre}</h1>
        {sousTitre && <span className="text-[11px] text-text-dim">{sousTitre}</span>}
      </div>
      {children}
    </div>
  );
}

export function Pastille({ ton, children }: { ton: 'ok' | 'avert' | 'danger' | 'neutre'; children: ReactNode }) {
  const c = {
    ok: 'bg-positive-soft text-positive border-positive/40',
    avert: 'bg-warning-soft text-warning border-warning/40',
    danger: 'bg-danger-soft text-danger border-danger/40',
    neutre: 'bg-chrome text-text-dim border-border',
  }[ton];
  return <span className={`pastille ${c}`}>{children}</span>;
}

export function Chargement({ etat }: { etat: unknown }) {
  if (etat === undefined) return <div className="p-2.5 text-[12px] text-text-dim">Chargement…</div>;
  return <div className="p-2.5 text-[12px] text-text-dim">Dossier introuvable sur ce poste.</div>;
}
