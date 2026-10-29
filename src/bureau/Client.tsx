/**
 * Écrans 2 et 3 : les contrôles d'un client, puis ses états SMT.
 * L'assistant consulte ; l'expert-comptable partenaire saisit le taux de clôture et arrête les états.
 */
import { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { annulerArrete, arreterEtats, definirTauxCloture, obstaclesArrete, resumeDossier } from '../donnees/bureau';
import { ErreurSaisie } from '../donnees/saisie';
import { calculerEtats } from '../moteur';
import { fmt, fmtDate, lireTaux } from '../ui/format';
import { dateRefDe, db, useBureau, useDossierBureau, useExercicesBureau } from './contexte';
import { telechargerExcel } from './excel';
import { mentionMethodeStock } from '../donnees/stock';
import { TablesEtats } from './TablesEtats';
import { Carte, Fenetre, Message, Pastille } from './ui';

const NIVEAU = { a_traiter: { libelle: 'À traiter', ton: 'danger' }, a_revoir: { libelle: 'À revoir', ton: 'avert' } } as const;

export function Client() {
  const { id, onglet } = useParams<{ id: string; onglet?: string }>();
  const [, aller] = useLocation();
  const { aujourdhui, role } = useBureau();
  const [annee, setAnnee] = useState<number | null>(null);
  const exercices = useExercicesBureau(id);
  const c = useDossierBureau(id, annee);
  const [taux, setTaux] = useState('');
  const [erreurs, setErreurs] = useState<string[]>([]);

  const vue = useMemo(() => {
    if (!c) return null;
    const ref = dateRefDe(c, aujourdhui);
    return { ref, resume: resumeDossier(c, aujourdhui), etats: calculerEtats(c.dossier, { auDate: ref }) };
  }, [c, aujourdhui]);

  if (c === undefined) return <p className="text-text-dim">Ouverture du dossier…</p>;
  if (!c || !vue) return <Message ton="avert">Client introuvable sur cet ordinateur.</Message>;

  const etats = onglet === 'etats';
  const arrete = c.exercice.statut === 'arrete';
  const obstacles = obstaclesArrete(c, aujourdhui);
  const dollars = c.dossier.comptes.some((x) => x.devise === 'USD');

  const agir = async (action: () => Promise<unknown>) => {
    try {
      await action();
      setErreurs([]);
    } catch (x) {
      setErreurs(x instanceof ErreurSaisie ? x.messages : [(x as Error).message]);
    }
  };

  return (
    <Fenetre titre={`${c.entreprise.nom} · exercice ${c.exercice.annee}`} droite={<span className="text-chrome-text-dim">situation au {fmtDate(vue.ref)}</span>}>
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/" className="text-sel">
          ← Clients
        </Link>
        {c.entreprise.demo && <Pastille ton="neutre">fictif</Pastille>}
        {exercices && exercices.length > 1 ? (
          <select className="champ" aria-label="Exercice" value={c.exercice.annee} onChange={(e) => setAnnee(Number(e.target.value))}>
            {exercices.map((x) => (
              <option key={x.id} value={x.annee}>
                Exercice {x.annee}
                {x.statut === 'arrete' ? ' (arrêté)' : ''}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-text-dim">Exercice {c.exercice.annee}</span>
        )}
      </div>

      <div className="flex border-b border-border" role="tablist">
        <button role="tab" aria-selected={!etats} className={`onglet ${!etats ? 'onglet-actif' : ''}`} onClick={() => aller(`/client/${id}`)}>
          Contrôles
        </button>
        <button role="tab" aria-selected={etats} className={`onglet ${etats ? 'onglet-actif' : ''}`} onClick={() => aller(`/client/${id}/etats`)}>
          États SMT
        </button>
      </div>

      {!etats && (
        <Carte titre="À vérifier">
          {vue.resume.anomalies.length === 0 && <Message ton="ok">Rien à signaler.</Message>}
          {vue.resume.anomalies.map((a) => {
            const n = NIVEAU[a.niveau as keyof typeof NIVEAU];
            return (
              <div key={a.code} className="flex items-start gap-3">
                {n && <Pastille ton={n.ton}>{n.libelle}</Pastille>}
                <span>{a.message}</span>
              </div>
            );
          })}
          <p className="m-0 text-text-dim">Correction par le commerçant, sur son téléphone.</p>
        </Carte>
      )}

      {etats && (
        <>
          <TablesEtats e={vue.etats} />
          <Carte titre="Arrêté par l'expert-comptable partenaire" droite={arrete ? <Pastille ton="ok">Arrêtés le {fmtDate(c.exercice.arreteLe ?? vue.ref)}</Pastille> : <Pastille ton="avert">Non arrêtés</Pastille>}>
            {role !== 'expert' && <p className="m-0 text-text-dim">Réservé à l'expert-comptable partenaire.</p>}
            {role === 'expert' && !arrete && (
              <>
                {dollars && (
                  <div className="flex items-end gap-2">
                    <label>
                      <span className="libelle">Taux USD au 31 décembre, en CDF pour 1 USD {c.exercice.tauxCloture ? `(actuel : ${fmt(c.exercice.tauxCloture)} CDF)` : ''}</span>
                      <input className="champ w-40 text-right" inputMode="decimal" value={taux} onChange={(e) => setTaux(e.target.value)} />
                    </label>
                    <button
                      className="btn btn-neutre"
                      onClick={() => {
                        const t = lireTaux(taux);
                        if (!t) return setErreurs(['Taux invalide.']);
                        void agir(() => definirTauxCloture(db, c.exercice.id, t)).then(() => setTaux(''));
                      }}
                    >
                      Enregistrer le taux
                    </button>
                  </div>
                )}
                {obstacles.map((o) => (
                  <Message key={o} ton="avert">
                    {o}
                  </Message>
                ))}
                <div>
                  <button className="btn btn-principal" disabled={obstacles.length > 0} onClick={() => void agir(() => arreterEtats(db, c, aujourdhui))}>
                    Arrêter les états {c.exercice.annee}
                  </button>
                </div>
              </>
            )}
            {role === 'expert' && arrete && (
              <div>
                <button className="btn btn-neutre" onClick={() => void agir(() => annulerArrete(db, c.exercice.id))}>
                  Annuler l'arrêté
                </button>
              </div>
            )}
            {erreurs.map((x) => (
              <Message key={x} ton="danger">
                {x}
              </Message>
            ))}
          </Carte>
          <hr className="filet-cloture text-text" />
          <div className="ecran-seul flex gap-2 flex-wrap">
            <button className="btn btn-neutre" onClick={() => window.print()}>
              Imprimer ou enregistrer en PDF
            </button>
            <button className="btn btn-neutre" onClick={() => void agir(async () => telechargerExcel(vue.etats, c.dossier, await mentionMethodeStock(db, c.entreprise.id)))}>
              Exporter en Excel
            </button>
          </div>
        </>
      )}
    </Fenetre>
  );
}
