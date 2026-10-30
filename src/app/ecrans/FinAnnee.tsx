/**
 * Fin d'année, sur l'accueil : l'inventaire extra-comptable des quatre éléments du Titre X (créances et dettes,
 * stock, matériel acheté ou vendu, emprunt), puis l'année suivante. Mbongo fait les listes ; le commerçant confirme
 * chacune d'un toucher, la date est gardée et le récapitulatif s'imprime comme pièce justificative.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { calculerEtats } from '../../moteur';
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

  // Les trois autres éléments de l'inventaire, à la clôture.
  const cle = `inventaireQuatre:${exercice.id}`;
  const confirmes = useLiveQuery(() => lireReglage<Record<string, string>>(db, cle, {}), [cle]) ?? {};
  const elements = useMemo(() => {
    const d = chargement.dossier;
    const e = calculerEtats(d, { auDate: exercice.fin });
    const ouvertes = (l: { perdueLe?: string }) => !l.perdueLe;
    const achetes = d.immobilisations.filter((i) => i.date >= exercice.debut && i.date <= exercice.fin);
    const sortis = d.immobilisations.filter((i) => i.sortie && i.sortie.date >= exercice.debut && i.sortie.date <= exercice.fin);
    return [
      { cle: 'tiers', texte: t('fin.inv.tiers', { creances: fmtMontant(e.bilan.actif.creances, 'CDF'), dettes: fmtMontant(e.bilan.passif.dettes, 'CDF'), n: d.creances.filter(ouvertes).length + d.dettes.length }) },
      { cle: 'materiel', texte: t('fin.inv.materiel', { achetes: achetes.length, sortis: sortis.length }) },
      { cle: 'emprunt', texte: t('fin.inv.emprunt', { reste: fmtMontant(e.bilan.passif.emprunt, 'CDF') }) },
    ];
  }, [chargement.dossier, exercice, t]);
  const tousConfirmes = elements.every((x) => confirmes[x.cle]);
  const confirmer = (k: string, oui: boolean) => {
    const n = { ...confirmes };
    if (oui) n[k] = aujourdhui;
    else delete n[k];
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
      {elements.map((x) => (
        <label className="case" key={x.cle}>
          <input type="checkbox" checked={Boolean(confirmes[x.cle])} onChange={(e) => confirmer(x.cle, e.target.checked)} />
          <span>{x.texte}</span>
        </label>
      ))}
      <p className="aide">{t('fin.inv.aide')}</p>
      {demandeTaux && (
        <label className="champ">
          {t('fin.dollar')}
          <input inputMode="decimal" value={tauxTexte} onChange={(e) => setTauxTexte(e.target.value)} />
        </label>
      )}
      <Erreurs messages={erreurs} />
      <button className="bouton" disabled={!stockFait || !tousConfirmes || occupe} onClick={() => void commencer()}>
        {t('fin.commencer', { suivante })}
      </button>
    </section>
  );
}
