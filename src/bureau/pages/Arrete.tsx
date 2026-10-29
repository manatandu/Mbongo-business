/**
 * Revue et arrêté des états par l'expert-comptable partenaire.
 * Conditions vérifiées, taux confirmés, instantané figé avec empreinte, exercice fermé à la saisie.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { useParams } from 'wouter';
import { arreterEtats, conditionsArrete, confirmerTaux, definirTauxCloture, rouvrirExercice, verifierArrete } from '../../donnees/bureau';
import { ErreurSaisie } from '../../donnees/saisie';
import { calculerEtats, centimesEnFrancs, MENTION_ETATS } from '../../moteur';
import { fmt, fmtDate, fmtMontant, lireTaux } from '../../ui/format';
import { Chargement, dateRefDe, db, Fenetre, Message, Pastille, useBureau, useDossierBureau } from '../contexte';
import { TablesEtats } from './Etats';

const EXPERT = 'Expert-comptable partenaire (fictif)';

export function Arrete() {
  const { id } = useParams<{ id: string }>();
  const { aujourdhui, role, annoncer } = useBureau();
  const c = useDossierBureau(id);
  const arretes = useLiveQuery(() => db.arretes.where('entrepriseId').equals(id).toArray(), [id]) ?? [];
  const [saisies, setSaisies] = useState<Record<string, string>>({});
  const [cloture, setCloture] = useState('');
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [integrite, setIntegrite] = useState<Record<string, boolean>>({});

  const vue = useMemo(() => {
    if (!c) return null;
    const usd = c.dossier.operations.filter((o) => o.devise === 'USD' && !o.annule && o.type !== 'transfert');
    return { conditions: conditionsArrete(c, aujourdhui), usd, etats: calculerEtats(c.dossier, { auDate: dateRefDe(c, aujourdhui) }) };
  }, [c, aujourdhui]);

  if (!c || !vue) return <Chargement etat={c} />;
  if (role !== 'expert') {
    return (
      <Fenetre titre="Revue et arrêté des états">
        <Message ton="avert">Écran réservé à l'expert-comptable partenaire : choisissez-le dans le menu Rôle.</Message>
      </Fenetre>
    );
  }
  const arrete = c.exercice.statut === 'arrete';
  const pret = vue.conditions.every((x) => x.ok);
  const confirmes = new Map(c.dossier.confirmationsTaux.map((x) => [x.operation, x.taux]));

  const agir = async (action: () => Promise<unknown>, ok: string) => {
    try {
      await action();
      setErreurs([]);
      annoncer(ok);
    } catch (x) {
      setErreurs(x instanceof ErreurSaisie ? x.messages : [(x as Error).message]);
    }
  };

  return (
    <Fenetre
      titre="Revue et arrêté des états"
      sousTitre={`${c.entreprise.nom} · exercice ${c.exercice.annee}`}
      aide="L'arrêté fige les états tels que vous les voyez, avec leur empreinte SHA-256 et la version du moteur. Le téléphone ne peut plus saisir sur l'exercice. Une réouverture exige un motif et reste tracée dans le journal des interventions."
    >
      <div className="grid grid-cols-[330px_minmax(0,1fr)] gap-3 items-start">
        <div className="encart">
          <div className="encart-titre">
            <span>Conditions de l'arrêté</span>
            {arrete ? <Pastille ton="ok">Arrêté</Pastille> : pret ? <Pastille ton="ok">Prêt</Pastille> : <Pastille ton="avert">Incomplet</Pastille>}
          </div>
          <table className="grille">
            <tbody>
              {vue.conditions.map((x) => (
                <tr key={x.libelle}>
                  <td className="w-6">{x.ok ? <span className="text-positive font-bold" aria-label="remplie">✓</span> : <span className="text-danger font-bold" aria-label="manquante">✗</span>}</td>
                  <td>{x.libelle}</td>
                  <td className="text-text-dim">{x.detail ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-2 flex flex-col gap-2 border-t border-border">
            <div className="flex items-end gap-2">
              <label className="flex-1">
                <span className="libelle">Taux de clôture du dollar (FC pour 1 $) {c.exercice.tauxCloture ? `· actuel ${fmt(c.exercice.tauxCloture)}` : ''}</span>
                <input className="champ w-full text-right font-mono" value={cloture} onChange={(e) => setCloture(e.target.value)} disabled={arrete} />
              </label>
              <button
                className="btn btn-neutre"
                disabled={arrete}
                onClick={() => {
                  const t = lireTaux(cloture);
                  if (!t) return setErreurs(['Taux de clôture invalide.']);
                  void agir(() => definirTauxCloture(db, c.exercice.id, t), 'Taux de clôture enregistré').then(() => setCloture(''));
                }}
              >
                Enregistrer
              </button>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-principal" disabled={arrete || !pret} onClick={() => void agir(() => arreterEtats(db, c.exercice.id, EXPERT, aujourdhui), `États ${c.exercice.annee} arrêtés`)}>
                Arrêter les états
              </button>
              <button
                className="btn btn-neutre"
                disabled={!arrete}
                onClick={() => {
                  const motif = window.prompt('Motif de la réouverture :') ?? '';
                  void agir(() => rouvrirExercice(db, c.exercice.id, motif), 'Exercice rouvert');
                }}
              >
                Rouvrir l'exercice
              </button>
            </div>
            {erreurs.map((x) => (
              <Message key={x} ton="danger">
                {x}
              </Message>
            ))}
          </div>
        </div>

        <div className="encart overflow-auto">
          <div className="encart-titre">
            <span>Opérations en dollars : taux à confirmer</span>
            <span className="font-normal text-text-dim">{vue.usd.filter((o) => !confirmes.has(o.id)).length} restante(s)</span>
          </div>
          <table className="grille">
            <thead>
              <tr>
                <th>Date</th>
                <th>Libellé</th>
                <th className="m">Montant</th>
                <th className="m">Taux saisi</th>
                <th className="m">Taux retenu</th>
                <th className="m">FC</th>
                <th className="pr-3" />
              </tr>
            </thead>
            <tbody>
              {vue.usd.map((o) => {
                const retenu = confirmes.get(o.id);
                return (
                  <tr key={o.id}>
                    <td className="font-mono whitespace-nowrap">{fmtDate(o.date)}</td>
                    <td className="min-w-[200px]">{o.libelle}</td>
                    <td className="m">{fmtMontant(o.montant, 'USD')}</td>
                    <td className="m">{o.taux ? fmt(o.taux) : ''}</td>
                    <td className="m">{retenu ? <Pastille ton="ok">{fmt(retenu)}</Pastille> : ''}</td>
                    <td className="m">{fmt(centimesEnFrancs(o.montant, retenu ?? o.taux ?? 0))}</td>
                    <td className="whitespace-nowrap pr-3">
                      {!retenu && !arrete && (
                        <span className="flex gap-1">
                          <input
                            className="champ h-[22px] w-16 text-right font-mono"
                            placeholder={o.taux ? String(o.taux) : ''}
                            value={saisies[o.id] ?? ''}
                            onChange={(e) => setSaisies({ ...saisies, [o.id]: e.target.value })}
                          />
                          <button
                            className="btn btn-neutre h-[22px] px-2 text-[11.5px]"
                            onClick={() => {
                              const t = lireTaux(saisies[o.id] || String(o.taux ?? ''));
                              if (!t) return setErreurs(['Taux invalide.']);
                              void agir(() => confirmerTaux(db, c.exercice.id, o.id, t), 'Taux confirmé');
                            }}
                          >
                            Confirmer
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {vue.usd.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-text-dim">
                    Aucune opération en dollars.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {arretes.length > 0 && (
        <div className="encart overflow-auto">
          <div className="encart-titre">Arrêtés enregistrés</div>
          <table className="grille">
            <thead>
              <tr>
                <th>Le</th>
                <th>Par</th>
                <th className="m">Opérations</th>
                <th>Moteur</th>
                <th>Empreinte SHA-256</th>
                <th>Intégrité</th>
              </tr>
            </thead>
            <tbody>
              {arretes.map((a) => (
                <tr key={a.id}>
                  <td className="font-mono whitespace-nowrap">{new Date(a.le).toLocaleString('fr-FR')}</td>
                  <td>{a.auteur}</td>
                  <td className="m">{a.nombreOperations}</td>
                  <td className="font-mono">{a.versionMoteur}</td>
                  <td className="font-mono text-[10.5px]">{a.empreinte}</td>
                  <td>
                    {integrite[a.id] === undefined ? (
                      <button className="btn btn-neutre h-[22px] px-2 text-[11.5px]" onClick={() => void verifierArrete(db, a.id).then((ok) => setIntegrite({ ...integrite, [a.id]: ok }))}>
                        Vérifier
                      </button>
                    ) : integrite[a.id] ? (
                      <Pastille ton="ok">Intact</Pastille>
                    ) : (
                      <Pastille ton="danger">Altéré</Pastille>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TablesEtats e={vue.etats} />
      <hr className="filet-cloture w-full text-text" />
      <p className="m-0 text-[12px] font-semibold text-center">{MENTION_ETATS}</p>
    </Fenetre>
  );
}
