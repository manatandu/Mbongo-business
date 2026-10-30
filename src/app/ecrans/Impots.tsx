/**
 * Mes impôts : le chiffre d'affaires, le régime qui lui correspond, les seuils, les échéances et les impôts payés.
 * L'estimation de l'impôt n'apparaît que si l'expert-comptable partenaire l'a activée pour ce client, sous son nom
 * (loi n° 15/002, art. 43.6 et 43.7 ; décision du 30 octobre 2026 après l'audit juridique). Le commerçant l'ouvre et la
 * fait lui-même, sur ses chiffres, avec les taux de la loi. Voir src/donnees/estimation.ts et fiscal-expert.ts.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { Link } from 'wouter';
import { useLangue, type Cle } from '../../i18n';
import { contexteFiscal } from '../../donnees/dossier';
import { activiteParDefaut, estimerImpots, type ActiviteFiscale, type EstimationImpots, type ProfilFiscal } from '../../donnees/estimation';
import { activationEstimation } from '../../donnees/fiscal-expert';
import { situationImpots } from '../../donnees/impots';
import { regimeFiscal, type Regime } from '../../donnees/regimes';
import { ecrireReglage, lireReglage } from '../../donnees/reglages';
import { dernierTaux } from '../../donnees/saisie';
import { fmt, fmtDate, fmtMontant } from '../../ui/format';
import { Montant, Pastille } from '../composants';
import { db, useDossier } from '../session';
import { LigneEcheance } from './Echeances';

/** Le résultat d'une estimation, pour une année. */
function Resultat({ e }: { e: EstimationImpots }) {
  const { t } = useLangue();
  const cdf = (v: number | null | undefined, usd: number) => (v ? `${fmtMontant(v, 'CDF')} (${usd} USD)` : `${usd} USD`);
  return (
    <>
      {e.irpp.cas === 'exonerePossible' && <p>{t('estim.exonere')}</p>}
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
            <span className="n">{t(e.irpp.projection === null ? 'estim.annee' : 'estim.aCeJour', { taux: e.irpp.taux * 100, ca: fmt(e.irpp.ca) })}</span>
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
      {e.salaries.cas === 'forfait' && <p>{t('estim.salariesForfait', { n: e.salaries.nombre, an: cdf(e.salaries.cdfAn, e.salaries.usdAn ?? 0), trimestre: e.salaries.usdTrimestre ?? 0 })}</p>}
      {e.salaries.cas === 'bareme' && <p>{t('estim.salariesBareme')}</p>}
    </>
  );
}

