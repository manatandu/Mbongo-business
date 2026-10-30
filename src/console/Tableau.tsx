/** Tableau de bord de la console et journal des rappels SMS. */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Carte, Fenetre, Message, Pastille } from '../bureau/ui';
import { aujourdhuiLocal, fmt, fmtDate } from '../ui/format';
import { afficherTelephone, etatAbonnement, LIBELLE_FORMULE, TARIFS } from './abonnement';
import { EtatAbo } from './Console';
import { useAdmin } from './role';
import { sb, useLecture, type ClientVue, type Paiement, type Sms } from './supabase';

function Chiffre({ titre, valeur, detail }: { titre: string; valeur: string; detail?: string }) {
  return (
    <div className="chiffre flex flex-col gap-0.5">
      <span className="text-text-dim text-[13px]">{titre}</span>
      <span className="chiffre-valeur">{valeur}</span>
      {detail && <span className="text-text-dim text-[12px]">{detail}</span>}
    </div>
  );
}

export function TableauDeBord() {
  const [, aller] = useLocation();
  const debutMois = aujourdhuiLocal().slice(0, 8) + '01';
  const clients = useLecture<ClientVue[]>(() => sb.from('vue_clients').select('*').order('nom'), []);
  const paiements = useLecture<Paiement[]>(() => sb.from('paiements').select('*').gte('date', debutMois), [debutMois]);
  const liste = clients.donnees ?? [];
  const actifs = liste.filter((c) => c.statut === 'actif');
  const aRelancer = actifs
    .filter((c) => ['bientot', 'echeance', 'retard'].includes(etatAbonnement(c.jours_restants)))
    .sort((a, b) => (a.jours_restants ?? 0) - (b.jours_restants ?? 0));
  const encaisse = (paiements.donnees ?? []).filter((p) => p.devise === 'CDF').reduce((s, p) => s + p.montant, 0);
  const mensuel = actifs.filter((c) => (c.jours_restants ?? -1) >= 0).reduce((s, c) => s + (c.formule ? TARIFS[c.formule] : 0), 0);

  return (
    <>
      {clients.erreur && <Message ton="danger">{clients.erreur}</Message>}
      <div className="chiffres grid gap-y-4 grid-cols-2 md:grid-cols-4">
        <Chiffre titre="Clients actifs" valeur={String(actifs.length)} detail={`${liste.filter((c) => c.statut === 'prospect').length} prospect(s)`} />
        <Chiffre titre="À relancer" valeur={String(aRelancer.length)} detail="échéance dans 10 jours ou dépassée" />
        <Chiffre titre="Encaissé ce mois" valeur={`${fmt(encaisse)} CDF`} detail={`${(paiements.donnees ?? []).length} paiement(s)`} />
        <Chiffre titre="Abonnements en cours" valeur={`${fmt(mensuel)} CDF`} detail="par mois, Essentiel et Suivi" />
      </div>

      <Fenetre titre="À relancer" droite={<span className="text-chrome-text-dim">{aRelancer.length} client(s)</span>}>
        {aRelancer.length === 0 ? (
          <p className="m-0 text-text-dim">Aucun abonnement n'arrive à terme dans les 10 jours.</p>
        ) : (
          <div className="overflow-auto">
            <table className="grille">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Formule</th>
                  <th>Fin</th>
                  <th>État</th>
                  <th>Téléphone</th>
                  <th>SMS</th>
                </tr>
              </thead>
              <tbody>
                {aRelancer.map((c) => (
                  <tr key={c.id} className="cursor-pointer" onClick={() => aller(`/client/${c.id}`)}>
                    <td className="font-semibold">{c.nom}</td>
                    <td>{c.formule ? LIBELLE_FORMULE[c.formule] : ''}</td>
                    <td>{c.fin ? fmtDate(c.fin) : ''}</td>
                    <td>
                      <EtatAbo jours={c.jours_restants} />
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <a href={`https://wa.me/${c.telephone.slice(1)}`} target="_blank" rel="noopener">
                        {afficherTelephone(c.telephone)}
                      </a>
                    </td>
                    <td>{c.sms_accepte ? <Pastille ton="ok">oui</Pastille> : <Pastille ton="neutre">refusés</Pastille>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Fenetre>
    </>
  );
}

const MOTIF = { j10: '10 jours avant', j3: '3 jours avant', j0: 'jour de fin', retard: 'retard' } as const;
const STATUT = {
  simule: { texte: 'test, non envoyé', ton: 'neutre' },
  a_envoyer: { texte: 'à envoyer', ton: 'avert' },
  envoye: { texte: 'envoyé', ton: 'ok' },
  echec: { texte: 'échec', ton: 'danger' },
} as const;

export function Rappels() {
  const admin = useAdmin();
  const sms = useLecture<Sms[]>(() => sb.from('sms').select('*, clients(nom)').order('cree_le', { ascending: false }).limit(200), []);
  const mode = useLecture<{ valeur: string }>(() => sb.from('reglages_console').select('valeur').eq('cle', 'sms_mode').maybeSingle(), []);
  const [message, setMessage] = useState<{ ton: 'ok' | 'danger'; texte: string } | null>(null);

  async function lancer() {
    const { data, error } = await sb.rpc('lancer_rappels');
    setMessage(error ? { ton: 'danger', texte: error.message } : { ton: 'ok', texte: `${data as number} rappel(s) préparé(s).` });
    sms.relire();
  }

  return (
    <Fenetre
      titre="Rappels SMS"
      droite={
        admin ? (
          <button className="btn btn-principal" onClick={() => void lancer()}>
            Lancer les rappels maintenant
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        {mode.donnees?.valeur === 'test' && (
          <Message ton="avert">Mode test : les SMS sont préparés et listés ici, mais ne partent pas. Ils partiront dès qu'un fournisseur de SMS sera branché.</Message>
        )}
        <Carte titre="Quand partent-ils ?">
          <p className="m-0 text-text-dim">
            Chaque jour à 8 h (Kinshasa), pour le dernier abonnement de chaque client actif qui a accepté les SMS : 10 jours avant la fin, 3 jours avant, le jour de la fin, puis une fois en
            cas de retard. Jamais deux fois le même rappel pour un abonnement.
          </p>
        </Carte>
        {message && <Message ton={message.ton}>{message.texte}</Message>}
        {sms.erreur && <Message ton="danger">{sms.erreur}</Message>}
        <div className="overflow-auto">
          <table className="grille">
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Rappel</th>
                <th>Téléphone</th>
                <th>Message</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {(sms.donnees ?? []).map((s) => (
                <tr key={s.id}>
                  <td>{fmtDate(s.prevu_le)}</td>
                  <td>
                    <a href={`#/client/${s.client_id}`}>{s.clients?.nom ?? ''}</a>
                  </td>
                  <td>{MOTIF[s.motif]}</td>
                  <td className="whitespace-nowrap">{afficherTelephone(s.telephone)}</td>
                  <td className="text-[13px]">{s.texte}</td>
                  <td>
                    <Pastille ton={STATUT[s.statut].ton}>{STATUT[s.statut].texte}</Pastille>
                  </td>
                </tr>
              ))}
              {sms.donnees?.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-text-dim">
                    Aucun rappel pour l'instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Fenetre>
  );
}
