/** Clients de TRK Consulting : la liste, l'ajout, et la fiche (abonnements, paiements, suivi, SMS). */
import { useState, type FormEvent, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { Carte, Fenetre, Message, Pastille } from '../bureau/ui';
import { aujourdhuiLocal, fmt, fmtDate } from '../ui/format';
import {
  afficherTelephone,
  debutRenouvellement,
  estFormuleTRK,
  etatAbonnement,
  finAbonnement,
  FORMULES,
  LIBELLE_FORMULE,
  MISE_EN_PLACE,
  normaliserTelephone,
  TARIFS,
  type FormuleTRK,
} from './abonnement';
import { EtatAbo } from './Console';
import { useAdmin } from './role';
import { sb, useLecture, type Abonnement, type Appareil, type Client, type ClientVue, type FormeConsentement, type Paiement, type Sms, type Suivi } from './supabase';

const SECTEUR = { negoce: 'Négoce', artisanat: 'Artisanat', services: 'Services' } as const;
const STATUT = { prospect: 'Prospect', actif: 'Actif', suspendu: 'Suspendu', resilie: 'Résilié' } as const;
const MODE = { especes: 'Espèces', mpesa: 'M-Pesa', orange: 'Orange Money', airtel: 'Airtel Money', banque: 'Banque' } as const;
const FORME_ACCORD: Record<FormeConsentement, string> = { oral: 'De vive voix', ecrit: 'Par écrit (papier signé)', whatsapp: 'Par message WhatsApp' };
const FORME_ACCORD_COURT: Record<FormeConsentement, string> = { oral: 'de vive voix', ecrit: 'par écrit', whatsapp: 'par WhatsApp' };
const SUIVI = { visite: 'Visite', appel: 'Appel', formation: 'Formation', controle: 'Contrôle', autre: 'Autre' } as const;

type Filtre = 'tous' | 'relancer' | 'actifs' | 'prospects' | 'anciens';

function Champ({ libelle, children, large }: { libelle: string; children: ReactNode; large?: boolean }) {
  return (
    <label className={large ? 'sm:col-span-2' : ''}>
      <span className="libelle">{libelle}</span>
      {children}
    </label>
  );
}

/** Formulaire de la fiche : création ou modification. */
function FormClient({ depart, apres }: { depart?: Client; apres: (id: string) => void }) {
  const [c, setC] = useState({
    nom: depart?.nom ?? '',
    responsable: depart?.responsable ?? '',
    telephone: depart ? afficherTelephone(depart.telephone) : '',
    commune: depart?.commune ?? '',
    activite: depart?.activite ?? '',
    secteur: depart?.secteur ?? 'negoce',
    langue: depart?.langue ?? 'fr',
    sms_accepte: depart?.sms_accepte ?? false,
    sms_consentement_le: depart?.sms_consentement_le ?? null,
    sms_consentement_forme: depart?.sms_consentement_forme ?? null,
    statut: depart?.statut ?? 'actif',
    note: depart?.note ?? '',
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const maj = (k: keyof typeof c) => (e: { target: { value: string } }) => setC((x) => ({ ...x, [k]: e.target.value }));
  /** Cocher la case date l'accord du jour ; la décocher (retrait, STOP) efface l'accord. */
  const accordSms = (oui: boolean) =>
    setC((x) => ({ ...x, sms_accepte: oui, sms_consentement_le: oui ? (x.sms_consentement_le ?? aujourdhuiLocal()) : null, sms_consentement_forme: oui ? x.sms_consentement_forme : null }));

  async function enregistrer(e: FormEvent) {
    e.preventDefault();
    const telephone = normaliserTelephone(c.telephone);
    if (!c.nom.trim()) return setErreur('Le nom est obligatoire.');
    if (!telephone) return setErreur('Numéro de téléphone invalide.');
    if (c.sms_accepte && (!c.sms_consentement_le || !c.sms_consentement_forme)) return setErreur("SMS : indiquez la date et la forme de l'accord du client.");
    const ligne = { ...c, telephone };
    const r = depart ? await sb.from('clients').update(ligne).eq('id', depart.id).select('id').single() : await sb.from('clients').insert(ligne).select('id').single();
    if (r.error) return setErreur(r.error.message);
    setErreur(null);
    apres(r.data.id);
  }

  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => void enregistrer(e)}>
      <Champ libelle="Entreprise">
        <input className="champ w-full" value={c.nom} onChange={maj('nom')} required />
      </Champ>
      <Champ libelle="Responsable">
        <input className="champ w-full" value={c.responsable} onChange={maj('responsable')} />
      </Champ>
      <Champ libelle="Téléphone (SMS)">
        <input className="champ w-full" inputMode="tel" placeholder="0983 510 725" value={c.telephone} onChange={maj('telephone')} required />
      </Champ>
      <Champ libelle="Commune">
        <input className="champ w-full" value={c.commune} onChange={maj('commune')} />
      </Champ>
      <Champ libelle="Activité">
        <input className="champ w-full" value={c.activite} onChange={maj('activite')} />
      </Champ>
      <Champ libelle="Secteur SMT">
        <select className="champ w-full" value={c.secteur} onChange={maj('secteur')}>
          {Object.entries(SECTEUR).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Champ>
      <Champ libelle="Statut">
        <select className="champ w-full" value={c.statut} onChange={maj('statut')}>
          {Object.entries(STATUT).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Champ>
      <Champ libelle="Langue des SMS">
        <select className="champ w-full" value={c.langue} onChange={maj('langue')}>
          <option value="fr">Français</option>
          <option value="ln">Lingala</option>
        </select>
      </Champ>
      <label className="sm:col-span-2 flex items-center gap-2">
        <input type="checkbox" checked={c.sms_accepte} onChange={(e) => accordSms(e.target.checked)} />
        <span>Le client accepte de recevoir les rappels par SMS</span>
      </label>
      {c.sms_accepte && (
        <>
          <Champ libelle="Accord donné le">
            <input className="champ w-full" type="date" max={aujourdhuiLocal()} value={c.sms_consentement_le ?? ''} onChange={(e) => setC((x) => ({ ...x, sms_consentement_le: e.target.value || null }))} required />
          </Champ>
          <Champ libelle="Comment">
            <select
              className="champ w-full"
              value={c.sms_consentement_forme ?? ''}
              onChange={(e) => setC((x) => ({ ...x, sms_consentement_forme: (e.target.value || null) as FormeConsentement | null }))}
              required
            >
              <option value="">choisir</option>
              {Object.entries(FORME_ACCORD).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Champ>
          <p className="sm:col-span-2 m-0 text-text-dim text-[13px]">Gardez la preuve : le papier signé ou le message du client. Chaque SMS se termine par « Répondez STOP » ; à un STOP, décochez la case.</p>
        </>
      )}
      <Champ libelle="Note" large>
        <textarea className="champ w-full h-16 py-1" value={c.note} onChange={maj('note')} />
      </Champ>
      {erreur && (
        <div className="sm:col-span-2">
          <Message ton="danger">{erreur}</Message>
        </div>
      )}
      <div className="sm:col-span-2">
        <button className="btn btn-principal">{depart ? 'Enregistrer' : 'Ajouter le client'}</button>
      </div>
    </form>
  );
}

export function ListeClients() {
  const admin = useAdmin();
  const [, aller] = useLocation();
  const [filtre, setFiltre] = useState<Filtre>('tous');
  const [cherche, setCherche] = useState('');
  const [ajout, setAjout] = useState(false);
  const { donnees, erreur } = useLecture<ClientVue[]>(() => sb.from('vue_clients').select('*').order('nom'), []);

  const garde = (c: ClientVue) => {
    const e = etatAbonnement(c.jours_restants);
    if (filtre === 'relancer') return c.statut === 'actif' && ['bientot', 'echeance', 'retard'].includes(e);
    if (filtre === 'actifs') return c.statut === 'actif';
    if (filtre === 'prospects') return c.statut === 'prospect';
    if (filtre === 'anciens') return c.statut === 'suspendu' || c.statut === 'resilie';
    return true;
  };
  const q = cherche.trim().toLowerCase();
  const lignes = (donnees ?? []).filter(garde).filter((c) => !q || `${c.nom} ${c.responsable} ${c.commune} ${c.telephone}`.toLowerCase().includes(q));

  return (
    <Fenetre
      titre="Clients"
      droite={
        admin ? (
          <button className="btn btn-principal" onClick={() => setAjout((a) => !a)}>
            {ajout ? 'Fermer' : 'Nouveau client'}
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        {ajout && (
          <Carte titre="Nouveau client">
            <FormClient apres={(id) => aller(`/client/${id}`)} />
          </Carte>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          <input className="champ w-full sm:w-64" placeholder="Rechercher un nom, une commune, un numéro" value={cherche} onChange={(e) => setCherche(e.target.value)} />
          <select className="champ" value={filtre} onChange={(e) => setFiltre(e.target.value as Filtre)} aria-label="Filtre">
            <option value="tous">Tous</option>
            <option value="relancer">À relancer</option>
            <option value="actifs">Actifs</option>
            <option value="prospects">Prospects</option>
            <option value="anciens">Suspendus et résiliés</option>
          </select>
          <span className="text-text-dim">{lignes.length} client(s)</span>
        </div>
        {erreur && <Message ton="danger">{erreur}</Message>}
        <div className="overflow-auto">
          <table className="grille">
            <thead>
              <tr>
                <th>Client</th>
                <th>Commune</th>
                <th>Statut</th>
                <th>Formule</th>
                <th>Fin</th>
                <th>Abonnement</th>
                <th className="m">Payé (CDF)</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((c) => (
                <tr key={c.id} className="cursor-pointer" onClick={() => aller(`/client/${c.id}`)}>
                  <td className="font-semibold">
                    <a href={`#/client/${c.id}`} className="text-text no-underline">
                      {c.nom}
                    </a>
                    <div className="text-text-dim text-[12px] font-normal">{afficherTelephone(c.telephone)}</div>
                  </td>
                  <td>{c.commune}</td>
                  <td>{STATUT[c.statut]}</td>
                  <td>{c.formule ? LIBELLE_FORMULE[c.formule] : ''}</td>
                  <td>{c.fin ? fmtDate(c.fin) : ''}</td>
                  <td>
                    <EtatAbo jours={c.jours_restants} />
                  </td>
                  <td className="m">{c.montant_abonnement === null ? '' : `${fmt(c.paye_cdf)} / ${fmt(c.montant_abonnement)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Fenetre>
  );
}

function NouvelAbonnement({ client, dernier, apres }: { client: string; dernier?: Abonnement; apres: () => void }) {
  const aujourdhui = aujourdhuiLocal();
  const precedente = dernier?.formule;
  const [formule, setFormule] = useState<FormuleTRK>(estFormuleTRK(precedente) ? precedente : 'essentiel');
  const [mois, setMois] = useState(1);
  const [debut, setDebut] = useState(dernier ? debutRenouvellement(dernier.fin, aujourdhui) : aujourdhui);
  const [montant, setMontant] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const tarif = TARIFS[formule] * mois + (dernier ? 0 : MISE_EN_PLACE);
  const fin = debut ? finAbonnement(debut, mois) : '';

  async function creer(e: FormEvent) {
    e.preventDefault();
    const m = montant.trim() ? Number(montant.replace(/\s/g, '')) : tarif;
    if (!Number.isInteger(m) || m < 0) return setErreur('Montant invalide.');
    const { error } = await sb.from('abonnements').insert({ client_id: client, formule, debut, fin, montant: m });
    if (error) return setErreur(error.message);
    setErreur(null);
    apres();
  }

  return (
    <form className="flex flex-wrap gap-3 items-end" onSubmit={(e) => void creer(e)}>
      <Champ libelle="Formule">
        <select className="champ" value={formule} onChange={(e) => setFormule(e.target.value as FormuleTRK)}>
          {FORMULES.map((f) => (
            <option key={f} value={f}>
              {LIBELLE_FORMULE[f]}
            </option>
          ))}
        </select>
      </Champ>
      <Champ libelle="Durée">
        <select className="champ" value={mois} onChange={(e) => setMois(Number(e.target.value))}>
          {[1, 3, 6, 12].map((n) => (
            <option key={n} value={n}>
              {n} mois
            </option>
          ))}
        </select>
      </Champ>
      <Champ libelle="Début">
        <input className="champ" type="date" value={debut} onChange={(e) => setDebut(e.target.value)} required />
      </Champ>
      <Champ libelle={`Montant (CDF)${dernier ? '' : ', mise en place comprise'}`}>
        <input className="champ w-36" inputMode="numeric" placeholder={fmt(tarif)} value={montant} onChange={(e) => setMontant(e.target.value)} />
      </Champ>
      <span className="text-text-dim self-center">fin le {fin ? fmtDate(fin) : ''}</span>
      <button className="btn btn-principal">{dernier ? 'Renouveler' : "Créer l'abonnement"}</button>
      {erreur && <Message ton="danger">{erreur}</Message>}
    </form>
  );
}

function NouveauPaiement({ client, abonnements, apres }: { client: string; abonnements: Abonnement[]; apres: () => void }) {
  const [p, setP] = useState({ date: aujourdhuiLocal(), montant: '', devise: 'CDF', mode: 'mpesa', reference: '', abonnement_id: abonnements[0]?.id ?? '' });
  const [erreur, setErreur] = useState<string | null>(null);
  const maj = (k: keyof typeof p) => (e: { target: { value: string } }) => setP((x) => ({ ...x, [k]: e.target.value }));

  async function payer(e: FormEvent) {
    e.preventDefault();
    const brut = Number(p.montant.replace(/\s/g, '').replace(',', '.'));
    const montant = p.devise === 'USD' ? Math.round(brut * 100) : Math.round(brut);
    if (!(montant > 0)) return setErreur('Montant invalide.');
    const { error } = await sb.from('paiements').insert({ ...p, montant, client_id: client, abonnement_id: p.abonnement_id || null });
    if (error) return setErreur(error.message);
    setErreur(null);
    setP((x) => ({ ...x, montant: '', reference: '' }));
    apres();
  }

  return (
    <form className="flex flex-wrap gap-3 items-end" onSubmit={(e) => void payer(e)}>
      <Champ libelle="Date">
        <input className="champ" type="date" value={p.date} onChange={maj('date')} required />
      </Champ>
      <Champ libelle="Montant">
        <input className="champ w-32" inputMode="decimal" value={p.montant} onChange={maj('montant')} required />
      </Champ>
      <Champ libelle="Devise">
        <select className="champ" value={p.devise} onChange={maj('devise')}>
          <option>CDF</option>
          <option>USD</option>
        </select>
      </Champ>
      <Champ libelle="Moyen">
        <select className="champ" value={p.mode} onChange={maj('mode')}>
          {Object.entries(MODE).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Champ>
      <Champ libelle="Référence">
        <input className="champ w-32" value={p.reference} onChange={maj('reference')} />
      </Champ>
      <Champ libelle="Abonnement">
        <select className="champ" value={p.abonnement_id} onChange={maj('abonnement_id')}>
          <option value="">aucun</option>
          {abonnements.map((a) => (
            <option key={a.id} value={a.id}>
              {fmtDate(a.debut)} au {fmtDate(a.fin)}
            </option>
          ))}
        </select>
      </Champ>
      <button className="btn btn-principal">Enregistrer le paiement</button>
      {erreur && <Message ton="danger">{erreur}</Message>}
    </form>
  );
}

function NouveauSuivi({ client, apres }: { client: string; apres: () => void }) {
  const [type, setType] = useState<Suivi['type']>('visite');
  const [date, setDate] = useState(aujourdhuiLocal());
  const [note, setNote] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);

  async function noter(e: FormEvent) {
    e.preventDefault();
    const { error } = await sb.from('suivis').insert({ client_id: client, type, date, note });
    if (error) return setErreur(error.message);
    setErreur(null);
    setNote('');
    apres();
  }

  return (
    <form className="flex flex-wrap gap-3 items-end" onSubmit={(e) => void noter(e)}>
      <Champ libelle="Type">
        <select className="champ" value={type} onChange={(e) => setType(e.target.value as Suivi['type'])}>
          {Object.entries(SUIVI).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Champ>
      <Champ libelle="Date">
        <input className="champ" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Champ>
      <label className="flex-1 min-w-[220px]">
        <span className="libelle">Ce qui a été fait ou dit</span>
        <input className="champ w-full" value={note} onChange={(e) => setNote(e.target.value)} required />
      </label>
      <button className="btn btn-principal" disabled={!note.trim()}>
        Noter
      </button>
      {erreur && <Message ton="danger">{erreur}</Message>}
    </form>
  );
}

type OngletFiche = 'abonnements' | 'paiements' | 'suivi' | 'sms' | 'fiche';

/** Code client à donner au commerçant, et téléphones qui envoient leurs saisies. */
function Liaison({ client }: { client: string }) {
  const code = useLecture<{ code: string }>(() => sb.from('clients').select('code').eq('id', client).single(), [client]);
  const tels = useLecture<Appareil[]>(() => sb.from('appareils').select('*').eq('client_id', client).eq('actif', true).order('lie_le'), [client]);
  const [erreur, setErreur] = useState<string | null>(null);
  const c = code.donnees?.code;

  async function rpc(nom: string, args: Record<string, string>, question: string) {
    if (!window.confirm(question)) return;
    const { error } = await sb.rpc(nom, args);
    setErreur(error ? error.message : null);
    code.relire();
    tels.relire();
  }

  return (
    <Carte titre="Téléphone du commerçant">
      <div className="flex flex-col gap-2 text-[14px]">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            <span className="text-text-dim">Code client </span>
            <b className="font-mono text-[16px] tracking-wider">{c ? `${c.slice(0, 4)}-${c.slice(4)}` : '…'}</b>
          </span>
          <button className="btn btn-neutre" onClick={() => void rpc('nouveau_code_client', { p_client: client }, "Donner un nouveau code ? L'ancien ne pourra plus relier de téléphone. Les téléphones déjà reliés continuent d'envoyer.")}>
            Nouveau code
          </button>
        </div>
        <p className="text-text-dim">À taper une fois dans Mbongo : Réglages, TRK Consulting. Les saisies partent ensuite seules quand il y a du réseau.</p>
        {(tels.donnees ?? []).map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-3">
            <Pastille ton="ok">relié</Pastille>
            <span>
              {a.nom || 'Téléphone'} · depuis le {fmtDate(a.lie_le.slice(0, 10))} · {a.dernier_envoi ? `dernier envoi le ${fmtDate(a.dernier_envoi.slice(0, 10))}` : 'aucun envoi'} · {a.saisies_recues} lignes reçues
            </span>
            <button className="btn btn-neutre" onClick={() => void rpc('delier_appareil', { p_appareil: a.id }, 'Délier ce téléphone ? Il n’enverra plus rien.')}>
              Délier
            </button>
          </div>
        ))}
        {tels.donnees?.length === 0 && <p className="text-text-dim">Aucun téléphone relié.</p>}
        {erreur && <Message ton="danger">{erreur}</Message>}
      </div>
    </Carte>
  );
}

export function FicheClient({ id }: { id: string }) {
  const admin = useAdmin();
  const [onglet, setOnglet] = useState<OngletFiche>('abonnements');
  const client = useLecture<ClientVue>(() => sb.from('vue_clients').select('*').eq('id', id).single(), [id]);
  const abos = useLecture<Abonnement[]>(() => sb.from('abonnements').select('*').eq('client_id', id).order('fin', { ascending: false }), [id]);
  const paie = useLecture<Paiement[]>(() => sb.from('paiements').select('*').eq('client_id', id).order('date', { ascending: false }), [id]);
  const suivis = useLecture<Suivi[]>(() => sb.from('suivis').select('*').eq('client_id', id).order('date', { ascending: false }), [id]);
  const sms = useLecture<Sms[]>(() => sb.from('sms').select('*').eq('client_id', id).order('cree_le', { ascending: false }), [id]);
  const c = client.donnees;
  const toutRelire = () => {
    client.relire();
    abos.relire();
    paie.relire();
  };

  if (client.erreur) return <Message ton="danger">{client.erreur}</Message>;
  if (!c) return null;
  const ongletBouton = (o: OngletFiche, texte: string) => (
    <button className={`onglet ${onglet === o ? 'onglet-actif' : ''}`} onClick={() => setOnglet(o)}>
      {texte}
    </button>
  );

  return (
    <Fenetre titre={c.nom} droite={<EtatAbo jours={c.jours_restants} />}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[14px]">
          <span>
            <span className="text-text-dim">Responsable </span>
            {c.responsable || 'non renseigné'}
          </span>
          <span>
            <span className="text-text-dim">Téléphone </span>
            <a href={`https://wa.me/${c.telephone.slice(1)}`} target="_blank" rel="noopener">
              {afficherTelephone(c.telephone)}
            </a>
          </span>
          <span>
            <span className="text-text-dim">Secteur </span>
            {SECTEUR[c.secteur]}
          </span>
          <span>
            <span className="text-text-dim">Statut </span>
            {STATUT[c.statut]}
          </span>
          <span>
            {!c.sms_accepte ? (
              <Pastille ton="neutre">SMS refusés</Pastille>
            ) : c.sms_consentement_le && c.sms_consentement_forme ? (
              <Pastille ton="ok">
                SMS acceptés le {fmtDate(c.sms_consentement_le)}, {FORME_ACCORD_COURT[c.sms_consentement_forme]}
              </Pastille>
            ) : (
              <Pastille ton="avert">SMS acceptés, accord à dater (onglet Fiche)</Pastille>
            )}
          </span>
        </div>

        <Liaison client={id} />

        <nav className="segment">
          {ongletBouton('abonnements', 'Abonnements')}
          {ongletBouton('paiements', 'Paiements')}
          {ongletBouton('suivi', 'Suivi')}
          {ongletBouton('sms', 'SMS')}
          {admin && ongletBouton('fiche', 'Fiche')}
        </nav>

        {onglet === 'abonnements' && (
          <>
            {admin && (
              <Carte titre={abos.donnees?.length ? 'Renouveler' : 'Premier abonnement'}>
                <NouvelAbonnement key={abos.donnees?.[0]?.id ?? 'premier'} client={id} dernier={abos.donnees?.[0]} apres={toutRelire} />
              </Carte>
            )}
            <table className="grille">
              <thead>
                <tr>
                  <th>Formule</th>
                  <th>Du</th>
                  <th>Au</th>
                  <th className="m">Montant (CDF)</th>
                  <th className="m">Payé (CDF)</th>
                </tr>
              </thead>
              <tbody>
                {(abos.donnees ?? []).map((a) => {
                  const paye = (paie.donnees ?? []).filter((p) => p.abonnement_id === a.id && p.devise === 'CDF').reduce((s, p) => s + p.montant, 0);
                  return (
                    <tr key={a.id}>
                      <td>{LIBELLE_FORMULE[a.formule]}</td>
                      <td>{fmtDate(a.debut)}</td>
                      <td>{fmtDate(a.fin)}</td>
                      <td className="m">{fmt(a.montant)}</td>
                      <td className="m">{paye >= a.montant ? fmt(paye) : <span className="text-danger">{fmt(paye)}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="m-0 text-text-dim text-[13px]">Missions de l'expert-comptable partenaire : facturées par lui directement.</p>
          </>
        )}

        {onglet === 'paiements' && (
          <>
            {admin && (
              <Carte titre="Enregistrer un paiement">
                <NouveauPaiement key={abos.donnees?.[0]?.id ?? 'aucun'} client={id} abonnements={abos.donnees ?? []} apres={toutRelire} />
              </Carte>
            )}
            <table className="grille">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="m">Montant</th>
                  <th>Moyen</th>
                  <th>Référence</th>
                </tr>
              </thead>
              <tbody>
                {(paie.donnees ?? []).map((p) => (
                  <tr key={p.id}>
                    <td>{fmtDate(p.date)}</td>
                    <td className="m">{p.devise === 'USD' ? `${(p.montant / 100).toFixed(2)} USD` : `${fmt(p.montant)} CDF`}</td>
                    <td>{MODE[p.mode]}</td>
                    <td>{p.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {onglet === 'suivi' && (
          <>
            <Carte titre="Noter un contact">
              <NouveauSuivi client={id} apres={suivis.relire} />
            </Carte>
            <table className="grille">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {(suivis.donnees ?? []).map((s) => (
                  <tr key={s.id}>
                    <td>{fmtDate(s.date)}</td>
                    <td>{SUIVI[s.type]}</td>
                    <td>{s.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {onglet === 'sms' && (
          <table className="grille">
            <thead>
              <tr>
                <th>Date</th>
                <th>Message</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {(sms.donnees ?? []).map((s) => (
                <tr key={s.id}>
                  <td>{fmtDate(s.prevu_le)}</td>
                  <td className="text-[13px]">{s.texte}</td>
                  <td>{s.statut === 'simule' ? 'test, non envoyé' : s.statut === 'envoye' ? 'envoyé' : s.statut === 'echec' ? 'échec' : 'à envoyer'}</td>
                </tr>
              ))}
              {sms.donnees?.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-text-dim">
                    Aucun SMS pour ce client.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {admin && onglet === 'fiche' && <FormClient depart={c} apres={() => client.relire()} />}
      </div>
    </Fenetre>
  );
}
