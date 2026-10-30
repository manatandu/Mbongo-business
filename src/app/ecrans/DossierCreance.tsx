/**
 * Dossier d'une créance impayée, à imprimer ou à montrer : la facture, les paiements, le reste dû,
 * le délai pour agir, et une reconnaissance de dette à faire signer par le client.
 * Ce sont les éléments qu'exige une injonction de payer (AUPSRVE, art. 4). Le commerçant ou son avocat la dépose.
 */
import { useMemo } from 'react';
import { Link, useParams } from 'wouter';
import { dossierCreance } from '../../moteur';
import { useLangue } from '../../i18n';
import { fmtDate, fmtMontant } from '../../ui/format';
import { useDossier } from '../session';

export function DossierCreance() {
  const { chargement, dateRef, entreprise } = useDossier();
  const { t } = useLangue();
  const { id } = useParams<{ id: string }>();
  const x = useMemo(() => {
    try {
      return dossierCreance(chargement.dossier, id, dateRef);
    } catch {
      return null;
    }
  }, [chargement.dossier, id, dateRef]);

  if (!x) return <p className="aide">{t('dossier.introuvable')}</p>;
  const l = x.ligne;
  const d = l.devise;

  return (
    <>
      <div className="duo pas-imprime">
        <Link href="/clients" className="bouton discret">
          ← {t('commun.retour')}
        </Link>
        <button className="bouton" onClick={() => window.print()}>
          {t('dossier.imprimer')}
        </button>
      </div>

      <div className="doc">
        <h2>{t('dossier.titre')}</h2>
        <div className="doc-entete">
          <span>
            {t('dossier.creancier')} : <b>{entreprise.nom}</b>
          </span>
          <span>
            {t('dossier.situation')} : <b>{fmtDate(dateRef)}</b>
          </span>
          <span>{[entreprise.responsable, entreprise.commune, entreprise.telephone].filter(Boolean).join(' · ')}</span>
          <span>{entreprise.nif ? `NIF : ${entreprise.nif}` : ''}</span>
        </div>

        <h3>{t('dossier.client')}</h3>
        <div className="doc-entete">
          <span>
            <b>{l.nom}</b>
          </span>
          <span>{t(l.client === 'commercant' ? 'client.commercant' : 'client.particulier')}</span>
          <span>{l.adresse || t('dossier.sansAdresse')}</span>
        </div>

        <h3>{t('dossier.facture')}</h3>
        <div className="tableau">
          <table>
            <tbody>
              <tr>
                <td>{t('saisir.facture')}</td>
                <td className="d">{l.facture || t('tiers.sansNumero')}</td>
              </tr>
              <tr>
                <td>{t('dossier.dateVente')}</td>
                <td className="d">{fmtDate(l.date)}</td>
              </tr>
              <tr>
                <td>{t('dossier.montant')}</td>
                <td className="d num">{fmtMontant(l.montant, d)}</td>
              </tr>
              {(l.regleAvant ?? 0) > 0 && (
                <tr>
                  <td>{t('dossier.regleAvant')}</td>
                  <td className="d num">− {fmtMontant(l.regleAvant ?? 0, d)}</td>
                </tr>
              )}
              {x.paiements.map((p, i) => (
                <tr key={i}>
                  <td>
                    {t('dossier.paiement')} {fmtDate(p.date)} ({p.compte})
                  </td>
                  <td className="d num">{p.montant >= 0 ? `− ${fmtMontant(p.montant, d)}` : `+ ${fmtMontant(-p.montant, d)}`}</td>
                </tr>
              ))}
              <tr className="total">
                <td>{t('dossier.reste')}</td>
                <td className="d num">{fmtMontant(x.reste, d)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="aide">
          {l.client === 'commercant'
            ? t(dateRef < x.prescription ? (entreprise.secteur === 'services' ? 'dossier.delaiServices' : 'dossier.delaiCommercant') : 'dossier.delaiPasseCommercant', {
                date: fmtDate(x.prescription),
                jours: x.ageJours,
              })
            : t(dateRef < x.prescription ? 'dossier.delai' : 'dossier.delaiPasse', { date: fmtDate(x.prescription), jours: x.ageJours })}
        </p>

        <hr className="filet-cloture" />
        <h3>{t('dossier.reconnaissance')}</h3>
        <p>{t('dossier.reconnaissanceTexte', { nom: l.nom, montant: fmtMontant(x.reste, d), creancier: entreprise.nom, facture: l.facture || t('tiers.sansNumero'), date: fmtDate(l.date) })}</p>
        <p className="aide">{t('dossier.reconnaissanceAide')}</p>
        <div className="signatures">
          <span>{t('dossier.faitLe')}</span>
          <span>{t('dossier.signatureClient')}</span>
        </div>
        <p className="aide">{t('dossier.mention')}</p>
      </div>
    </>
  );
}
