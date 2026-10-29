/** Journal de trésorerie mensuel, un par compte (modèle note 4). Toucher une ligne ouvre ses actions. */
import { useLiveQuery } from 'dexie-react-hooks';
import { Fragment, useMemo, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { COLONNES_DEPENSE, COLONNES_RECETTE, journalMensuel } from '../../moteur';
import { moisEntre } from '../../moteur/dates';
import { useLangue, type Cle } from '../../i18n';
import { ajouterPhoto, annulerOperation, ErreurSaisie } from '../../donnees/saisie';
import { fmtJourMois, fmtNu } from '../../ui/format';
import { Erreurs, Pastille } from '../composants';
import { compresserPhoto } from '../photo';
import { db, useDossier } from '../session';

export function Journal() {
  const { chargement, dateRef, annoncer, entreprise } = useDossier();
  const { t, mois: nomMois } = useLangue();
  const params = useParams<{ compte?: string; mois?: string }>();
  const [, aller] = useLocation();
  const { dossier, comptes, exercice } = chargement;
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [erreurs, setErreurs] = useState<string[]>([]);

  const compteId = comptes.some((c) => c.id === params.compte) ? (params.compte as string) : (comptes[0]?.id ?? '');
  const tousMois = moisEntre(exercice.debut.slice(0, 7), dateRef.slice(0, 7));
  const mois = params.mois && tousMois.includes(params.mois) ? params.mois : (tousMois[tousMois.length - 1] ?? exercice.debut.slice(0, 7));

  const journal = useMemo(() => journalMensuel(dossier, compteId, mois), [dossier, compteId, mois]);
  const annulees = useMemo(() => new Set(dossier.operations.filter((o) => o.annule).map((o) => o.annule)), [dossier]);
  const photos = useLiveQuery(() => db.pieces.where('entrepriseId').equals(entreprise.id).toArray(), [entreprise.id]) ?? [];
  const photoDe = (id: string) => photos.find((p) => p.operationId === id);

  const choisir = (c: string, m: string) => {
    setOuverte(null);
    aller(`/journal/${c}/${m}`, { replace: true });
  };

  async function annuler(id: string) {
    if (!window.confirm(t('journal.confirmerAnnulation'))) return;
    try {
      await annulerOperation(db, exercice.id, id, dateRef);
      setOuverte(null);
      setErreurs([]);
      annoncer(t('journal.annuleOk'));
    } catch (x) {
      setErreurs(x instanceof ErreurSaisie ? x.messages : [(x as Error).message]);
    }
  }

  async function photo(id: string, fichier: File | undefined) {
    if (!fichier) return;
    let donnees: Blob = fichier;
    try {
      donnees = await compresserPhoto(fichier);
    } catch {
      // On garde la photo telle quelle.
    }
    await ajouterPhoto(db, entreprise.id, id, donnees);
    annoncer(t('journal.photoOk'));
  }

  const voir = (id: string) => {
    const p = photoDe(id);
    if (p) window.open(URL.createObjectURL(p.donnees), '_blank');
  };

  const d = journal.devise;
  const ventilation = [
    ...COLONNES_RECETTE.map((k) => ({ cle: `vent.${k}` as Cle, v: journal.ventilation.recettes[k], sens: 'in' })),
    ...COLONNES_DEPENSE.map((k) => ({ cle: `vent.${k}` as Cle, v: journal.ventilation.depenses[k], sens: 'out' })),
  ].filter((x) => x.v !== 0);

  return (
    <>
      <div className="filtres" role="group" aria-label={t('saisir.compte')}>
        {comptes.map((c) => (
          <button key={c.id} className="puce" aria-pressed={c.id === compteId} onClick={() => choisir(c.id, mois)}>
            {c.libelle}
          </button>
        ))}
      </div>
      <label className="champ">
        {t('journal.mois')}
        <select value={mois} onChange={(e) => choisir(compteId, e.target.value)}>
          {[...tousMois].reverse().map((m) => (
            <option key={m} value={m}>
              {nomMois(Number(m.slice(5, 7)))} {m.slice(0, 4)}
            </option>
          ))}
        </select>
      </label>

      <div className="doc">
        <h2>
          {t('journal.titre')} · {journal.compte.libelle}
        </h2>
        <div className="doc-entete">
          <span>
            {t('journal.mois')} <b>{nomMois(Number(mois.slice(5, 7)))} {mois.slice(0, 4)}</b>
          </span>
          <span>{t('journal.montantsEn', { devise: d === 'USD' ? '$ US' : 'FC' })}</span>
        </div>
        <Erreurs messages={erreurs} />
        <div className="tableau">
          <table className="journal">
            <thead>
              <tr>
                <th>
                  {t('journal.date')} · {t('journal.libelle')}
                </th>
                <th className="d">{t('journal.recettes')}</th>
                <th className="d">{t('journal.depenses')}</th>
                <th className="d">{t('journal.solde')}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="sous">
                <td>{t('journal.report')}</td>
                <td />
                <td />
                <td className="d num">{fmtNu(journal.reportANouveau, d)}</td>
              </tr>
              {journal.lignes.map((l) => {
                const estAnnulee = annulees.has(l.operation);
                const op = dossier.operations.find((o) => o.id === l.operation);
                const annulable = !l.annulation && !estAnnulee && op?.nature !== 'cession_materiel';
                return (
                  <Fragment key={`${l.operation}-${l.recette}-${l.depense}`}>
                    <tr className={`cliquable ${estAnnulee ? 'annulee' : ''}`} onClick={() => setOuverte(ouverte === l.operation ? null : l.operation)} aria-expanded={ouverte === l.operation}>
                      <td className="libelle-journal">
                        <span className="num date-journal">{fmtJourMois(l.date)}</span>
                        {l.libelle} {!l.piece && <Pastille ton="warn">{t('journal.sansPiece')}</Pastille>} {l.annulation && <Pastille ton="info">{t('journal.annulation')}</Pastille>}
                        {estAnnulee && <Pastille ton="info">{t('journal.annulee')}</Pastille>}
                      </td>
                      <td className="d num amt-in">{l.recette ? fmtNu(l.recette, d) : ''}</td>
                      <td className="d num amt-out">{l.depense ? fmtNu(l.depense, d) : ''}</td>
                      <td className="d num">{fmtNu(l.solde, d)}</td>
                    </tr>
                    {ouverte === l.operation && (
                      <tr>
                        <td colSpan={4}>
                          <div className="filtres pas-imprime">
                            {annulable && (
                              <button className="bouton danger petit" onClick={() => void annuler(l.operation)}>
                                {t('journal.annuler')}
                              </button>
                            )}
                            {photoDe(l.operation) ? (
                              <button className="bouton discret petit" onClick={() => voir(l.operation)}>
                                {t('journal.voirPhoto')}
                              </button>
                            ) : (
                              <label className="photo-champ">
                                <input type="file" accept="image/*" capture="environment" onChange={(e) => void photo(l.operation, e.target.files?.[0])} />
                                <span className="bouton discret petit">{t('journal.ajouterPhoto')}</span>
                              </label>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {journal.lignes.length === 0 && (
                <tr>
                  <td colSpan={4} className="aide">
                    {t('journal.vide')}
                  </td>
                </tr>
              )}
              <tr className="total">
                <td>{t('journal.aReporter')}</td>
                <td className="d num">{fmtNu(journal.totalRecettes, d)}</td>
                <td className="d num">{fmtNu(journal.totalDepenses, d)}</td>
                <td className="d num">{fmtNu(journal.soldeAReporter, d)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {ventilation.length > 0 && (
          <>
            <h3>{t('journal.ventilation')}</h3>
            <div className="tableau">
              <table>
                <tbody>
                  {ventilation.map((x) => (
                    <tr key={`${x.sens}-${x.cle}`}>
                      <td>
                        {x.sens === 'in' ? t('journal.recettes') : t('journal.depenses')} · {t(x.cle)}
                      </td>
                      <td className={`d num ${x.sens === 'in' ? 'amt-in' : 'amt-out'}`}>{fmtNu(x.v, d)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <p className="aide">{t('journal.aide')}</p>
    </>
  );
}
