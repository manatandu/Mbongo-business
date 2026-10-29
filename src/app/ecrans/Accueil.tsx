/** Accueil du commerçant : combien j'ai, noter une entrée ou une sortie, ce qui demande mon attention. */
import { useMemo } from 'react';
import { Link } from 'wouter';
import { calculerEtats, centimesEnFrancs, controler, soldesTresorerie, versFC, type CodeAnomalie, type Nature, type Operation } from '../../moteur';
import { useLangue, type Cle } from '../../i18n';
import { fmt, fmtDate, fmtMontant } from '../../ui/format';
import { useDossier } from '../session';
import { LigneOperation } from './LigneOperation';

/** Alertes montrées au commerçant, et l'écran où il peut agir. */
const ALERTES: Partial<Record<CodeAnomalie, { cle: Cle; ecran: string }>> = {
  solde_negatif: { cle: 'alerte.solde_negatif', ecran: '/journal' },
  creance_ancienne: { cle: 'alerte.creance_ancienne', ecran: '/clients' },
  stock_non_inventorie: { cle: 'alerte.stock_non_inventorie', ecran: '/stock' },
  seuil_smt_depasse: { cle: 'alerte.seuil', ecran: '/etats' },
  seuil_smt_approche: { cle: 'alerte.seuil', ecran: '/etats' },
  decouvert_bancaire: { cle: 'alerte.decouvert_bancaire', ecran: '/journal' },
  jours_sans_vente: { cle: 'alerte.jours_sans_vente', ecran: '/saisir/recette' },
  mois_sans_saisie: { cle: 'alerte.mois_sans_saisie', ecran: '/saisir/recette' },
  sans_piece: { cle: 'alerte.sans_piece', ecran: '/journal' },
};

/** « Entré » et « sorti » : l'activité seule, sans les apports, prélèvements, prêts ni matériel. */
const ACTIVITE: ReadonlySet<Nature> = new Set<Nature>(['ventes', 'autres_recettes', 'achats_marchandises', 'achats_fournitures', 'loyers', 'salaires', 'impots_taxes', 'interets', 'autres_depenses']);

const valeur = (o: Operation): number => (o.annule ? -1 : 1) * versFC(o.montant, o.devise, o.taux);

export function Accueil() {
  const { chargement, dateRef, taux } = useDossier();
  const { t, mois } = useLangue();
  const { dossier, comptes } = chargement;

  const vue = useMemo(() => {
    const soldes = soldesTresorerie(dossier, dateRef);
    const etats = calculerEtats(dossier, { auDate: dateRef });
    const duMois = dossier.operations.filter((o) => o.date.startsWith(dateRef.slice(0, 7)) && ACTIVITE.has(o.nature));
    const entre = duMois.filter((o) => o.type === 'recette').reduce((s, o) => s + valeur(o), 0);
    const sorti = duMois.filter((o) => o.type === 'depense').reduce((s, o) => s + valeur(o), 0);
    // Les plus urgentes d'abord, deux au plus : au-delà, plus personne ne les lit.
    const anomalies = controler(dossier, dateRef)
      .filter((a) => a.niveau !== 'information' && ALERTES[a.code])
      .sort((a, b) => (a.niveau === b.niveau ? 0 : a.niveau === 'a_traiter' ? -1 : 1))
      .slice(0, 2);
    const recentes = [...dossier.operations].reverse().slice(0, 3);
    return { soldes, etats, entre, sorti, anomalies, recentes };
  }, [dossier, dateRef]);

  const totalFC = vue.soldes.reduce((s, x) => s + (x.compte.devise === 'CDF' ? x.natif : taux ? centimesEnFrancs(x.natif, taux) : x.fcHistorique), 0);
  const libelleCompte = (id: string) => comptes.find((c) => c.id === id)?.libelle ?? id;

  return (
    <>
      <div className="hero">
        <div className="lbl">{t('accueil.disponible')}</div>
        <div className="big">{fmtMontant(totalFC, 'CDF')}</div>
        <div className="sub">{t('accueil.au', { date: fmtDate(dateRef) })}</div>
      </div>

      <div className="duo">
        <Link href="/saisir/recette" className="grand-bouton in">
          <strong>{t('accueil.recette')}</strong>
        </Link>
        <Link href="/saisir/depense" className="grand-bouton out">
          <strong>{t('accueil.depense')}</strong>
        </Link>
      </div>

      {vue.anomalies.map((a) => {
        const alerte = ALERTES[a.code];
        return alerte ? (
          <Link key={a.code} href={alerte.ecran} className={`alerte ${a.niveau}`}>
            <span className="point" aria-hidden="true" />
            <span>{t(alerte.cle, { n: a.references.length })}</span>
          </Link>
        ) : null;
      })}

      <div className="comptes">
        {vue.soldes.map((s) => (
          <Link key={s.compte.id} href={`/journal/${s.compte.id}`} className="compte">
            <div className="n">{s.compte.libelle}</div>
            <div className={`v ${s.natif < 0 ? 'neg' : ''}`}>{fmtMontant(s.natif, s.compte.devise)}</div>
          </Link>
        ))}
      </div>

      <h2 className="titre-section">{t('accueil.mois', { mois: mois(Number(dateRef.slice(5, 7))) })}</h2>
      <div className="kpis">
        <div className="kpi">
          <div className="n">{t('accueil.entre')}</div>
          <div className="v amt-in">{fmt(vue.entre)}</div>
        </div>
        <div className="kpi">
          <div className="n">{t('accueil.sorti')}</div>
          <div className="v amt-out">{fmt(vue.sorti)}</div>
        </div>
        <div className="kpi">
          <div className="n">{t('accueil.reste')}</div>
          <div className={`v ${vue.entre - vue.sorti < 0 ? 'neg' : ''}`}>{fmt(vue.entre - vue.sorti)}</div>
        </div>
      </div>
      <div className="duo">
        <Link href="/clients" className="kpi lien-carte">
          <div className="n">{t('accueil.onMeDoit')}</div>
          <div className="v">{fmtMontant(vue.etats.bilan.actif.creances, 'CDF')}</div>
        </Link>
        <Link href="/clients/dettes" className="kpi lien-carte">
          <div className="n">{t('accueil.jeDois')}</div>
          <div className="v">{fmtMontant(vue.etats.bilan.passif.dettes, 'CDF')}</div>
        </Link>
      </div>

      <h2 className="titre-section">
        {t('accueil.dernieres')}
        <Link href="/journal" className="bouton discret petit">
          {t('accueil.toutVoir')}
        </Link>
      </h2>
      {vue.recentes.length ? (
        <div className="liste">
          {vue.recentes.map((o) => (
            <LigneOperation key={o.id} operation={o} libelleCompte={libelleCompte} />
          ))}
        </div>
      ) : (
        <p className="aide">{t('accueil.rien')}</p>
      )}
    </>
  );
}
