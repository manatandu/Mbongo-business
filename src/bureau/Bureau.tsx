/**
 * Bureau de la structure : trois écrans. La liste des clients, les contrôles d'un client, ses états SMT.
 * Il lit les dossiers enregistrés sur cet ordinateur (démonstration) ; un serveur ne viendrait qu'avec un pilote réel.
 */
import { Route, Router, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { Marque } from '../app/composants';
import { SITE_TRK } from '../donnees/parametres';
import type { RoleBureau } from '../donnees/types';
import { Client } from './Client';
import { Clients } from './Clients';
import { FournisseurBureau, LIBELLE_ROLE, useBureau } from './contexte';

function Coquille() {
  const { role, changerRole } = useBureau();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="entete ecran-seul">
        <div className="max-w-[1100px] mx-auto h-14 px-4 flex items-center gap-3">
          <Marque />
          <a href="#/" className="text-[15px] text-white no-underline">
            <span className="nom-marque">Mbongo</span> <span className="text-chrome-text-dim">· Bureau</span>
          </a>
          <span className="flex-1" />
          <label className="flex items-center gap-2">
            <span className="text-chrome-text-dim">Je suis</span>
            <select className="champ" value={role} onChange={(e) => changerRole(e.target.value as RoleBureau)}>
              <option value="assistant">{LIBELLE_ROLE.assistant}</option>
              <option value="expert">{LIBELLE_ROLE.expert}</option>
            </select>
          </label>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1100px] mx-auto px-4 py-4 flex flex-col gap-3">
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
