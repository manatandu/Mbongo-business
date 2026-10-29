/** Fin d'année, sur l'accueil : compter le stock, puis commencer l'année suivante. */
import { useState } from 'react';
import { Link } from 'wouter';
import { ouvrirExerciceSuivant, tauxClotureDemande } from '../../donnees/exercice';
import { ErreurSaisie } from '../../donnees/saisie';
import { useLangue } from '../../i18n';
import { fmtMontant, lireTaux } from '../../ui/format';
import { Erreurs } from '../composants';
import { db, useDossier } from '../session';

export function FinAnnee() {
  const { chargement, aujourdhui, taux, annoncer } = useDossier();
  const { t } = useLangue();
  const { exercice } = chargement;
  const annee = exercice.annee;
  const suivante = annee + 1;
  const demandeTaux = tauxClotureDemande(chargement);
  const [tauxTexte, setTauxTexte] = useState(taux ? String(taux) : '');
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [occupe, setOccupe] = useState(false);
  const stockFait = exercice.stockFinal !== null;

  async function commencer() {
    const tauxLu = demandeTaux ? lireTaux(tauxTexte) : undefined;
    if (demandeTaux && !tauxLu) return setErreurs([t('saisir.erreur.taux')]);
    setOccupe(true);
    try {
      await ouvrirExerciceSuivant(db, chargement, aujourdhui, tauxLu ?? undefined);
      annoncer(t('fin.ok', { suivante }));
    } catch (x) {
      setErreurs(x instanceof ErreurSaisie ? x.messages : [(x as Error).message]);
    } finally {
      setOccupe(false);
    }
  }

  return (
    <section className="fin-annee">
      <h2>{t('fin.titre', { annee })}</h2>
      <p>{t('fin.texte', { suivante })}</p>
      {stockFait ? (
        <p className="fait">{t('fin.stockFait', { total: fmtMontant(exercice.stockFinal ?? 0, 'CDF') })}</p>
      ) : (
        <Link href="/stock" className="bouton discret">
          {t('fin.stockFaire')}
        </Link>
      )}
      {demandeTaux && (
        <label className="champ">
          {t('fin.dollar')}
          <input inputMode="decimal" value={tauxTexte} onChange={(e) => setTauxTexte(e.target.value)} />
          <span className="aide">{t('fin.dollarAide')}</span>
        </label>
      )}
      <Erreurs messages={erreurs} />
      <button className="bouton" disabled={!stockFait || occupe} onClick={() => void commencer()}>
        {t('fin.commencer', { suivante })}
      </button>
    </section>
  );
}
