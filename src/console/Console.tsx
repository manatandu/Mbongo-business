/**
 * Console de TRK Consulting : suivi des clients et de leurs abonnements, rappels SMS.
 * À part du logiciel : autre adresse, accès réservé aux administrateurs (règles RLS de la base).
 */
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Route, Router, Switch, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { Fenetre, Message, Pastille } from '../bureau/ui';
import { etatAbonnement, type EtatAbonnement } from './abonnement';
import { FicheClient, ListeClients } from './Clients';
import { Rappels, TableauDeBord } from './Tableau';
import { sb } from './supabase';
import symboleTrk from './trk-symbole-negatif.svg';

export const ETAT: Record<EtatAbonnement, { texte: string; ton: 'ok' | 'avert' | 'danger' | 'neutre' }> = {
  aucun: { texte: 'sans abonnement', ton: 'neutre' },
  en_cours: { texte: 'en cours', ton: 'ok' },
  bientot: { texte: 'bientôt à terme', ton: 'avert' },
  echeance: { texte: "échéance aujourd'hui", ton: 'avert' },
  retard: { texte: 'en retard', ton: 'danger' },
  fini: { texte: 'terminé', ton: 'neutre' },
};

export function EtatAbo({ jours }: { jours: number | null }) {
  const e = ETAT[etatAbonnement(jours)];
  return (
    <Pastille ton={e.ton}>
      {e.texte}
      {jours !== null && jours > 0 && jours <= 10 ? ` · ${jours} j` : ''}
    </Pastille>
  );
}

function Connexion() {
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [message, setMessage] = useState<{ ton: 'ok' | 'danger'; texte: string } | null>(null);
  const [occupe, setOccupe] = useState(false);

  async function agir(e: FormEvent, inscription: boolean) {
    e.preventDefault();
    setOccupe(true);
    setMessage(null);
    const r = inscription ? await sb.auth.signUp({ email, password: mdp }) : await sb.auth.signInWithPassword({ email, password: mdp });
    setOccupe(false);
    if (r.error) setMessage({ ton: 'danger', texte: r.error.message === 'Invalid login credentials' ? 'Adresse ou mot de passe incorrect.' : r.error.message });
    else if (inscription && !r.data.session) setMessage({ ton: 'ok', texte: "Accès créé. Confirmez l'adresse avec le lien reçu par e-mail, puis connectez-vous." });
  }

  return (
    <div className="max-w-[380px] mx-auto mt-16 w-full">
      <Fenetre titre="Console TRK Consulting">
        <form className="flex flex-col gap-3" onSubmit={(e) => void agir(e, false)}>
          <label>
            <span className="libelle">Adresse e-mail</span>
            <input className="champ w-full" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            <span className="libelle">Mot de passe</span>
            <input className="champ w-full" type="password" autoComplete="current-password" minLength={8} value={mdp} onChange={(e) => setMdp(e.target.value)} required />
          </label>
          {message && <Message ton={message.ton}>{message.texte}</Message>}
          <button className="btn btn-principal" disabled={occupe}>
            Se connecter
          </button>
          <button type="button" className="btn btn-neutre" disabled={occupe || !email || mdp.length < 8} onClick={(e) => void agir(e, true)}>
            Créer mon accès
          </button>
          <p className="text-text-dim text-[13px] m-0">Réservé à l'équipe de TRK Consulting. Un accès créé ne voit rien tant qu'il n'a pas été autorisé.</p>
        </form>
      </Fenetre>
    </div>
  );
}

function Onglet({ vers, children }: { vers: string; children: ReactNode }) {
  const [lieu] = useLocation();
  const actif = vers === '/' ? lieu === '/' : lieu.startsWith(vers) || (vers === '/clients' && lieu.startsWith('/client/'));
  return (
    <Link href={vers} className={`onglet no-underline ${actif ? 'onglet-actif' : ''}`}>
      {children}
    </Link>
  );
}

function Coquille({ session, admin }: { session: Session; admin: boolean | null }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="ecran-seul text-chrome-text" style={{ background: 'var(--bandeau)' }}>
        <div className="max-w-[1100px] mx-auto h-12 px-4 flex items-center gap-3">
          <img src={symboleTrk} alt="" className="w-7 h-7" />
          <a href="#/" className="text-[15px] text-white no-underline">
            <span className="nom-marque">TRK Consulting</span> <span className="text-chrome-text-dim">· Console</span>
          </a>
          <span className="flex-1" />
          <span className="text-chrome-text-dim hidden sm:inline">{session.user.email}</span>
          <button className="btn btn-neutre" onClick={() => void sb.auth.signOut()}>
            Se déconnecter
          </button>
        </div>
        <div className="h-[3px]" style={{ background: '#e0b21b' }} aria-hidden="true" />
      </header>

      <main className="flex-1 w-full max-w-[1100px] mx-auto p-4 flex flex-col gap-4">
        {admin === null ? null : !admin ? (
          <Fenetre titre="Accès en attente">
            <Message ton="avert">Ce compte n'est pas encore administrateur. Demandez à TRK Consulting d'autoriser {session.user.email}.</Message>
          </Fenetre>
        ) : (
          <>
            <nav className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }} aria-label="Console">
              <Onglet vers="/">Tableau de bord</Onglet>
              <Onglet vers="/clients">Clients</Onglet>
              <Onglet vers="/rappels">Rappels SMS</Onglet>
            </nav>
            <Switch>
              <Route path="/client/:id">{(p) => <FicheClient id={p.id} />}</Route>
              <Route path="/clients" component={ListeClients} />
              <Route path="/rappels" component={Rappels} />
              <Route component={TableauDeBord} />
            </Switch>
          </>
        )}
      </main>
      <footer className="ecran-seul text-center text-text-dim py-3">Console interne de TRK Consulting · Mbongo Business</footer>
    </div>
  );
}

export function Console() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [admin, setAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    void sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setAdmin(null);
    if (!session) return;
    void sb
      .from('administrateurs')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setAdmin(!!data));
  }, [session]);

  if (session === undefined) return null;
  return <Router hook={useHashLocation}>{session ? <Coquille session={session} admin={admin} /> : <Connexion />}</Router>;
}
