/** Journaux de suivi des créances et des dettes, avec paiements en plusieurs fois. */
import { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { situationTiers, type Devise, type GenreTiers, type SituationTiers } from '../../moteur';
import { useLangue } from '../../i18n';
import { annulerFacture, enregistrerReglement, ErreurSaisie } from '../../donnees/saisie';
import { fmtDate, fmtMontant, lireMontant, lireTaux } from '../../ui/format';
import { Erreurs, Montant, Pastille } from '../composants';
import { db, useDossier } from '../session';

function Reglement({ s, genre, fermer }: { s: SituationTiers; genre: GenreTiers; fermer: () => void }) {
  const { chargement, dateRef, taux, annoncer, aujourdhui } = useDossier();
  const { t } = useLangue();
  const comptes = chargement.comptes.filter((c) => c.devise === s.ligne.devise);
  const [montant, setMontant] = useState(s.ligne.devise === 'USD' ? (s.encours / 100).toFixed(2).replace('.', ',') : String(s.encours));
  const [compte, setCompte] = useState(comptes[0]?.id ?? '');
  const [tauxTexte, setTauxTexte] = useState(taux ? String(taux) : '');
  const [erreurs, setErreurs] = useState<string[]>([]);

  if (!comptes.length) return <p className="erreur">{t('tiers.pasDeCompte', { devise: s.ligne.devise === 'USD' ? 'USD' : 'CDF' })}</p>;

  async function valider() {
    // Année finie mais pas encore commencée la suivante : le paiement tomberait dans l'année passée.
    if (aujourdhui > chargement.exercice.fin) {
      setErreurs([t('fin.saisir', { annee: chargement.exercice.annee, suivante: chargement.exercice.annee + 1 })]);
      return;
    }
    const m = lireMontant(montant, s.ligne.devise);
    if (!m || m <= 0) {
      setErreurs([t('saisir.erreur.montant')]);
      return;
    }
    const tx = s.ligne.devise === 'USD' ? lireTaux(tauxTexte) : null;
    if (s.ligne.devise === 'USD' && !tx) {
      setErreurs([t('saisir.erreur.taux')]);
      return;
    }
    try {
      await enregistrerReglement(db, chargement.exercice.id, genre, s.ligne.id, { date: dateRef, compte, montant: m, taux: tx });
      annoncer(t(genre === 'creance' ? 'tiers.okEncaisse' : 'tiers.okPaye'));
      fermer();
    } catch (x) {
      setErreurs(x instanceof ErreurSaisie ? x.messages : [(x as Error).message]);
    }
  }

  return (
    <div className="actions">
      <div className="deux-col">
        <label className="champ">
          {t('saisir.montant')} ({s.ligne.devise === 'USD' ? 'USD' : 'CDF'})
          <input inputMode="decimal" value={montant} onChange={(e) => setMontant(e.target.value)} />
        </label>
        <label className="champ">
          {t(genre === 'creance' ? 'tiers.surCompte' : 'tiers.depuisCompte')}
          <select value={compte} onChange={(e) => setCompte(e.target.value)}>
            {comptes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.libelle}
              </option>
            ))}
          </select>
        </label>
      </div>
      {s.ligne.devise === 'USD' && (
        <label className="champ">
          {t('saisir.taux')}
          <input inputMode="decimal" value={tauxTexte} onChange={(e) => setTauxTexte(e.target.value)} />
        </label>
      )}
      <Erreurs messages={erreurs} />
      <div className="duo">
        <button className="bouton discret" onClick={fermer}>
          {t('commun.annuler')}
        </button>
        <button className="bouton" onClick={() => void valider()}>
          {t(genre === 'creance' ? 'tiers.encaisser' : 'tiers.payer')}
        </button>
      </div>
    </div>
  );
}

