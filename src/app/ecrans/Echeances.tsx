/** Échéances fiscales et sociales des douze prochains mois. Des rappels : Mbongo ne calcule ni ne déclare. */
import { useMemo } from 'react';
import { echeances, profilEcheancier, type Echeance } from '../../donnees/echeancier';
import { useLangue, type Cle } from '../../i18n';
import { fmtDate } from '../../ui/format';
import { contexteFiscal } from '../../donnees/dossier';
import { useDossier } from '../session';

export function useEcheances(jours: number): Echeance[] {
  const { chargement, aujourdhui } = useDossier();
  return useMemo(() => echeances(aujourdhui, jours, profilEcheancier(chargement.dossier, aujourdhui, contexteFiscal(chargement))), [chargement, aujourdhui, jours]);
}

export function LigneEcheance({ e }: { e: Echeance }) {
  const { t } = useLangue();
  return (
    <div className="ligne">
      <div className="l">{t(`echeance.${e.cle}` as Cle)}</div>
      <b className="num">{fmtDate(e.date)}</b>
    </div>
  );
}

export function Echeances() {
  const { t } = useLangue();
  const liste = useEcheances(365);
  return (
    <>
      <p className="aide">{t('echeances.aide')}</p>
      <div className="liste">
        {liste.map((e) => (
          <LigneEcheance key={`${e.date}-${e.cle}`} e={e} />
        ))}
        {liste.length === 0 && (
          <div className="ligne">
            <div className="l aide">{t('echeances.rien')}</div>
          </div>
        )}
      </div>
    </>
  );
}
