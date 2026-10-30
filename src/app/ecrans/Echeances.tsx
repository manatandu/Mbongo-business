/** Échéances fiscales et sociales. Des rappels : Mbongo ne calcule ni ne déclare. Les deux mois qui viennent d'abord. */
import { useMemo, useState } from 'react';
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

/** Une ligne par date : « Retenue sur loyer · ONEM » plutôt que deux lignes le même jour. */
function parDate(liste: Echeance[]): { date: string; cles: Echeance['cle'][] }[] {
  const groupes: { date: string; cles: Echeance['cle'][] }[] = [];
  for (const e of liste) {
    const dernier = groupes[groupes.length - 1];
    if (dernier?.date === e.date) dernier.cles.push(e.cle);
    else groupes.push({ date: e.date, cles: [e.cle] });
  }
  return groupes;
}

export function Echeances() {
  const { t } = useLangue();
  const [annee, setAnnee] = useState(false);
  const liste = useEcheances(annee ? 365 : 60);
  return (
    <>
      <p className="aide">{t('echeances.aide')}</p>
      <div className="liste">
        {parDate(liste).map((g) => (
          <div className="ligne" key={g.date}>
            <div className="l">{g.cles.map((c) => t(`echeance.${c}` as Cle)).join(' · ')}</div>
            <b className="num">{fmtDate(g.date)}</b>
          </div>
        ))}
        {liste.length === 0 && (
          <div className="ligne">
            <div className="l aide">{t('echeances.rien')}</div>
          </div>
        )}
      </div>
      {!annee && (
        <button className="bouton discret" onClick={() => setAnnee(true)}>
          {t('echeances.annee')}
        </button>
      )}
    </>
  );
}
