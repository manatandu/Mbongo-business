/** Accueil du commerçant : combien j'ai, noter une entrée ou une sortie, ce qui demande mon attention. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { calculerEtats, centimesEnFrancs, controler, soldesTresorerie, type CodeAnomalie } from '../../moteur';
import { PARAMETRES_CONTROLE } from '../../donnees/parametres';
import { useLangue, type Cle } from '../../i18n';
import { fmt, fmtDate, fmtMontant } from '../../ui/format';
import { useDossier } from '../session';
import { useEcheances } from './Echeances';
import { FinAnnee } from './FinAnnee';
import { TauxDuJour } from './TauxDuJour';
import { ACTIVITE, useJourneeFaite, valeur } from './FinJournee';

/** Alertes montrées au commerçant, et l'écran où il peut agir. */
const ALERTES: Partial<Record<CodeAnomalie, { cle: Cle; ecran: string }>> = {
  solde_negatif: { cle: 'alerte.solde_negatif', ecran: '/journal' },
  creance_ancienne: { cle: 'alerte.creance_ancienne', ecran: '/clients' },
  stock_non_inventorie: { cle: 'alerte.stock_non_inventorie', ecran: '/stock' },
  seuil_smt_depasse: { cle: 'alerte.seuilDepasse', ecran: '/etats' },
  seuil_smt_approche: { cle: 'alerte.seuil', ecran: '/etats' },
  decouvert_bancaire: { cle: 'alerte.decouvert_bancaire', ecran: '/journal' },
  jours_sans_vente: { cle: 'alerte.jours_sans_vente', ecran: '/saisir/recette' },
  mois_sans_saisie: { cle: 'alerte.mois_sans_saisie', ecran: '/saisir/recette' },
  sans_piece: { cle: 'alerte.sans_piece', ecran: '/journal' },
  creance_prescription: { cle: 'alerte.creance_prescription', ecran: '/clients' },
  creance_prescrite: { cle: 'alerte.creance_prescrite', ecran: '/clients' },
};

/** Le solde se compte jusqu'à sa valeur : à l'ouverture, puis à chaque changement. Rien sous « mouvement réduit ». */
function useCompte(cible: number): number {
  const [affiche, setAffiche] = useState(() => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? cible : 0));
  const depart = useRef(affiche);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return setAffiche(cible);
    const de = depart.current;
    const debut = performance.now();
    let image = 0;
    const pas = (maintenant: number) => {
      const p = Math.min(1, (maintenant - debut) / 750);
      const v = Math.round(de + (cible - de) * (1 - Math.pow(1 - p, 4)));
      depart.current = v;
      setAffiche(v);
      if (p < 1) image = requestAnimationFrame(pas);
    };
    image = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(image);
  }, [cible]);
  return affiche;
}

