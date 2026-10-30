/** Accueil du commerçant : combien j'ai, noter une entrée ou une sortie, ce qui demande mon attention. */
import { useMemo } from 'react';
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

  return (
    <>
      {aujourdhui > chargement.exercice.fin && <FinAnnee />}
      {/* Le total seulement : le détail par compte est au Journal, d'un toucher. */}
      <Link href="/journal" className="hero lien-carte">
        <div className="lbl">{t('accueil.disponible')}</div>
        <div className="big">{fmtMontant(totalFC, 'CDF')}</div>
        <div className="sub">{t('accueil.au', { date: fmtDate(dateRef) })}</div>
      </Link>

      <div className="duo">
        <Link href="/saisir/recette" className="grand-bouton in">
          <strong>{t('accueil.recette')}</strong>
        </Link>
        <Link href="/saisir/depense" className="grand-bouton out">
          <strong>{t('accueil.depense')}</strong>
        </Link>
      </div>

      <TauxDuJour />

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

      <div className="comptes">
        <Link href="/journal" className="kpi lien-carte">
          <div className="n">{t('accueil.entre', { mois: mois(Number(dateRef.slice(5, 7))) })}</div>
          <div className="v amt-in">{fmt(vue.entre)}</div>
        </Link>
        <Link href="/journal" className="kpi lien-carte">
          <div className="n">{t('accueil.sorti', { mois: mois(Number(dateRef.slice(5, 7))) })}</div>
          <div className="v amt-out">{fmt(vue.sorti)}</div>
        </Link>
        <Link href="/clients" className="kpi lien-carte">
          <div className="n">{t('accueil.onMeDoit')}</div>
          <div className="v">{fmt(vue.etats.bilan.actif.creances)}</div>
        </Link>
        <Link href="/clients/dettes" className="kpi lien-carte">
          <div className="n">{t('accueil.jeDois')}</div>
          <div className="v">{fmt(vue.etats.bilan.passif.dettes)}</div>
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
