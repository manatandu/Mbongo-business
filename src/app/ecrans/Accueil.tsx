/** Tableau de bord du commerçant : argent disponible, mois en cours, factures, alertes. */
import { useMemo } from 'react';
import { Link } from 'wouter';
import { calculerEtats, centimesEnFrancs, controler, soldesTresorerie, versFC, type CodeAnomalie, type Nature, type Operation } from '../../moteur';
import { useLangue, type Cle } from '../../i18n';
import { fmt, fmtDate, fmtMontant } from '../../ui/format';
import { useDossier } from '../session';
import { LigneOperation } from './LigneOperation';

const ALERTES: Partial<Record<CodeAnomalie, Cle>> = {
  solde_negatif: 'alerte.solde_negatif',
  creance_ancienne: 'alerte.creance_ancienne',
  stock_non_inventorie: 'alerte.stock_non_inventorie',
  seuil_smt_depasse: 'alerte.seuil',
  seuil_smt_approche: 'alerte.seuil',
  decouvert_bancaire: 'alerte.decouvert_bancaire',
  jours_sans_vente: 'alerte.jours_sans_vente',
  mois_sans_saisie: 'alerte.mois_sans_saisie',
  sans_piece: 'alerte.sans_piece',
};

/** Ce qui compte comme « entré » ou « sorti » pour le commerçant : l'activité, sans les mouvements de capital. */
const ACTIVITE: ReadonlySet<Nature> = new Set<Nature>(['ventes', 'autres_recettes', 'achats_marchandises', 'achats_fournitures', 'loyers', 'salaires', 'impots_taxes', 'interets', 'autres_depenses']);

const valeur = (o: Operation): number => (o.annule ? -1 : 1) * versFC(o.montant, o.devise, o.taux);

export function Accueil() {
  const { chargement, dateRef, taux } = useDossier();
  const { t, mois } = useLangue();
  const { dossier, comptes } = chargement;

  const vue = useMemo(() => {
    const soldes = soldesTresorerie(dossier, dateRef);
    const etats = calculerEtats(dossier, { auDate: dateRef });
    const ceMois = dateRef.slice(0, 7);
    const duMois = dossier.operations.filter((o) => o.date.startsWith(ceMois) && o.type !== 'transfert');
    const entre = duMois.filter((o) => o.type === 'recette' && ACTIVITE.has(o.nature)).reduce((s, o) => s + valeur(o), 0);
    const sorti = duMois.filter((o) => o.type === 'depense' && ACTIVITE.has(o.nature)).reduce((s, o) => s + valeur(o), 0);
    const parNature = new Map<Nature, number>();
    for (const o of duMois) if (o.type === 'depense') parNature.set(o.nature, (parNature.get(o.nature) ?? 0) + valeur(o));
    const postes = [...parNature].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const anomalies = controler(dossier, dateRef).filter((a) => a.niveau !== 'information' && ALERTES[a.code]);
    const recentes = [...dossier.operations].reverse().slice(0, 4);
    return { soldes, etats, entre, sorti, postes, anomalies, recentes };
  }, [dossier, dateRef]);

  const dollars = vue.soldes.filter((s) => s.compte.devise === 'USD').reduce((s, x) => s + x.natif, 0);
  const totalFC = vue.soldes.reduce((s, x) => s + (x.compte.devise === 'CDF' ? x.natif : taux ? centimesEnFrancs(x.natif, taux) : x.fcHistorique), 0);
  const max = Math.max(1, ...vue.postes.map(([, v]) => v));
  const libelleCompte = (id: string) => comptes.find((c) => c.id === id)?.libelle ?? id;

  return (
    <>
      <div className="hero">
        <div className="lbl">{t('accueil.disponible')}</div>
        <div className="big">{fmtMontant(totalFC, 'CDF')}</div>
        <div className="sub">
          {t('accueil.au', { date: fmtDate(dateRef) })}
          {taux ? ` · ${t('accueil.tauxJour', { taux: fmt(taux) })}` : ''}
          {dollars ? ` · ${t('accueil.dontDollars', { montant: fmtMontant(dollars, 'USD') })}` : ''}
        </div>
      </div>

      <div className="comptes">
        {vue.soldes.map((s) => (
          <Link key={s.compte.id} href={`/journal/${s.compte.id}`} className="compte">
            <div className="n">{s.compte.libelle}</div>
            <div className={`v ${s.natif < 0 ? 'neg' : ''}`}>{fmtMontant(s.natif, s.compte.devise)}</div>
          </Link>
        ))}
      </div>

      <div className="duo">
        <Link href="/saisir/recette" className="grand-bouton in">
          <strong>{t('accueil.recette')}</strong>
          <span>Mbongo ekoti</span>
        </Link>
        <Link href="/saisir/depense" className="grand-bouton out">
          <strong>{t('accueil.depense')}</strong>
          <span>Mbongo ebimi</span>
        </Link>
      </div>

      {vue.anomalies.length > 0 && (
        <section aria-labelledby="t-verif" className="barres">
          <h2 className="titre-section" id="t-verif">
            {t('accueil.aVerifier')}
          </h2>
          {vue.anomalies.slice(0, 3).map((a) => (
            <div key={a.code} className={`alerte ${a.niveau}`}>
              <span className="point" aria-hidden="true" />
              <span>{t(ALERTES[a.code] as Cle, { n: a.references.length })}</span>
            </div>
          ))}
        </section>
      )}

      <h2 className="titre-section">
        {t('accueil.mois', { mois: mois(Number(dateRef.slice(5, 7))) })} <small>{t('accueil.moisAide')}</small>
      </h2>
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
      <div className="kpis">
        <Link href="/clients" className="kpi" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="n">{t('accueil.onMeDoit')}</div>
          <div className="v">{fmt(vue.etats.bilan.actif.creances)}</div>
        </Link>
        <Link href="/clients/dettes" className="kpi" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="n">{t('accueil.jeDois')}</div>
          <div className="v">{fmt(vue.etats.bilan.passif.dettes)}</div>
        </Link>
        <Link href="/stock" className="kpi" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="n">{t('accueil.stock')}</div>
          <div className="v">{fmt(chargement.exercice.stockFinal ?? chargement.exercice.stockInitial)}</div>
        </Link>
      </div>

      <h2 className="titre-section">
        {t('accueil.ouPart')} <small>FC</small>
      </h2>
      {vue.postes.length ? (
        <div className="barres">
          {vue.postes.map(([n, v]) => (
            <div className="barre" key={n}>
              <span>{t(`nature.${n}` as Cle)}</span>
              <div className="piste">
                <div className="rempli" style={{ width: `${((v / max) * 100).toFixed(1)}%` }} />
              </div>
              <span className="num">{fmt(v)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="aide">{t('accueil.aucuneDepense')}</p>
      )}

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
      <p className="aide">{t('app.mention')}</p>
    </>
  );
}
