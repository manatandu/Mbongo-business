/** Journal de trésorerie mensuel, un par compte (modèle note 4). Toucher une ligne ouvre ses actions. */
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { journalMensuel } from '../../moteur';
import { moisEntre } from '../../moteur/dates';
import { useLangue } from '../../i18n';
import { ajouterPhoto, annulerOperation, ErreurSaisie } from '../../donnees/saisie';
import { fmtDate, fmtMontant } from '../../ui/format';
import { Erreurs, Pastille } from '../composants';
import { compresserPhoto } from '../photo';
import { db, useDossier } from '../session';

export function Journal() {
  const { chargement, dateRef, annoncer, entreprise, aujourdhui } = useDossier();
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
    // Année finie mais pas encore commencée la suivante : l'annulation tomberait le 31 décembre, pas aujourd'hui.
    if (aujourdhui > exercice.fin) return setErreurs([t('fin.saisir', { annee: exercice.annee, suivante: exercice.annee + 1 })]);
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

      <Erreurs messages={erreurs} />
      <div className="kpis" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="kpi">
          <div className="n">{t('journal.report')}</div>
          <div className="v">{fmtMontant(journal.reportANouveau, d)}</div>
        </div>
        <div className="kpi">
          <div className="n">{t('journal.aReporter')}</div>
          <div className={`v ${journal.soldeAReporter < 0 ? 'neg' : ''}`}>{fmtMontant(journal.soldeAReporter, d)}</div>
        </div>
      </div>
      <div className="liste">
        {journal.lignes.map((l) => {
          const estAnnulee = annulees.has(l.operation);
          const op = dossier.operations.find((o) => o.id === l.operation);
          const annulable = !l.annulation && !estAnnulee && op?.nature !== 'cession_materiel';
          const entree = l.recette - l.depense >= 0;
          const ouvert = ouverte === l.operation;
          return (
            <div key={`${l.operation}-${l.recette}-${l.depense}`} className={`ligne ${estAnnulee ? 'annulee' : ''}`}>
              <button type="button" className="ligne-bouton" aria-expanded={ouvert} onClick={() => setOuverte(ouvert ? null : l.operation)}>
                <span className="l">{l.libelle}</span>
                <span className={`num ${entree ? 'amt-in' : 'amt-out'}`}>
                  {entree ? '+' : '−'} {fmtMontant(Math.abs(l.recette - l.depense), d)}
                </span>
                <span className="meta">
                  <span>{fmtDate(l.date)}</span>
                  <span>
                    {t('journal.solde')} {fmtMontant(l.solde, d)}
                  </span>
                  {!l.piece && <Pastille ton="warn">{t('journal.sansPiece')}</Pastille>}
                  {l.annulation && <Pastille ton="info">{t('journal.annulation')}</Pastille>}
                  {estAnnulee && <Pastille ton="info">{t('journal.annulee')}</Pastille>}
                </span>
              </button>
              {ouvert && (
                <div className="actions">
                  {photoDe(l.operation) ? (
                    <button className="bouton discret" onClick={() => voir(l.operation)}>
                      {t('journal.voirPhoto')}
                    </button>
                  ) : (
                    <label className="photo-champ">
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => void photo(l.operation, e.target.files?.[0])} />
                      <span className="bouton discret">{t('journal.ajouterPhoto')}</span>
                    </label>
                  )}
                  {annulable && (
                    <button className="bouton danger" onClick={() => void annuler(l.operation)}>
                      {t('journal.annuler')}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {journal.lignes.length === 0 && (
          <div className="ligne">
            <div className="l aide">{t('journal.vide')}</div>
          </div>
        )}
      </div>
    </>
  );
}
