/** Rôle de la personne connectée à la console. Les droits réels sont dans la base (règles RLS) ; l'écran ne fait que masquer ce qui serait refusé. */
import { createContext, useContext } from 'react';

export type RoleEquipe = 'admin' | 'assistant';

export const LIBELLE_ROLE: Record<RoleEquipe, string> = { admin: 'Administrateur', assistant: 'Assistant' };

export const RoleContexte = createContext<RoleEquipe>('assistant');

export const useAdmin = (): boolean => useContext(RoleContexte) === 'admin';
