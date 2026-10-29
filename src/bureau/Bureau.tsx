/**
 * Bureau de la structure : trois écrans. La liste des clients, les contrôles d'un client, ses états SMT.
 * Il lit les dossiers enregistrés sur cet ordinateur (démonstration) ; un serveur ne viendrait qu'avec un pilote réel.
 */
import { Route, Router, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { SITE_TRK } from '../donnees/parametres';
import type { RoleBureau } from '../donnees/types';
import { Client } from './Client';
import { Clients } from './Clients';
import { FournisseurBureau, LIBELLE_ROLE, useBureau } from './contexte';

function Coquille() {
  const { role, changerRole } = useBureau();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="ecran-seul text-chrome-text" style={{ background: 'var(--bandeau)' }}>
        <div className="max-w-[1100px] mx-auto h-12 px-4 flex items-center gap-3">
          {/* La marque Mbongo : le carré bleu barré de l'étoile jaune, comme sur le téléphone. */}
          <span className="relative w-6 h-6 rounded overflow-hidden grid place-items-center" style={{ background: 'var(--a-600)' }} aria-hidden="true">
            <span className="absolute w-8 h-[6px] -rotate-[35deg]" style={{ background: 'var(--etoile)' }} />
            <span className="relative nom-marque text-[13px] text-white">M</span>
          </span>
          <a href="#/" className="text-[15px] text-white no-underline">
            <span className="nom-marque">Mbongo</span> <span className="text-chrome-text-dim">· Bureau</span>
          </a>
          <span className="flex-1" />
          <label className="flex items-center gap-2">
            <span className="text-chrome-text-dim">Je suis</span>
            <select className="champ text-text" value={role} onChange={(e) => changerRole(e.target.value as RoleBureau)}>
              <option value="assistant">{LIBELLE_ROLE.assistant}</option>
              <option value="expert">{LIBELLE_ROLE.expert}</option>
            </select>
          </label>
        </div>
        <div className="h-[3px]" style={{ background: 'var(--etoile)' }} aria-hidden="true" />
      </header>

      <main className="flex-1 w-full max-w-[1100px] mx-auto p-4 flex flex-col gap-4">
        <Switch>
          <Route path="/client/:id/:onglet?" component={Client} />
          <Route>
            <Clients />
          </Route>
        </Switch>
      </main>

      <footer className="ecran-seul text-center text-text-dim py-3">
        Mbongo Business · un logiciel de{' '}
        <a className="underline" href={SITE_TRK} target="_blank" rel="noopener">
          TRK Consulting
        </a>{' '}
        · Données de cet ordinateur.
      </footer>
    </div>
  );
}

export function Bureau() {
  return (
    <FournisseurBureau>
      <Router hook={useHashLocation}>
        <Coquille />
      </Router>
    </FournisseurBureau>
  );
}
