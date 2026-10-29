/**
 * Accès au serveur de la console (projet Supabase « mbongo »).
 * La clé publique peut figurer dans le code : ce sont les règles RLS de la base qui protègent les données.
 */
import { createClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import type { DateISO } from '../moteur/types';
import type { Formule } from './abonnement';

export const sb = createClient('https://vloavruyppvmbqlfldad.supabase.co', 'sb_publishable_KCJsAwlWR4ILrX05JWTUNQ_DnUdNcg5');

export type Secteur = 'negoce' | 'artisanat' | 'services';
export type StatutClient = 'prospect' | 'actif' | 'suspendu' | 'resilie';

export interface Client {
  id: string;
  nom: string;
  responsable: string;
  telephone: string;
  commune: string;
  activite: string;
  secteur: Secteur;
  langue: 'fr' | 'ln';
  sms_accepte: boolean;
  statut: StatutClient;
  note: string;
  cree_le: string;
}

/** Ligne de `vue_clients` : le client et son dernier abonnement. */
export interface ClientVue extends Client {
  abonnement_id: string | null;
  formule: Formule | null;
  debut: DateISO | null;
  fin: DateISO | null;
  montant_abonnement: number | null;
  jours_restants: number | null;
  paye_cdf: number;
}

export interface Abonnement {
  id: string;
  client_id: string;
  formule: Formule;
  debut: DateISO;
  fin: DateISO;
  montant: number;
}

export interface Paiement {
  id: string;
  client_id: string;
  abonnement_id: string | null;
  date: DateISO;
  montant: number;
  devise: 'CDF' | 'USD';
  mode: 'especes' | 'mpesa' | 'orange' | 'airtel' | 'banque';
  reference: string;
}

export interface Suivi {
  id: string;
  client_id: string;
  date: DateISO;
  type: 'visite' | 'appel' | 'formation' | 'controle' | 'autre';
  note: string;
}

export interface Sms {
  id: string;
  client_id: string;
  motif: 'j10' | 'j3' | 'j0' | 'retard';
  telephone: string;
  texte: string;
  statut: 'simule' | 'a_envoyer' | 'envoye' | 'echec';
  prevu_le: DateISO;
  clients?: { nom: string } | null;
}

/** Lecture simple : données, erreur, et de quoi relire après une écriture. */
export function useLecture<T>(lire: () => PromiseLike<{ data: T | null; error: { message: string } | null }>, deps: unknown[]) {
  const [donnees, setDonnees] = useState<T | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [tour, setTour] = useState(0);
  useEffect(() => {
    let actif = true;
    void lire().then(({ data, error }) => {
      if (!actif) return;
      setErreur(error ? error.message : null);
      setDonnees(data);
    });
    return () => {
      actif = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tour]);
  const relire = useCallback(() => setTour((t) => t + 1), []);
  return { donnees, erreur, relire };
}
