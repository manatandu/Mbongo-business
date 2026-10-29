/**
 * Bureau de la structure : assistant et expert-comptable partenaire.
 * Style « logiciel expert Windows dense » (skill dense-desktop-design) : barre de titre, menus, ruban,
 * arborescence, barre d'état.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Route, Router, Switch, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { MENTION_ETATS, VERSION_MOTEUR } from '../moteur';
import { AppShell } from './chrome/AppShell';
import { PortailModale } from './kit/PortailModale';
import {
  IconAlert,
  IconBook,
  IconBox,
  IconCoins,
  IconHistory,
  IconScale,
  IconStamp,
  IconTool,
  IconUsers,
  IconList,
} from './chrome/icons';
import type { MenuDef } from './chrome/MenuBar';
import type { NavGroupe } from './chrome/TreeNav';
import { db, FournisseurBureau, LIBELLE_ROLE, useBureau } from './contexte';
import { Arrete } from './pages/Arrete';
import { Controles } from './pages/Controles';
import { Etats } from './pages/Etats';
import { Interventions } from './pages/Interventions';
import { Inventaire } from './pages/Inventaire';
import { Journaux } from './pages/Journaux';
import { Materiel } from './pages/Materiel';
import { Portefeuille } from './pages/Portefeuille';
import { Taux } from './pages/Taux';
import { Tiers } from './pages/Tiers';

const SECTEURS = { negoce: 'Négoce', artisanat: 'Artisanat', services: 'Services' } as const;

function APropos({ fermer }: { fermer: () => void }) {
  return (
    <PortailModale>
      <div className="anim-voile fixed inset-0 z-40 bg-[rgba(11,42,82,0.28)] flex justify-center p-4 voile-centre-sur" onClick={fermer}>
        <div role="dialog" aria-modal="true" aria-label="À propos de Mbongo" className="anim-modale modale-bornee w-[440px] bg-surface shadow-dominante overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="h-8 flex items-center px-3 text-white text-[12.5px] font-semibold" style={{ background: 'var(--bandeau)' }}>
            À propos de Mbongo
          </div>
          <div className="p-4 text-[12px] flex flex-col gap-2">
          <p className="m-0 font-semibold">Mbongo · bureau de la structure</p>
          <p className="m-0">Moteur de calcul SMT {VERSION_MOTEUR} (AUDCIF révisé, art. 13 et Titre X).</p>
          <p className="m-0 text-text-dim">
            L'assistant contrôle, forme et prépare ; il n'écrit jamais une opération du commerçant. Les actes réservés par la loi n° 15/002 (art. 43) passent par
            l'expert-comptable partenaire, inscrit au tableau de l'Ordre.
          </p>
          <p className="m-0 font-semibold">{MENTION_ETATS}</p>
          <p className="m-0 text-text-dim">Données de ce poste uniquement : le serveur partagé arrive à l'étape 3.</p>
            <div className="flex justify-end pt-1">
              <button className="btn btn-neutre" onClick={fermer}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </PortailModale>
  );
}

function Coquille() {
  const { role, changerRole, message } = useBureau();
  const [chemin, aller] = useLocation();
  const [aPropos, setAPropos] = useState(false);
  const idDossier = /^\/dossier\/([^/]+)/.exec(chemin)?.[1];
  const entreprise = useLiveQuery(() => (idDossier ? db.entreprises.get(idDossier) : undefined), [idDossier]);
  const exercice = useLiveQuery(
    async () => (idDossier ? (await db.exercices.where('entrepriseId').equals(idDossier).toArray()).sort((a, b) => b.annee - a.annee)[0] : undefined),
    [idDossier],
  );
  const expert = role === 'expert';
  const d = (page: string) => `/dossier/${idDossier ?? ''}/${page}`;

  const pagesDossier: { page: string; label: string }[] = [
    { page: 'controles', label: 'Contrôles' },
    { page: 'journaux', label: 'Journaux de trésorerie' },
    { page: 'tiers', label: 'Créances et dettes' },
    { page: 'materiel', label: 'Registre du matériel' },
    { page: 'inventaire', label: 'Inventaire du stock' },
    { page: 'etats', label: 'États SMT' },
  ];
  const menus: MenuDef[] = [
    {
      titre: 'Fichier',
      items: [
        { label: 'Portefeuille des clients', onClick: () => aller('/') },
        { label: "Ouvrir l'appli du commerçant", onClick: () => window.open('./index.html', '_blank') },
        { label: 'Imprimer la page', onClick: () => window.print() },
      ],
    },
    {
      titre: 'Dossier',
      items: pagesDossier.map((p) => ({
        label: p.label,
        disabled: !idDossier,
        indication: idDossier ? undefined : 'ouvrir un dossier',
        onClick: () => aller(d(p.page)),
      })),
    },
    { titre: 'Références', items: [{ label: 'Taux du dollar', onClick: () => aller('/taux') }] },
    {
      titre: 'Expert-comptable',
      items: [
        { label: 'Revue et arrêté des états', disabled: !expert || !idDossier, indication: !expert ? 'rôle expert' : !idDossier ? 'ouvrir un dossier' : undefined, onClick: () => aller(d('arrete')) },
        { label: 'Journal des interventions', onClick: () => aller('/interventions') },
      ],
    },
    {
      titre: 'Affichage',
      items: [
        { label: `Rôle : ${LIBELLE_ROLE.assistant}`, disabled: role === 'assistant', indication: role === 'assistant' ? 'actif' : undefined, onClick: () => changerRole('assistant') },
        { label: `Rôle : ${LIBELLE_ROLE.expert}`, disabled: expert, indication: expert ? 'actif' : undefined, onClick: () => changerRole('expert') },
      ],
    },
    { titre: '?', items: [{ label: 'À propos de Mbongo', onClick: () => setAPropos(true) }] },
  ];

  const navGroupes: NavGroupe[] = [
    { titre: 'Portefeuille', items: [{ to: '/', label: 'Clients suivis', Icon: IconUsers, exact: true }] },
    ...(idDossier
      ? [
          {
            titre: 'Dossier',
            items: [
              { to: d('controles'), label: 'Contrôles', Icon: IconAlert },
              { to: d('journaux'), label: 'Journaux', Icon: IconBook },
              { to: d('tiers'), label: 'Créances et dettes', Icon: IconList },
              { to: d('materiel'), label: 'Matériel', Icon: IconTool },
              { to: d('inventaire'), label: 'Inventaire', Icon: IconBox },
              { to: d('etats'), label: 'États SMT', Icon: IconScale },
            ],
          },
        ]
      : []),
    { titre: 'Références', items: [{ to: '/taux', label: 'Taux du dollar', Icon: IconCoins }] },
    {
      titre: 'Expert-comptable',
      items: [
        ...(expert && idDossier ? [{ to: d('arrete'), label: 'Revue et arrêté', Icon: IconStamp }] : []),
        { to: '/interventions', label: 'Interventions', Icon: IconHistory },
      ],
    },
  ];

  const statut = exercice ? (exercice.statut === 'arrete' ? `arrêté` : 'ouvert') : '';
  return (
    <>
      <AppShell
        nomApp="Mbongo · Bureau"
        contexte={entreprise ? `${entreprise.nom}${entreprise.demo ? ' (fictif)' : ''}` : undefined}
        menus={menus}
        navGroupes={navGroupes}
        navEnTete={
          entreprise && exercice
            ? { titre: entreprise.nom, sousTitre: `SMT · ${SECTEURS[entreprise.secteur]} · ${exercice.annee} · ${statut}` }
            : { titre: 'Portefeuille', sousTitre: LIBELLE_ROLE[role] }
        }
        navStatut={{ label: 'Poste local, sans serveur', couleur: 'warning' }}
        statusGauche={message}
        statusDroite={`${LIBELLE_ROLE[role]} · Moteur SMT ${VERSION_MOTEUR} · ${MENTION_ETATS}`}
      >
        {/* La clé remonte la page à chaque changement de chemin : le ruban, déclaré au montage, reste juste. */}
        <Switch key={chemin}>
          <Route path="/" component={Portefeuille} />
          <Route path="/taux" component={Taux} />
          <Route path="/interventions" component={Interventions} />
          <Route path="/dossier/:id/controles" component={Controles} />
          <Route path="/dossier/:id/journaux" component={Journaux} />
          <Route path="/dossier/:id/tiers" component={Tiers} />
          <Route path="/dossier/:id/materiel" component={Materiel} />
          <Route path="/dossier/:id/inventaire" component={Inventaire} />
          <Route path="/dossier/:id/etats" component={Etats} />
          <Route path="/dossier/:id/arrete" component={Arrete} />
          <Route>
            <Portefeuille />
          </Route>
        </Switch>
      </AppShell>
      {aPropos && <APropos fermer={() => setAPropos(false)} />}
    </>
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