/** Estimation de l'IRPP, si l'expert l'a activée : quelques questions, puis le calcul, entouré de ses garde-fous. */
function Estimation({ regime, ca }: { regime: Regime; ca: number }) {
  const { chargement, aujourdhui, entreprise } = useDossier();
  const { t } = useLangue();
  const activation = useLiveQuery(() => activationEstimation(db, entreprise.id), [entreprise.id]);
  const taux = useLiveQuery(() => dernierTaux(db, aujourdhui), [aujourdhui]);
  const cle = `profilFiscal:${entreprise.id}`;
  const defaut: ProfilFiscal = { activite: activiteParDefaut(entreprise.secteur), salaries: 0 };
  const profil = useLiveQuery(() => lireReglage<ProfilFiscal>(db, cle, defaut), [cle]) ?? defaut;
  if (!activation?.active) return null;
  const changer = (p: Partial<ProfilFiscal>) => void ecrireReglage(db, cle, { ...profil, ...p });
  const { exercice } = chargement;
  const valeurTaux = taux?.valeur ?? null;
  const e = estimerImpots({ regime, ca, annee: exercice.annee, debut: exercice.debut, fin: exercice.fin, date: aujourdhui, profil, taux: valeurTaux });

  // De janvier à avril, on paie l'impôt de l'année close : on l'estime aussi, sur son chiffre complet.
  const an1 = exercice.annee - 1;
  const ca1 = chargement.caAnterieurs.find((x) => x.annee === an1)?.ca;
  const regime1 = chargement.regimesConfirmes.find((c) => c.annee === an1)?.regime ?? (ca1 !== undefined ? regimeFiscal(chargement.caAnterieurs.filter((x) => x.annee <= an1)).regime : null);
  const e1 =
    aujourdhui <= `${exercice.annee}-04-30` && ca1 !== undefined && regime1
      ? estimerImpots({ regime: regime1, ca: ca1, annee: an1, debut: `${an1}-01-01`, fin: `${an1}-12-31`, date: `${an1}-12-31`, profil, taux: valeurTaux })
      : null;

  return (
    <details className="replie">
      <summary>{t('estim.ouvrir')}</summary>
      <div className="replie-contenu">
        <p className="tampon">{t('estim.avertissement', { expert: activation.expert })}</p>

        <label className="champ">
          {t('estim.activite')}
          <select value={profil.activite} onChange={(x) => changer({ activite: x.target.value as ActiviteFiscale })}>
            <option value="vente">{t('estim.activite.vente')}</option>
            <option value="services">{t('estim.activite.services')}</option>
            <option value="agricole">{t('estim.activite.agricole')}</option>
          </select>
        </label>
        {profil.activite === 'agricole' && (
          <>
            <label className="case">
              <input type="checkbox" checked={Boolean(profil.vivrieresSeules)} onChange={(x) => changer({ vivrieresSeules: x.target.checked })} />
              {t('estim.vivrieresSeules')}
            </label>
            <label className="case">
              <input type="checkbox" checked={Boolean(profil.moinsDe10ha)} onChange={(x) => changer({ moinsDe10ha: x.target.checked })} />
              {t('estim.moinsDe10ha')}
            </label>
          </>
        )}
        <label className="champ">
          {t('estim.salaries')}
          <input inputMode="numeric" value={String(profil.salaries)} onChange={(x) => changer({ salaries: Number(x.target.value.replace(/\D/g, '')) || 0 })} />
        </label>

        {e1 && (
          <>
            <h3 className="titre-section">{t('estim.anneeClose', { annee: an1 })}</h3>
            <Resultat e={e1} />
          </>
        )}
        <h3 className="titre-section">{t('estim.irpp', { annee: exercice.annee })}</h3>
        <Resultat e={e} />

        {(e.irpp.cas === 'forfait' || e.salaries.cas === 'forfait') && (
          <p className="aide">{taux ? t('estim.tauxDuJour', { taux: fmt(taux.valeur), date: fmtDate(taux.date) }) : t('estim.sansTaux')}</p>
        )}
        <p className="aide">{t('estim.garde')}</p>
      </div>
    </details>
  );
}

export function Impots() {
  const { chargement, aujourdhui, dateRef } = useDossier();
  const { t, mois } = useLangue();
  const s = useMemo(() => situationImpots(chargement.dossier, aujourdhui, contexteFiscal(chargement)), [chargement, aujourdhui]);
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
      {/* Passer 25 M CDF change seulement le régime. La TVA (OL n° 10/001, art. 14) et 300 M CDF demandent l'expert. */}
      {s.tva === 'depasse' && <p className="erreur">{t('impots.tvaDepasse')}</p>}
      {s.tva === 'gardee' && <p className="erreur">{t('impots.tvaGardee', { annee: s.tvaAnnee ?? '' })}</p>}
      {s.tva === 'non' && s.regime !== 'reel' && s.seuils.some((x) => x.cle !== 'micro' && x.part >= 0.8) && <p className="aide">{t('impots.seuilProche')}</p>}

      <h2 className="titre-section">{t('impots.echeances')}</h2>
      <div className="liste">
        {s.echeances.slice(0, 2).map((e) => (
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

      {/* Le détail sert surtout à l'expert-comptable : replié, et déplié à l'impression. */}
      <details className="replie">
        <summary>{t('impots.detail')}</summary>
        <div className="replie-contenu">
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

          <h3 className="titre-section">{t('impots.seuils')}</h3>
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

          <h3 className="titre-section">{t('impots.parMois')}</h3>
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
        </div>
      </details>

      <Estimation regime={s.regime} ca={s.ca} />

      <p className="aide">{t('impots.limite')}</p>
    </>
  );
}
