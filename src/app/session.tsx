/**
 * État partagé de l'appli : base locale, entreprise ouverte, dossier de l'exercice, date du jour.
 * Le dossier se recharge tout seul à chaque écriture dans la base (liveQuery de Dexie).
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BaseMbongo } from '../donnees/base';
import { chargerDossier, type Chargement } from '../donnees/dossier';
import { entrepriseActive, exerciceCourant } from '../donnees/entreprise';
import { dernierTaux } from '../donnees/saisie';
import type { LigneEntreprise } from '../donnees/types';
import type { DateISO } from '../moteur';
import { aujourdhuiLocal } from '../ui/format';

export const db = new BaseMbongo();

interface Session {
  /** Date du jour sur le téléphone. */
  aujourdhui: DateISO;
  /** Date de référence des calculs : aujourd'hui, ou la fin de l'exercice s'il est passé. */
  dateRef: DateISO;
  entreprise: LigneEntreprise | undefined;
  chargement: Chargement | undefined;
  /** Dernier taux du dollar connu sur le téléphone. */
  taux: number | null;
  /** Vrai tant que la base n'a pas répondu. */
  enAttente: boolean;
  annoncer: (message: string) => void;
}

const Contexte = createContext<Session | null>(null);

function useAujourdhui(): DateISO {
  const [jour, setJour] = useState(aujourdhuiLocal);
  useEffect(() => {
    const maj = () => setJour(aujourdhuiLocal());
    document.addEventListener('visibilitychange', maj);
    const minuterie = window.setInterval(maj, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', maj);
      window.clearInterval(minuterie);
    };
  }, []);
  return jour;
}

export function FournisseurSession({ children }: { children: ReactNode }) {
  const aujourdhui = useAujourdhui();
  const entreprise = useLiveQuery(async () => (await entrepriseActive(db)) ?? null, []);
  const exercice = useLiveQuery(
    async () => (entreprise ? ((await exerciceCourant(db, entreprise.id, Number(aujourdhui.slice(0, 4)))) ?? null) : null),
    [entreprise?.id, aujourdhui],
  );
  const chargement = useLiveQuery(async () => (exercice ? chargerDossier(db, exercice.id) : null), [exercice?.id]);
  const dateRef = chargement ? (aujourdhui > chargement.exercice.fin ? chargement.exercice.fin : aujourdhui) : aujourdhui;
  const taux = useLiveQuery(async () => (await dernierTaux(db, dateRef))?.valeur ?? null, [dateRef]);

  const [message, setMessage] = useState<string | null>(null);
  const minuterie = useRef<number | undefined>(undefined);
  const annoncer = useCallback((m: string) => {
    setMessage(m);
    window.clearTimeout(minuterie.current);
    minuterie.current = window.setTimeout(() => setMessage(null), 2600);
  }, []);

  // Les requêtes se suivent : tant que le dossier chargé n'est pas celui de l'entreprise ouverte, on attend.
  const coherent = Boolean(entreprise && exercice && exercice.entrepriseId === entreprise.id && chargement && chargement.exercice.id === exercice.id);
  const enAttente = entreprise === undefined || (entreprise !== null && !coherent);
  const valeur = useMemo<Session>(
    () => ({
      aujourdhui,
      dateRef,
      entreprise: entreprise ?? undefined,
      chargement: coherent ? (chargement ?? undefined) : undefined,
      taux: taux ?? null,
      enAttente,
      annoncer,
    }),
    [aujourdhui, dateRef, entreprise, chargement, coherent, taux, enAttente, annoncer],
  );
  return (
    <Contexte.Provider value={valeur}>
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </Contexte.Provider>
  );
}

export function useSession(): Session {
  const s = useContext(Contexte);
  if (!s) throw new Error('FournisseurSession manquant');
  return s;
}

/** Session avec entreprise et dossier chargés : à utiliser dans les écrans de la coque. */
export function useDossier(): Session & { chargement: Chargement; entreprise: LigneEntreprise } {
  const s = useSession();
  if (!s.chargement || !s.entreprise) throw new Error('Dossier non chargé');
  return s as Session & { chargement: Chargement; entreprise: LigneEntreprise };
}
