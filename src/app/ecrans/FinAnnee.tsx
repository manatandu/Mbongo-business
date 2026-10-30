/**
 * Fin d'année, sur l'accueil : l'inventaire extra-comptable du Titre X (stock compté, puis créances et dettes,
 * matériel, emprunt vérifiés d'une seule case datée), puis l'année suivante.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { ecrireReglage, lireReglage } from '../../donnees/reglages';
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

  // Les trois autres éléments de l'inventaire (Titre X) : une seule case, datée.
  const cle = `inventaireQuatre:${exercice.id}`;
  const enBase = useLiveQuery(() => lireReglage<Record<string, string>>(db, cle, {}), [cle]);
  // Copie locale : la case suit le doigt tout de suite.
  const [local, setLocal] = useState<Record<string, string> | null>(null);
  const confirmes = local ?? enBase ?? {};
  const verifie = Boolean(confirmes.verifie);
  const confirmer = (oui: boolean) => {
    const n: Record<string, string> = oui ? { verifie: aujourdhui } : {};
    setLocal(n);
    void ecrireReglage(db, cle, n);
  };

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
      {stockFait ? (
        <p className="fait">{t('fin.stockFait', { total: fmtMontant(exercice.stockFinal ?? 0, 'CDF') })}</p>
      ) : (
        <Link href="/stock/inventaire" className="bouton discret">
          {t('fin.stockFaire')}
        </Link>
      )}
      <label className="case">
        <input type="checkbox" checked={verifie} onChange={(e) => confirmer(e.target.checked)} />
        <span>{t('fin.inv.verifie')}</span>
      </label>
      {demandeTaux && (
        <label className="champ">
          {t('fin.dollar')}
          <input inputMode="decimal" value={tauxTexte} onChange={(e) => setTauxTexte(e.target.value)} />
        </label>
      )}
      <Erreurs messages={erreurs} />
      <button className="bouton" disabled={!stockFait || !verifie || occupe} onClick={() => void commencer()}>
        {t('fin.commencer', { suivante })}
      </button>
    </section>
  );
}
