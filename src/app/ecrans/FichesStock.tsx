/** Fiches de stock : les articles, ce qui entre (achats) et ce qui sort (ventes, consommation, pertes), valorisés. */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { LIBELLE_METHODE, valoriser, type MethodeValorisation } from '../../moteur';
import { useLangue, type Cle } from '../../i18n';
import { ErreurSaisie } from '../../donnees/saisie';
import { creerArticle, definirMethodeStock, enregistrerMouvement, fichesStock, methodeStock, mouvementsArticle } from '../../donnees/stock';
import type { MotifMouvement } from '../../donnees/types';
import { fmt, fmtDate, lireMontant } from '../../ui/format';
import { Erreurs } from '../composants';
import { db, useDossier } from '../session';

export const lireQuantite = (s: string): number | null => {
  const n = Number(s.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const qte = (n: number) => String(Math.round(n * 1000) / 1000).replace('.', ',');

const MOTIFS_ENTREE: MotifMouvement[] = ['achat', 'ajustement'];
const MOTIFS_SORTIE: MotifMouvement[] = ['vente', 'consommation', 'perte', 'ajustement'];

function Fiche({ articleId, unite, fermer }: { articleId: string; unite: string; fermer: () => void }) {
  const { t } = useLangue();
  const { entreprise, dateRef, annoncer, chargement } = useDossier();
  const mouvements = useLiveQuery(() => mouvementsArticle(db, articleId), [articleId]);
  const methode = useLiveQuery(() => methodeStock(db, entreprise.id), [entreprise.id]);
  const [sens, setSens] = useState<'entree' | 'sortie'>('sortie');
  const [date, setDate] = useState(dateRef);
  const [quantite, setQuantite] = useState('');
  const [prix, setPrix] = useState('');
  const [motif, setMotif] = useState<MotifMouvement>('vente');
  const [erreurs, setErreurs] = useState<string[]>([]);
  if (!mouvements || !methode) return null;
  const etat = valoriser(mouvements, methode);
  // Valeur de chaque sortie, dans l'ordre où le moteur les a calculées.
  let k = 0;

  async function enregistrer(e: FormEvent) {
    e.preventDefault();
    const q = lireQuantite(quantite);
    const p = sens === 'entree' ? lireMontant(prix, 'CDF') : 0;
    if (!q || (sens === 'entree' && p === null)) return setErreurs([t('saisir.erreur.montant')]);
    if (date > dateRef) return setErreurs([t('saisir.erreur.dateFuture')]);
    try {
      await enregistrerMouvement(db, entreprise.id, {
        articleId,
        date,
        sens,
        quantite: q,
        ...(sens === 'entree' ? { prixUnitaire: p ?? 0 } : {}),
        motif,
      });
      setErreurs([]);
      setQuantite('');
      setPrix('');
      annoncer(t('fiche.ok'));
    } catch (x) {
      setErreurs(x instanceof ErreurSaisie ? x.messages : [(x as Error).message]);
    }
  }

  return (
    <div className="encart-form">
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="kpi">
          <div className="n">{t('fiche.enStock')}</div>
          <div className="v">
            {qte(etat.quantite)} {unite}
          </div>
        </div>
        <div className="kpi">
          <div className="n">{t('fiche.cout')}</div>
          <div className="v">{fmt(Math.round(etat.coutUnitaire))}</div>
        </div>
        <div className="kpi">
          <div className="n">{t('fiche.valeur')}</div>
          <div className="v">{fmt(etat.valeur)}</div>
        </div>
      </div>
      <div className="tableau">
        <table>
          <thead>
            <tr>
              <th>{t('saisir.date')}</th>
              <th>{t('fiche.mouvement')}</th>
              <th className="d">{t('stock.quantite')}</th>
              <th className="d">CDF</th>
            </tr>
          </thead>
          <tbody>
            {[...mouvements]
              .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.sens === b.sens ? 0 : a.sens === 'entree' ? -1 : 1))
              .map((m) => (
                <tr key={m.id}>
                  <td>{fmtDate(m.date)}</td>
                  <td>{t(`fiche.motif.${m.motif}` as Cle)}</td>
                  <td className="d num">{(m.sens === 'entree' ? '+ ' : '− ') + qte(m.quantite)}</td>
                  <td className="d num">{m.sens === 'entree' ? fmt(Math.round(m.quantite * (m.prixUnitaire ?? 0))) : fmt(etat.sorties[k++]?.valeur ?? 0)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {chargement.exercice.statut === 'ouvert' && (
        <form onSubmit={(e) => void enregistrer(e)} noValidate>
          <div className="seg deux" role="group">
            <button
              type="button"
              className="t-in"
              aria-pressed={sens === 'entree'}
              onClick={() => {
                setSens('entree');
                setMotif('achat');
              }}
            >
              {t('fiche.entree')}
            </button>
            <button
              type="button"
              className="t-out"
              aria-pressed={sens === 'sortie'}
              onClick={() => {
                setSens('sortie');
                setMotif('vente');
              }}
            >
              {t('fiche.sortie')}
            </button>
          </div>
          <div className="deux-col">
            <label className="champ">
              {t('saisir.date')}
              <input type="date" value={date} max={dateRef} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="champ">
              {t('fiche.motif')}
              <select value={motif} onChange={(e) => setMotif(e.target.value as MotifMouvement)}>
                {(sens === 'entree' ? MOTIFS_ENTREE : MOTIFS_SORTIE).map((m) => (
                  <option key={m} value={m}>
                    {t(`fiche.motif.${m}` as Cle)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="deux-col">
            <label className="champ">
              {t('stock.quantite')} {unite && `(${unite})`}
              <input inputMode="decimal" value={quantite} onChange={(e) => setQuantite(e.target.value)} />
            </label>
            {sens === 'entree' && (
              <label className="champ">
                {t('stock.prix')}
                <input inputMode="numeric" value={prix} onChange={(e) => setPrix(e.target.value)} />
              </label>
            )}
          </div>
          <Erreurs messages={erreurs} />
          <div className="deux-col">
            <button type="button" className="bouton discret" onClick={fermer}>
              {t('commun.fermer')}
            </button>
            <button className="bouton">{t('saisir.enregistrer')}</button>
          </div>
        </form>
      )}
    </div>
  );
}

function NouvelArticle({ fermer }: { fermer: () => void }) {
  const { t } = useLangue();
  const { entreprise, chargement, annoncer } = useDossier();
  const [designation, setDesignation] = useState('');
  const [unite, setUnite] = useState('');
  const [quantite, setQuantite] = useState('');
  const [prix, setPrix] = useState('');
  const [erreurs, setErreurs] = useState<string[]>([]);

  async function creer(e: FormEvent) {
    e.preventDefault();
    const q = quantite.trim() ? lireQuantite(quantite) : 0;
    const p = prix.trim() ? lireMontant(prix, 'CDF') : 0;
    if (q === null || p === null) return setErreurs([t('saisir.erreur.montant')]);
    try {
      await creerArticle(db, entreprise.id, {
        designation,
        unite,
        quantite: q,
        prixUnitaire: p,
        date: chargement.exercice.debut,
      });
      annoncer(t('fiche.okArticle'));
      fermer();
    } catch (x) {
      setErreurs(x instanceof ErreurSaisie ? x.messages : [(x as Error).message]);
    }
  }

  return (
    <form className="encart-form" onSubmit={(e) => void creer(e)} noValidate>
      <div className="deux-col">
        <label className="champ">
          {t('stock.designation')}
          <input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder={t('fiche.exemple')} />
        </label>
        <label className="champ">
          {t('fiche.unite')}
          <input value={unite} onChange={(e) => setUnite(e.target.value)} placeholder={t('fiche.exempleUnite')} />
        </label>
      </div>
      <div className="deux-col">
        <label className="champ">
          {t('fiche.depart')}
          <input inputMode="decimal" placeholder="0" value={quantite} onChange={(e) => setQuantite(e.target.value)} />
        </label>
        <label className="champ">
          {t('stock.prix')}
          <input inputMode="numeric" placeholder="0" value={prix} onChange={(e) => setPrix(e.target.value)} />
        </label>
      </div>
      <Erreurs messages={erreurs} />
      <div className="deux-col">
        <button type="button" className="bouton discret" onClick={fermer}>
          {t('commun.annuler')}
        </button>
        <button className="bouton">{t('fiche.creer')}</button>
      </div>
    </form>
  );
}

/** Méthode de valorisation, dans Réglages : le CUMP s'applique par défaut, on n'y touche qu'avec l'expert-comptable. */
export function ChoixMethodeStock() {
  const { t } = useLangue();
  const { entreprise } = useDossier();
  const methode = useLiveQuery(() => methodeStock(db, entreprise.id), [entreprise.id]);
  if (!methode) return null;
  return (
    <>
      <h2 className="titre-section">{t('fiche.methode')}</h2>
      <label className="champ">
        <select value={methode} onChange={(e) => void definirMethodeStock(db, entreprise.id, e.target.value as MethodeValorisation)} aria-label={t('fiche.methode')}>
          {(Object.keys(LIBELLE_METHODE) as MethodeValorisation[]).map((m) => (
            <option key={m} value={m}>
              {LIBELLE_METHODE[m]}
            </option>
          ))}
        </select>
      </label>
      <p className="aide">{t('fiche.aideMethode')}</p>
    </>
  );
}

export function FichesStock() {
  const { t } = useLangue();
  const { entreprise, dateRef } = useDossier();
  const donnees = useLiveQuery(() => fichesStock(db, entreprise.id, dateRef), [entreprise.id, dateRef]);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [nouvel, setNouvel] = useState(false);
  if (!donnees) return null;
  const total = donnees.fiches.reduce((s, f) => s + f.etat.valeur, 0);

  return (
    <>
      <p className="aide">{t('fiche.aide')}</p>

      {donnees.fiches.length === 0 && !nouvel && <p className="aide">{t('fiche.vide')}</p>}
      {donnees.fiches.length > 0 && (
        <div className="liste">
          {donnees.fiches.map(({ article, etat }) => (
            <div key={article.id}>
              <button className="ligne-fiche" aria-expanded={ouverte === article.id} onClick={() => setOuverte(ouverte === article.id ? null : article.id)}>
                <span>
                  <strong>{article.designation}</strong>
                  <small>
                    {qte(etat.quantite)} {article.unite} · {fmt(Math.round(etat.coutUnitaire))} CDF
                  </small>
                </span>
                <span className="num">{fmt(etat.valeur)}</span>
              </button>
              {ouverte === article.id && <Fiche articleId={article.id} unite={article.unite} fermer={() => setOuverte(null)} />}
            </div>
          ))}
          <div className="ligne-fiche total">
            <span>{t('fiche.total')}</span>
            <span className="num">{fmt(total)}</span>
          </div>
        </div>
      )}
      {nouvel ? (
        <NouvelArticle fermer={() => setNouvel(false)} />
      ) : (
        <button className="bouton discret" onClick={() => setNouvel(true)}>
          + {t('fiche.nouvel')}
        </button>
      )}
    </>
  );
}