export function Accueil() {
  const { chargement, dateRef, taux, aujourdhui, entreprise } = useDossier();
  const journee = useJourneeFaite(entreprise.id);
  const prochaine = useEcheances(30)[0];
  const { t, mois } = useLangue();
  const { dossier } = chargement;

  const vue = useMemo(() => {
    const soldes = soldesTresorerie(dossier, dateRef);
    const etats = calculerEtats(dossier, { auDate: dateRef });
    const duMois = dossier.operations.filter((o) => o.date.startsWith(dateRef.slice(0, 7)) && ACTIVITE.has(o.nature));
    const entre = duMois.filter((o) => o.type === 'recette').reduce((s, o) => s + valeur(o), 0);
    const sorti = duMois.filter((o) => o.type === 'depense').reduce((s, o) => s + valeur(o), 0);
    // Les plus urgentes d'abord, deux au plus : au-delà, plus personne ne les lit.
    const anomalies = controler(dossier, dateRef, PARAMETRES_CONTROLE)
      .filter((a) => a.niveau !== 'information' && ALERTES[a.code])
      .sort((a, b) => (a.niveau === b.niveau ? 0 : a.niveau === 'a_traiter' ? -1 : 1))
      .slice(0, 2);
    return { soldes, etats, entre, sorti, anomalies };
  }, [dossier, dateRef]);

  const totalFC = vue.soldes.reduce((s, x) => s + (x.compte.devise === 'CDF' ? x.natif : taux ? centimesEnFrancs(x.natif, taux) : x.fcHistorique), 0);
  const compte = useCompte(totalFC);
  const nomMois = mois(Number(dateRef.slice(5, 7)));

  return (
    <>
      {/* La caisse : combien j'ai, d'un coup d'œil. Le détail par compte est au Journal, d'un toucher. */}
      <div className="caisse">
        <div className="lbl">
          <span>{t('accueil.disponible')}</span>
          <span>{fmtDate(dateRef)}</span>
        </div>
        {/* Plus le nombre est long, plus il se serre : il tient toujours sur une ligne. */}
        <Link href="/journal" className="big num" style={{ fontSize: `min(64px, calc((100vw - 56px) / ${(0.58 * fmt(totalFC).length + 0.9).toFixed(2)}))` }} aria-label={fmtMontant(totalFC, 'CDF')}>
          {fmt(compte)}
          <small>CDF</small>
        </Link>
        <div className="taux">
          <TauxDuJour />
        </div>
      </div>

      <div className="mouvements">
        <Link href="/saisir/recette" className="grand-bouton in">
          <span className="signe" aria-hidden="true">
            +
          </span>
          {t('accueil.recette')}
        </Link>
        <Link href="/saisir/depense" className="grand-bouton out">
          <span className="signe" aria-hidden="true">
            −
          </span>
          {t('accueil.depense')}
        </Link>
      </div>

      {aujourdhui > chargement.exercice.fin && <FinAnnee />}

      {(vue.anomalies.length > 0 || prochaine) && (
        <div>
          {vue.anomalies.map((a) => {
            const alerte = ALERTES[a.code];
            return alerte ? (
              <Link key={a.code} href={alerte.ecran} className={`alerte ${a.niveau}`}>
                <span className="point" aria-hidden="true" />
                <span>{t(alerte.cle, { n: a.references.length })}</span>
              </Link>
            ) : null;
          })}
          {prochaine && (
            <Link href="/echeances" className="alerte information">
              <span className="point" aria-hidden="true" />
              <span>
                <b className="num">{fmtDate(prochaine.date).slice(0, 5)}</b> · {t(`echeance.${prochaine.cle}` as Cle)}
              </span>
            </Link>
          )}
        </div>
      )}

      <div className="registre">
        <Link href="/journal">
          <span className="n">{t('accueil.entre', { mois: nomMois })}</span>
          <span className="v num amt-in">{fmt(vue.entre)}</span>
          <span className="fl" aria-hidden="true">
            ›
          </span>
        </Link>
        <Link href="/journal">
          <span className="n">{t('accueil.sorti', { mois: nomMois })}</span>
          <span className="v num amt-out">{fmt(vue.sorti)}</span>
          <span className="fl" aria-hidden="true">
            ›
          </span>
        </Link>
        <Link href="/clients">
          <span className="n">{t('accueil.onMeDoit')}</span>
          <span className="v num">{fmt(vue.etats.bilan.actif.creances)}</span>
          <span className="fl" aria-hidden="true">
            ›
          </span>
        </Link>
        <Link href="/clients/dettes">
          <span className="n">{t('accueil.jeDois')}</span>
          <span className="v num">{fmt(vue.etats.bilan.passif.dettes)}</span>
          <span className="fl" aria-hidden="true">
            ›
          </span>
        </Link>
      </div>

      {aujourdhui <= chargement.exercice.fin && (
        <Link href="/journee" className="bouton discret">
          {journee === aujourdhui ? t('journee.faite') : t('journee.bouton')}
        </Link>
      )}
    </>
  );
}
