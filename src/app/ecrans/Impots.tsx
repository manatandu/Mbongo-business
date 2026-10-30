/**
 * Mes impôts : le chiffre d'affaires, le régime qui lui correspond, les seuils, les échéances et les impôts payés.
 * L'estimation de l'impôt est repliée : le commerçant l'ouvre et la fait lui-même, sur ses chiffres, avec les taux
 * de la loi. Ce n'est ni une déclaration ni un avis : l'expert-comptable partenaire établit la déclaration
 * (loi n° 15/002, art. 43.6 à 43.8). Voir src/donnees/estimation.ts.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { Link } from 'wouter';
import { useLangue, type Cle } from '../../i18n';
import { activiteParDefaut, estimerImpots, type ActiviteFiscale, type ProfilFiscal } from '../../donnees/estimation';
import { situationImpots } from '../../donnees/impots';
import { ecrireReglage, lireReglage } from '../../donnees/reglages';
import { fmt, fmtDate, fmtMontant } from '../../ui/format';
import { Montant, Pastille } from '../composants';
import { db, useDossier } from '../session';
import { LigneEcheance } from './Echeances';

/** Estimation de l'IRPP : deux questions, puis le calcul, entouré de ses garde-fous. */
function Estimation({ regime, ca }: { regime: 'micro' | 'petite' | 'reel'; ca: number }) {
  const { chargement, aujourdhui, taux, entreprise } = useDossier();
  const { t } = useLangue();
  const cle = `profilFiscal:${entreprise.id}`;
  const defaut: ProfilFiscal = { activite: activiteParDefaut(entreprise.secteur), salaries: 0 };
  const profil = useLiveQuery(() => lireReglage<ProfilFiscal>(db, cle, defaut), [cle]) ?? defaut;
  const changer = (p: Partial<ProfilFiscal>) => void ecrireReglage(db, cle, { ...profil, ...p });
  const { exercice } = chargement;
  const e = estimerImpots({ regime, ca, annee: exercice.annee, debut: exercice.debut, fin: exercice.fin, date: aujourdhui, profil, taux });
  const cdf = (v: number | null | undefined, usd: number) => (v ? `${fmtMontant(v, 'CDF')} (${usd} USD)` : `${usd} USD`);

  return (
    <details className="replie">
      <summary>{t('estim.ouvrir')}</summary>
      <div className="replie-contenu">
        <p className="tampon">{t('estim.avertissement')}</p>

        <label className="champ">
          {t('estim.activite')}
          <select value={profil.activite} onChange={(x) => changer({ activite: x.target.value as ActiviteFiscale })}>
            <option value="vente">{t('estim.activite.vente')}</option>
            <option value="services">{t('estim.activite.services')}</option>
            <option value="vivrieres">{t('estim.activite.vivrieres')}</option>
          </select>
        </label>
        <label className="champ">
          {t('estim.salaries')}
          <input inputMode="numeric" value={String(profil.salaries)} onChange={(x) => changer({ salaries: Number(x.target.value.replace(/\D/g, '')) || 0 })} />
        </label>

        <h3 className="titre-section">{t('estim.irpp')}</h3>
        {e.irpp.cas === 'exonere' && <p>{t('estim.exonere')}</p>}
        {e.irpp.cas === 'reel' && <p>{t('estim.reel')}</p>}
        {e.irpp.cas === 'forfait' && (
          <div className="registre">
            <div>
              <span className="n">{t('estim.forfait')}</span>
              <span className="v num">{cdf(e.irpp.cdf, e.irpp.usd)}</span>
              <span />
            </div>
            <div>
              <span className="n">{t('estim.avantLe')}</span>
              <span className="v num">{fmtDate(e.irpp.date)}</span>
              <span />
            </div>
          </div>
        )}
        {e.irpp.cas === 'proportionnel' && (
          <div className="registre">
            <div>
              <span className="n">{t('estim.aCeJour', { taux: e.irpp.taux * 100, ca: fmt(e.irpp.ca) })}</span>
              <span className="v num">{fmtMontant(e.irpp.montant, 'CDF')}</span>
              <span />
            </div>
            {e.irpp.projection !== null && (
              <div>
                <span className="n">{t('estim.projection', { ca: fmt(e.irpp.projectionCa ?? 0) })}</span>
                <span className="v num">{fmtMontant(e.irpp.projection, 'CDF')}</span>
                <span />
              </div>
            )}
            {e.irpp.quotites.map((q) => (
              <div key={q.date}>
                <span className="n">{t('estim.quotite', { part: q.part * 100, date: fmtDate(q.date) })}</span>
                <span className="v num">{fmtMontant(q.montant, 'CDF')}</span>
                <span />
              </div>
            ))}
          </div>
        )}

        {e.salaries.cas !== 'aucun' && <h3 className="titre-section">{t('estim.salariesTitre')}</h3>}
        {e.salaries.cas === 'forfait' && <p>{t('estim.salariesForfait', { n: e.salaries.nombre, an: cdf(e.salaries.cdfAn, e.salaries.usdAn ?? 0), trimestre: e.salaries.usdTrimestre ?? 0 })}</p>}
        {e.salaries.cas === 'bareme' && <p>{t('estim.salariesBareme')}</p>}

        {(e.irpp.cas === 'forfait' || e.salaries.cas === 'forfait') && <p className="aide">{taux ? t('estim.tauxDuJour', { taux: fmt(taux) }) : t('estim.sansTaux')}</p>}
        <p className="aide">{t('estim.garde')}</p>
      </div>
    </details>
  );
}

