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
import { IconPrint } from '../chrome/icons';
import { useRibbon } from '../chrome/ribbon-context';
import { Chargement, dateRefDe, db, Page, Pastille, useBureau, useDossierBureau } from '../contexte';
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
  useRibbon([{ titre: 'SORTIE', boutons: [{ label: 'Imprimer', Icon: IconPrint, onClick: () => window.print() }] }]);

  const vue = useMemo(() => {
    if (!c) return null;
    const usd = c.dossier.operations.filter((o) => o.devise === 'USD' && !o.annule && o.type !== 'transfert');
    return { conditions: conditionsArrete(c, aujourdhui), usd, etats: calculerEtats(c.dossier, { auDate: dateRefDe(c, aujourdhui) }) };
  }, [c, aujourdhui]);

  if (!c || !vue) return <Chargement etat={c} />;
  if (role !== 'expert') {
    return (
      <Page titre="Revue et arrêté des états">
        <p className="m-0 text-[12px]">Écran réservé à l'expert-comptable partenaire (menu Affichage, rôle Expert-comptable).</p>
      </Page>
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
    <Page titre="Revue et arrêté des états" sousTitre={`${c.entreprise.nom} · exercice ${c.exercice.annee}`}>
      <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)] gap-2.5 items-start">
        <div className="panneau">
          <div className="panneau-titre">
            <span>Conditions de l'arrêté</span>
            {arrete ? <Pastille ton="ok">ARRÊTÉ</Pastille> : pret ? <Pastille ton="ok">PRÊT</Pastille> : <Pastille ton="avert">INCOMPLET</Pastille>}
          </div>
          <table className="grille">
            <tbody>
              {vue.conditions.map((x) => (
                <tr key={x.libelle}>
                  <td className="w-6">{x.ok ? <span className="text-positive font-bold">✓</span> : <span className="text-danger font-bold">✗</span>}</td>
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
                className="bouton"
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
              <button className="bouton-principal" disabled={arrete || !pret} onClick={() => void agir(() => arreterEtats(db, c.exercice.id, EXPERT, aujourdhui), `États ${c.exercice.annee} arrêtés`)}>
                Arrêter les états
              </button>
              <button
                className="bouton"
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
              <p key={x} className="m-0 text-[12px] text-danger">
                {x}
              </p>
            ))}
          </div>
        </div>

        <div className="panneau overflow-auto">
          <div className="panneau-titre">
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
                            className="bouton h-[22px] px-1.5 text-[11px]"
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
        <div className="panneau overflow-auto">
          <div className="panneau-titre">Arrêtés enregistrés</div>
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
                      <button className="bouton h-[20px] px-1.5 text-[11px]" onClick={() => void verifierArrete(db, a.id).then((ok) => setIntegrite({ ...integrite, [a.id]: ok }))}>
                        Vérifier
                      </button>
                    ) : integrite[a.id] ? (
                      <Pastille ton="ok">INTACT</Pastille>
                    ) : (
                      <Pastille ton="danger">ALTÉRÉ</Pastille>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TablesEtats e={vue.etats} />
      <p className="m-0 text-[12px] font-semibold">{MENTION_ETATS}</p>
    </Page>
  );
}
