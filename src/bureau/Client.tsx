/**
 * Écrans 2 et 3 : les contrôles d'un client, ses états SMT, ses journaux.
 * L'assistant consulte ; l'expert-comptable partenaire saisit le taux de clôture, revoit et fait arrêter les états,
 * active l'estimation de l'impôt et confirme le régime d'imposition.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import {
  annulerArrete,
  arreterEtats,
  bilanOuverture,
  definirTauxCloture,
  enregistrerIdentiteExpert,
  formuleArrete,
  lireIdentiteExpert,
  lireTraceArrete,
  limiteArrete,
  obstaclesArrete,
  resumeDossier,
  rouvrirInventaire,
  type IdentiteExpert,
} from '../donnees/bureau';
import { etatsPrecedents } from '../donnees/dossier';
import { activationEstimation, activerEstimation, confirmerRegime, regimeConfirme, retirerRegimeConfirme } from '../donnees/fiscal-expert';
import type { Regime } from '../donnees/regimes';
import { ErreurSaisie } from '../donnees/saisie';
import { mentionMethodeStock } from '../donnees/stock';
import { calculerEtats } from '../moteur';
import { fmt, fmtDate, lireTaux } from '../ui/format';
import { dateRefDe, db, useBureau, useDossierBureau, useExercicesBureau } from './contexte';
import type { Mentions } from './entete';
import { telechargerExcel } from './excel';
import { Journaux } from './Journaux';
import { TablesEtats } from './TablesEtats';
import { Carte, Fenetre, Message, Pastille } from './ui';

const NIVEAU = { a_traiter: { libelle: 'À traiter', ton: 'danger' }, a_revoir: { libelle: 'À revoir', ton: 'avert' } } as const;
const REGIMES: Record<Regime, string> = { micro: 'Micro-entreprise', petite: 'Petite entreprise', reel: 'Régime réel' };

export function Client() {
  const { id, onglet } = useParams<{ id: string; onglet?: string }>();
  const [, aller] = useLocation();
  const { aujourdhui, role } = useBureau();
  const [annee, setAnnee] = useState<number | null>(null);
  const exercices = useExercicesBureau(id);
  const c = useDossierBureau(id, annee);
  const [taux, setTaux] = useState('');
  const [nomExpert, setNomExpert] = useState('');
  const [onecExpert, setOnecExpert] = useState('');
  const [modifierExpert, setModifierExpert] = useState(false);
  const [regimeChoisi, setRegimeChoisi] = useState<Regime>('micro');
  const [tvaChoisie, setTvaChoisie] = useState(false);
  const [erreurs, setErreurs] = useState<string[]>([]);

  const vue = useMemo(() => {
    if (!c) return null;
    const ref = dateRefDe(c, aujourdhui);
    return { ref, resume: resumeDossier(c, aujourdhui), etats: calculerEtats(c.dossier, { auDate: ref }) };
  }, [c, aujourdhui]);

  const exId = c?.exercice.id;
  const entId = c?.entreprise.id;
  const precedent = useLiveQuery(() => (exId ? etatsPrecedents(db, exId) : Promise.resolve(null)), [exId]);
  const methodeStock = useLiveQuery(() => (entId ? mentionMethodeStock(db, entId) : Promise.resolve('')), [entId]);
  const identite = useLiveQuery(() => lireIdentiteExpert(db), []);
  const trace = useLiveQuery(() => (exId ? lireTraceArrete(db, exId) : Promise.resolve(null)), [exId, c?.exercice.statut]);
  const estimation = useLiveQuery(() => (entId ? activationEstimation(db, entId) : Promise.resolve(null)), [entId]);
  const regime = useLiveQuery(() => (entId && c ? regimeConfirme(db, entId, c.exercice.annee) : Promise.resolve(null)), [entId, c?.exercice.annee]);

  if (c === undefined) return <p className="text-text-dim">Ouverture du dossier…</p>;
  if (!c || !vue) return <Message ton="avert">Client introuvable sur cet ordinateur.</Message>;

  const vueOnglet = onglet === 'etats' ? 'etats' : onglet === 'journaux' ? 'journaux' : 'controles';
  const arrete = c.exercice.statut === 'arrete';
  const obstacles = obstaclesArrete(c, aujourdhui);
  const dollars = c.dossier.comptes.some((x) => x.devise === 'USD');
  const ouverture = precedent === null ? bilanOuverture(c.dossier, vue.etats) : null;
  const expertArrete = trace?.arrete?.expert ?? null;
  const mentions: Mentions = { arreteLe: arrete ? (c.exercice.arreteLe ?? null) : null, expert: expertArrete, editeLe: aujourdhui, fictif: Boolean(c.entreprise.demo) };
  // L'expert tel qu'il est enregistré, ou tel qu'il vient de le taper.
  const saisi: IdentiteExpert | null = nomExpert.trim() && onecExpert.trim() ? { nom: nomExpert.trim(), onec: onecExpert.trim() } : null;
  const expert: IdentiteExpert | null = modifierExpert ? saisi : (identite ?? saisi);
  const demanderExpert = !identite || modifierExpert;

  const agir = async (action: () => Promise<unknown>) => {
    try {
      await action();
      setErreurs([]);
    } catch (x) {
      setErreurs(x instanceof ErreurSaisie ? x.messages : [(x as Error).message]);
    }
  };
  /** Garde l'identité de l'expert la première fois qu'il la tape. */
  const avecExpert = async (action: (x: IdentiteExpert) => Promise<unknown>) =>
    agir(async () => {
      if (!expert) throw new ErreurSaisie(["Indiquez d'abord le nom de l'expert-comptable partenaire et son n° d'inscription à l'ONEC."]);
      if (demanderExpert) {
        await enregistrerIdentiteExpert(db, expert);
        setModifierExpert(false);
      }
      await action(expert);
    });

  const onglets = [
    ['controles', 'Contrôles', `/client/${id}`],
    ['etats', 'États SMT', `/client/${id}/etats`],
    ['journaux', 'Journaux', `/client/${id}/journaux`],
  ] as const;

  return (
    <Fenetre
      titre={`${c.entreprise.nom} · exercice ${c.exercice.annee}`}
      classe={vueOnglet === 'journaux' ? 'journal-paysage' : undefined}
      droite={<span className="text-chrome-text-dim">situation au {fmtDate(vue.ref)}</span>}>
      <div className="flex items-center gap-3 flex-wrap ecran-seul">
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

      <div className="segment" role="tablist">
        {onglets.map(([cle, libelle, lien]) => (
          <button key={cle} role="tab" aria-selected={vueOnglet === cle} className={`onglet ${vueOnglet === cle ? 'onglet-actif' : ''}`} onClick={() => aller(lien)}>
            {libelle}
          </button>
        ))}
      </div>

      {vueOnglet === 'controles' && (
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

      {vueOnglet === 'journaux' && (
        <>
          <Journaux key={c.exercice.id} d={c.dossier} e={vue.etats} date={vue.ref} mentions={mentions} />
          <div className="ecran-seul flex gap-2 flex-wrap">
            <button className="btn btn-neutre" onClick={() => window.print()}>
              Imprimer ou enregistrer en PDF
            </button>
          </div>
        </>
      )}

      {vueOnglet === 'etats' && (
        <>
          <TablesEtats e={vue.etats} precedent={precedent ?? null} ouverture={ouverture} dossier={c.dossier} methodeStock={methodeStock} mentions={mentions} />
          <Carte
            titre="Arrêté des états"
            droite={
              arrete ? (
                <Pastille ton="ok">Arrêtés le {fmtDate(c.exercice.arreteLe ?? vue.ref)}</Pastille>
              ) : (
                <Pastille ton={aujourdhui > limiteArrete(c.exercice.annee) ? 'danger' : 'avert'}>Non arrêtés · à arrêter avant le {fmtDate(limiteArrete(c.exercice.annee))}</Pastille>
              )
            }
          >
            {arrete && <p className="m-0 font-semibold">{formuleArrete(c.exercice.arreteLe ?? vue.ref, expertArrete)}.</p>}
            {!arrete && <p className="m-0 text-text-dim">Les états sont arrêtés par le responsable de l'entité, après revue de l'expert-comptable partenaire, qui seul peut cliquer sur le bouton.</p>}
            {(trace?.annules ?? []).map((x, i) => (
              <p key={i} className="m-0 text-text-dim">
                Arrêté du {fmtDate(x.arreteLe)} annulé le {fmtDate(x.annuleLe)}
                {x.expert ? ` (${x.expert.nom})` : ''}.
              </p>
            ))}
            {role !== 'expert' && <p className="m-0 text-text-dim ecran-seul">Réservé à l'expert-comptable partenaire.</p>}

            {role === 'expert' && (
              <div className="ecran-seul flex flex-col gap-3">
                {demanderExpert ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <label>
                      <span className="libelle">Nom de l'expert-comptable</span>
                      <input className="champ w-64" value={nomExpert} onChange={(e) => setNomExpert(e.target.value)} />
                    </label>
                    <label>
                      <span className="libelle">N° d'inscription ONEC</span>
                      <input className="champ w-40" value={onecExpert} onChange={(e) => setOnecExpert(e.target.value)} />
                    </label>
                    <span className="text-text-dim text-[13px] pb-2">Demandé une fois, puis gardé sur cet ordinateur.</span>
                  </div>
                ) : (
                  <p className="m-0">
                    Expert-comptable partenaire : <b>{identite?.nom}</b>, n° d'inscription ONEC <b>{identite?.onec}</b>.{' '}
                    <button
                      className="btn btn-neutre"
                      onClick={() => {
                        setNomExpert(identite?.nom ?? '');
                        setOnecExpert(identite?.onec ?? '');
                        setModifierExpert(true);
                      }}
                    >
                      Modifier
                    </button>
                  </p>
                )}

                {!arrete && (
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
                    <div className="flex flex-wrap gap-2">
                      <button className="btn btn-principal" disabled={obstacles.length > 0 || !expert} onClick={() => void avecExpert((x) => arreterEtats(db, c, aujourdhui, x))}>
                        Arrêter les états {c.exercice.annee}
                      </button>
                      {c.exercice.stockFinal !== null && (
                        <button className="btn btn-neutre" onClick={() => window.confirm("Rouvrir l'inventaire ? Le commerçant pourra le corriger puis le valider à nouveau.") && void agir(() => rouvrirInventaire(db, c.exercice.id))}>
                          Rouvrir l'inventaire
                        </button>
                      )}
                    </div>
                  </>
                )}
                {arrete && (
                  <div>
                    <button className="btn btn-neutre" onClick={() => window.confirm("Annuler l'arrêté ? Le commerçant pourra de nouveau saisir sur cet exercice. L'arrêté annulé reste noté.") && void agir(() => annulerArrete(db, c.exercice.id, aujourdhui))}>
                      Annuler l'arrêté
                    </button>
                  </div>
                )}

                <div className="reserve-expert">
                  <h3>Estimation de l'impôt sur le téléphone du commerçant</h3>
                  <p className="m-0 text-text-dim text-[13px]">Activée par l'expert-comptable inscrit, sous sa responsabilité (loi n° 15/002, art. 43). Désactivée par défaut.</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {estimation?.active ? (
                      <Pastille ton="ok">
                        Activée le {fmtDate(estimation.le)} par {estimation.expert}
                      </Pastille>
                    ) : (
                      <Pastille ton="neutre">{estimation ? `Désactivée le ${fmtDate(estimation.le)}` : 'Désactivée'}</Pastille>
                    )}
                    <button className="btn btn-neutre" disabled={!expert} onClick={() => void avecExpert((x) => activerEstimation(db, c.entreprise.id, !estimation?.active, x.nom, aujourdhui))}>
                      {estimation?.active ? "Désactiver l'estimation" : "Activer l'estimation"}
                    </button>
                  </div>
                </div>

                <div className="reserve-expert">
                  <h3>Régime d'imposition confirmé pour {c.exercice.annee}</h3>
                  {regime ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Pastille ton="ok">
                        {REGIMES[regime.regime]} · TVA {regime.tva ? 'oui' : 'non'} · confirmé le {fmtDate(regime.le)} par {regime.expert}
                      </Pastille>
                      <button className="btn btn-neutre" onClick={() => void agir(() => retirerRegimeConfirme(db, c.entreprise.id, c.exercice.annee))}>
                        Retirer la confirmation
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-end gap-2">
                      <label>
                        <span className="libelle">Régime</span>
                        <select className="champ" aria-label="Régime" value={regimeChoisi} onChange={(e) => setRegimeChoisi(e.target.value as Regime)}>
                          {(Object.keys(REGIMES) as Regime[]).map((r) => (
                            <option key={r} value={r}>
                              {REGIMES[r]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center gap-2 pb-2">
                        <input type="checkbox" checked={tvaChoisie} onChange={(e) => setTvaChoisie(e.target.checked)} />
                        <span>Assujetti à la TVA</span>
                      </label>
                      <button
                        className="btn btn-neutre"
                        disabled={!expert}
                        onClick={() => void avecExpert((x) => confirmerRegime(db, c.entreprise.id, { annee: c.exercice.annee, regime: regimeChoisi, tva: tvaChoisie, expert: x.nom, le: aujourdhui }))}
                      >
                        Confirmer le régime
                      </button>
                    </div>
                  )}
                  <p className="m-0 text-text-dim text-[13px]">Sans confirmation, l'appli du commerçant déduit le régime de ses chiffres.</p>
                </div>
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
            <button className="btn btn-neutre" onClick={() => void agir(async () => telechargerExcel(vue.etats, c.dossier, methodeStock ?? (await mentionMethodeStock(db, c.entreprise.id)), precedent ?? null, { ...mentions, ouverture }))}>
              Exporter en Excel
            </button>
          </div>
        </>
      )}
    </Fenetre>
  );
}