export function Impots() {
  const { chargement, aujourdhui, dateRef } = useDossier();
  const { t, mois } = useLangue();
  const s = useMemo(() => situationImpots(chargement.dossier, aujourdhui, chargement.caAnterieurs), [chargement.dossier, chargement.caAnterieurs, aujourdhui]);
  const annee = chargement.exercice.annee;

  return (
    <>
      <div className="hero">
        <div className="lbl">{t('impots.ca', { annee })}</div>
        <div className="big num">{fmtMontant(s.ca, 'CDF')}</div>
        <div className="sub">{t('accueil.au', { date: fmtDate(dateRef) })}</div>
      </div>

      <p>
        {t(`impots.regime.${s.regime}` as Cle)} <span className="aide">{t('impots.regimeAide')}</span>
      </p>
      {/* Loi n° 23/053, art. 113 : on monte tout de suite, on ne redescend qu'après deux exercices sous la limite. */}
      {s.maintenu && <p className="aide">{t('impots.maintenu', { annee })}</p>}
      {s.sansHistorique && <p className="aide">{t('impots.sansHistorique', { annee })}</p>}

      {s.historique.length > 1 && (
        <div className="registre">
          {s.historique.map((h) => (
            <div key={h.annee}>
              <span className="n">{h.enCours ? t('impots.anneeEnCours', { annee: h.annee }) : h.annee}</span>
              <span className="v num">{fmt(h.ca)}</span>
              <span />
            </div>
          ))}
        </div>
      )}

      <h2 className="titre-section">{t('impots.seuils')}</h2>
      <div className="barres">
        {s.seuils.map((x) => (
          <div className="barre" key={x.cle}>
            <span>{t(`impots.seuil.${x.cle}` as Cle)}</span>
            <span className="piste">
              <span
                className="rempli"
                style={{ display: 'block', width: `${Math.min(100, x.part * 100)}%`, background: x.cle === 'micro' ? undefined : x.part >= 1 ? 'var(--out)' : x.part >= 0.8 ? 'var(--or)' : undefined }}
              />
            </span>
            <span className="num">{fmt(x.montant)}</span>
          </div>
        ))}
      </div>
      {/* Passer 25 M CDF change seulement le régime. La TVA (OL n° 10/001, art. 14) et 300 M CDF demandent l'expert. */}
      {s.tva === 'depasse' && <p className="erreur">{t('impots.tvaDepasse')}</p>}
      {s.tva === 'gardee' && <p className="erreur">{t('impots.tvaGardee', { annee: s.tvaAnnee ?? '' })}</p>}
      {s.tva === 'non' && s.regime !== 'reel' && s.seuils.some((x) => x.cle !== 'micro' && x.part >= 0.8) && <p className="aide">{t('impots.seuilProche')}</p>}

      <h2 className="titre-section">{t('impots.echeances')}</h2>
      <div className="liste">
        {s.echeances.slice(0, 3).map((e) => (
          <LigneEcheance key={`${e.date}-${e.cle}`} e={e} />
        ))}
        {s.echeances.length === 0 && <p className="aide">{t('impots.aucuneEcheance')}</p>}
      </div>

      <h2 className="titre-section">
        {t('impots.payes', { annee })} <small>{s.payes.length}</small>
      </h2>
      <div className="liste">
        {s.payes.map((p) => (
          <div className="ligne" key={p.id}>
            <div className="l">{p.libelle}</div>
            <Montant valeur={p.montant} devise={p.devise === 'USD' ? 'USD' : 'CDF'} />
            <div className="meta">
              <span>{fmtDate(p.date)}</span>
              {!p.piece && <Pastille ton="warn">{t('impots.sansQuittance')}</Pastille>}
            </div>
          </div>
        ))}
        {s.payes.length === 0 && <p className="aide">{t('impots.aucunPaye')}</p>}
      </div>
      <Link href="/saisir/impot" className="bouton discret pas-imprime">
        {t('impots.noter')}
      </Link>

      <h2 className="titre-section">{t('impots.parMois')}</h2>
      <div className="tableau">
        <table>
          <thead>
            <tr>
              <th>{t('impots.mois')}</th>
              <th className="d">CDF</th>
            </tr>
          </thead>
          <tbody>
            {s.parMois.map((m) => (
              <tr key={m.mois}>
                <td>{mois(Number(m.mois.slice(5, 7)))}</td>
                <td className="d num">{fmt(m.ca)}</td>
              </tr>
            ))}
            <tr className="total">
              <td>{t('impots.total')}</td>
              <td className="d num">{fmt(s.ca)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <button className="bouton discret pas-imprime" onClick={() => window.print()}>
        {t('impots.imprimer')}
      </button>

      <Estimation regime={s.regime} ca={s.ca} />

      <p className="aide">{t('impots.limite')}</p>
    </>
  );
}
