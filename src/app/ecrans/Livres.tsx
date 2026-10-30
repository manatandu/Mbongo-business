/**
 * Livre des recettes et des dépenses, mois par mois ; registre des achats de l'année, récapitulé par mois.
 * Tirés des saisies : rien de plus à noter.
 */
import { useMemo, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { livreRecettesDepenses, registreAchats } from '../../moteur';
import { moisEntre } from '../../moteur/dates';
import { useLangue } from '../../i18n';
import { fmt, fmtDate } from '../../ui/format';
import { Montant, Pastille } from '../composants';
import { enregistrerRccm } from '../../donnees/entreprise';
import { db, useDossier } from '../session';

export function Livre() {
  const { chargement, dateRef, entreprise, annoncer } = useDossier();
  const { t, mois: nomMois } = useLangue();
  const [rccm, setRccm] = useState(entreprise.rccm ?? '');
  const params = useParams<{ mois?: string }>();
  const [, aller] = useLocation();
  const { dossier, exercice } = chargement;
  const tousMois = moisEntre(exercice.debut.slice(0, 7), dateRef.slice(0, 7));
  const mois = params.mois && tousMois.includes(params.mois) ? params.mois : (tousMois[tousMois.length - 1] ?? exercice.debut.slice(0, 7));
  const livre = useMemo(() => livreRecettesDepenses(dossier, `${mois}-01`, `${mois}-31`), [dossier, mois]);

  return (
    <>
      <label className="champ">
        {t('journal.mois')}
        <select value={mois} onChange={(e) => aller(`/livre/${e.target.value}`, { replace: true })}>
          {[...tousMois].reverse().map((m) => (
            <option key={m} value={m}>
              {nomMois(Number(m.slice(5, 7)))} {m.slice(0, 4)}
            </option>
          ))}
        </select>
      </label>
      <div className="kpis">
        <div className="kpi">
          <div className="n">{t('livre.especes')}</div>
          <div className="v amt-in">{fmt(livre.ressourcesEspeces)}</div>
        </div>
        <div className="kpi">
          <div className="n">{t('livre.autres')}</div>
          <div className="v amt-in">{fmt(livre.ressourcesAutres)}</div>
        </div>
        <div className="kpi">
          <div className="n">{t('livre.emplois')}</div>
          <div className="v amt-out">{fmt(livre.emplois)}</div>
        </div>
      </div>
      <div className="liste">
        {livre.lignes.map((l, i) => {
          const entree = (l.sens === 'ressource') === l.montant >= 0;
          return (
            <div className="ligne" key={`${l.operation}-${i}`}>
              <div className="l">{l.libelle}</div>
              <Montant valeur={Math.abs(l.montant)} devise={l.devise} signe={entree ? '+' : '−'} classe={entree ? 'amt-in' : 'amt-out'} />
              <div className="meta">
                <span>{fmtDate(l.date)}</span>
                <span>{l.compte}</span>
                <Pastille ton={l.mode === 'especes' ? 'ok' : 'info'}>{t(l.mode === 'especes' ? 'livre.modeEspeces' : 'livre.modeAutre')}</Pastille>
              </div>
            </div>
          );
        })}
        {livre.lignes.length === 0 && (
          <div className="ligne">
            <div className="l aide">{t('journal.vide')}</div>
          </div>
        )}
      </div>
      {/* AUDCG, art. 14 : les livres mentionnent le n° RCCM. Facultatif : beaucoup de petits commerçants n'en ont pas. */}
      {!entreprise.demo && (
        <div>
          <label className="champ">
            {t('livre.rccm')}
            <input value={rccm} onChange={(e) => setRccm(e.target.value)} onBlur={() => rccm.trim() !== (entreprise.rccm ?? '') && void enregistrerRccm(db, entreprise.id, rccm).then(() => annoncer(t('livre.rccmOk')))} />
          </label>
          <p className="aide">{t('livre.rccmAide')}</p>
        </div>
      )}
    </>
  );
}

export function RegistreAchats() {
  const { chargement } = useDossier();
  const { t, mois: nomMois } = useLangue();
  const registre = useMemo(() => registreAchats(chargement.dossier), [chargement.dossier]);

  return (
    <>
      <div className="hero">
        <div className="lbl">{t('achats.total')}</div>
        <div className="big">{fmt(registre.total)} CDF</div>
      </div>
      {registre.parMois.map(({ mois, total }) => (
        <section key={mois}>
          <h3 className="titre-section">
            {nomMois(Number(mois.slice(5, 7)))}
            <span>{fmt(total)} CDF</span>
          </h3>
          <div className="liste">
            {registre.lignes
              .filter((l) => l.date.startsWith(mois))
              .map((l, i) => (
                <div className="ligne" key={`${l.date}-${i}`}>
                  <div className="l">{l.libelle}</div>
                  <Montant valeur={Math.abs(l.montant)} devise={l.devise} signe={l.montant < 0 ? '+' : '−'} classe="amt-out" />
                  <div className="meta">
                    <span>{fmtDate(l.date)}</span>
                    <span>{l.mode === 'credit' ? t('achats.credit') : `${l.compte} · ${t(l.mode === 'especes' ? 'livre.modeEspeces' : 'livre.modeAutre')}`}</span>
                    {l.reference ? <span>{l.reference}</span> : l.reprise ? <Pastille ton="info">{t('achats.reprise')}</Pastille> : <Pastille ton="warn">{t('achats.sansReference')}</Pastille>}
                  </div>
                </div>
              ))}
          </div>
        </section>
      ))}
      {registre.lignes.length === 0 && <p className="aide">{t('achats.vide')}</p>}
    </>
  );
}
