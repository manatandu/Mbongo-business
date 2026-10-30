/**
 * Mes impôts : le chiffre d'affaires, le régime qui lui correspond, les seuils, les échéances et les impôts payés.
 * Aucun montant d'impôt à payer : le calcul et la déclaration sont faits par l'expert-comptable partenaire.
 */
import { useMemo } from 'react';
import { Link } from 'wouter';
import { useLangue, type Cle } from '../../i18n';
import { situationImpots } from '../../donnees/impots';
import { fmt, fmtDate, fmtMontant } from '../../ui/format';
import { Montant, Pastille } from '../composants';
import { useDossier } from '../session';
import { LigneEcheance } from './Echeances';

export function Impots() {
  const { chargement, aujourdhui, dateRef } = useDossier();
  const { t, mois } = useLangue();
  const s = useMemo(() => situationImpots(chargement.dossier, aujourdhui), [chargement.dossier, aujourdhui]);
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
      {/* Passer le seuil de la micro-entreprise change seulement le régime ; la TVA et 300 M CDF demandent l'expert. */}
      {s.seuils.some((x) => x.cle !== 'micro' && x.part >= 1) ? (
        <p className="erreur">{t('impots.seuilDepasse')}</p>
      ) : (
        s.seuils.some((x) => x.part >= 0.8 && x.part < 1) && <p className="aide">{t('impots.seuilProche')}</p>
      )}

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

      <p className="aide">{t('impots.limite')}</p>
    </>
  );
}