export function Tiers() {
  const { chargement, dateRef, annoncer } = useDossier();
  const { t } = useLangue();
  const [erreurs, setErreurs] = useState<string[]>([]);
  const { exercice, entreprise } = chargement;
  const modifiable = exercice.statut !== 'arrete' && exercice.statut !== 'clos';

  async function corriger(s: SituationTiers) {
    if (!window.confirm(t('tiers.confirmerCorriger'))) return;
    try {
      await annulerFacture(db, exercice.id, s.ligne.id);
      setErreurs([]);
      annoncer(t('tiers.okCorrige'));
    } catch (x) {
      setErreurs(x instanceof ErreurSaisie ? x.messages : [(x as Error).message]);
    }
  }

  // Message prêt à envoyer : le commerçant choisit le contact dans WhatsApp.
  const lienRappel = (s: SituationTiers) =>
    'https://wa.me/?text=' +
    encodeURIComponent(
      t('tiers.messageRappel', { nom: s.ligne.nom, entreprise: entreprise.nom, reste: fmtMontant(s.encours, s.ligne.devise), facture: s.ligne.facture || t('tiers.sansNumero'), date: fmtDate(s.ligne.date) }),
    );
  const params = useParams<{ genre?: string }>();
  const [, aller] = useLocation();
  const genre: GenreTiers = params.genre === 'dettes' ? 'dette' : 'creance';
  const [ouverte, setOuverte] = useState<string | null>(null);

  const situation = useMemo(() => situationTiers(chargement.dossier, genre, dateRef), [chargement.dossier, genre, dateRef]);
  const enCours = situation.filter((s) => s.encours > 0).sort((a, b) => (a.ligne.date < b.ligne.date ? -1 : 1));
  const soldees = situation.filter((s) => s.soldee).reverse().slice(0, 3);
  const totaux = (['CDF', 'USD'] as Devise[]).map((d) => ({ d, v: enCours.filter((s) => s.ligne.devise === d).reduce((x, s) => x + s.encours, 0) })).filter((x) => x.v || x.d === 'CDF');

  return (
    <>
      <div className="filtres" role="group">
        <button className="puce" aria-pressed={genre === 'creance'} onClick={() => aller('/clients', { replace: true })}>
          {t('tiers.creances')}
        </button>
        <button className="puce" aria-pressed={genre === 'dette'} onClick={() => aller('/clients/dettes', { replace: true })}>
          {t('tiers.dettes')}
        </button>
      </div>
      <div className="hero">
        <div className="lbl">{t(genre === 'creance' ? 'tiers.totalCreances' : 'tiers.totalDettes')}</div>
        <div className="big">{totaux.map((x) => fmtMontant(x.v, x.d)).join(' + ')}</div>
        <div className="sub">{t('tiers.enAttente', { n: enCours.length })}</div>
      </div>
      <Link href={genre === 'creance' ? '/saisir/vente-credit' : '/saisir/achat-credit'} className="bouton discret">
        {t(genre === 'creance' ? 'tiers.nouvelleVente' : 'tiers.nouvelAchat')}
      </Link>
      <Erreurs messages={erreurs} />
      <div className="liste">
        {enCours.map((s) => (
          <div className="ligne" key={s.ligne.id}>
            <div className="l">
              <b style={{ fontWeight: 600 }}>{s.ligne.nom}</b>
            </div>
            <Montant valeur={s.encours} devise={s.ligne.devise} />
            <div className="meta">
              <span>{fmtDate(s.ligne.date)}</span>
              <span>{s.ligne.facture || t('tiers.sansNumero')}</span>
              <Pastille ton={s.ageJours > 30 ? 'bad' : s.ageJours > 14 ? 'warn' : 'info'}>{t('tiers.jours', { n: s.ageJours })}</Pastille>
              {s.regle > 0 && <span>{t('tiers.reste', { reste: fmtMontant(s.encours, s.ligne.devise), total: fmtMontant(s.ligne.montant, s.ligne.devise) })}</span>}
              {genre === 'creance' && <Pastille ton="info">{t(s.ligne.client === 'commercant' ? 'client.court.commercant' : 'client.court.particulier')}</Pastille>}
              {ouverte !== s.ligne.id && (
                <button className="bouton petit" onClick={() => setOuverte(s.ligne.id)}>
                  {t(genre === 'creance' ? 'tiers.encaisser' : 'tiers.payer')}
                </button>
              )}
              {genre === 'creance' && ouverte !== s.ligne.id && (
                <Link href={`/creance/${s.ligne.id}`} className="bouton discret petit">
                  {t('tiers.dossier')}
                </Link>
              )}
              {genre === 'creance' && ouverte !== s.ligne.id && (
                <a href={lienRappel(s)} target="_blank" rel="noopener noreferrer" className="bouton discret petit">
                  {t('tiers.whatsapp')}
                </a>
              )}
              {modifiable && s.regle === 0 && s.ligne.date >= exercice.debut && ouverte !== s.ligne.id && (
                <button className="bouton discret petit" onClick={() => void corriger(s)}>
                  {t('tiers.corriger')}
                </button>
              )}
            </div>
            {ouverte === s.ligne.id && <Reglement s={s} genre={genre} fermer={() => setOuverte(null)} />}
          </div>
        ))}
        {enCours.length === 0 && (
          <div className="ligne">
            <div className="l aide">{t('tiers.rien')}</div>
          </div>
        )}
      </div>
      {soldees.length > 0 && (
        <>
          <h2 className="titre-section">
            {t('tiers.reglees')} <small>{soldees.length}</small>
          </h2>
          <div className="liste">
            {soldees.map((s) => (
              <div className="ligne" key={s.ligne.id}>
                <div className="l">{s.ligne.nom}</div>
                <Montant valeur={s.ligne.montant} devise={s.ligne.devise} />
                <div className="meta">
                  <span>{s.ligne.facture || t('tiers.sansNumero')}</span>
                  <Pastille ton="ok">{t('tiers.reglees')}</Pastille>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
