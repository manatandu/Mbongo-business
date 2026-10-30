/** Le taux du dollar du jour, sur l'accueil : une ligne, et un champ quand on veut le changer. */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { useLangue } from '../../i18n';
import { dernierTaux, enregistrerTaux } from '../../donnees/saisie';
import { fmt, fmtDate, lireTaux } from '../../ui/format';
import { db, useDossier } from '../session';

export function TauxDuJour() {
  const { t } = useLangue();
  const { aujourdhui, annoncer } = useDossier();
  const dernier = useLiveQuery(() => dernierTaux(db, aujourdhui), [aujourdhui]);
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState('');
  const [erreur, setErreur] = useState(false);

  async function enregistrer(e: FormEvent) {
    e.preventDefault();
    const v = lireTaux(texte);
    if (!v) return setErreur(true);
    await enregistrerTaux(db, aujourdhui, v, 'commercant');
    setOuvert(false);
    setTexte('');
    setErreur(false);
    annoncer(t('taux.ok'));
  }

  if (ouvert) {
    return (
      <form className="ligne-taux ouvert" onSubmit={(e) => void enregistrer(e)} noValidate>
        <label className="champ">
          {t('taux.titre')}
          <input inputMode="decimal" autoFocus placeholder={dernier ? String(dernier.valeur) : '2 850'} value={texte} onChange={(e) => setTexte(e.target.value)} aria-invalid={erreur} />
        </label>
        {erreur && <p className="erreur">{t('saisir.erreur.taux')}</p>}
        <div className="deux-col">
          <button type="button" className="bouton discret" onClick={() => setOuvert(false)}>
            {t('commun.annuler')}
          </button>
          <button className="bouton">{t('saisir.enregistrer')}</button>
        </div>
      </form>
    );
  }
  return (
    <button className="ligne-taux" onClick={() => setOuvert(true)}>
      <span>
        {dernier ? (
          <>
            <b className="num">{t('taux.ligne', { taux: fmt(Math.round(dernier.valeur)) })}</b>{' '}
            <small>{dernier.date === aujourdhui ? t('taux.aujourdhui') : t('taux.le', { date: fmtDate(dernier.date) })}</small>
          </>
        ) : (
          t('taux.aucun')
        )}
      </span>
      <span className="lien">{t('taux.changer')}</span>
    </button>
  );
}
