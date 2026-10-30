/** Stock : fiches de stock (entrées, sorties, valorisation) et inventaire de fin d'exercice (note 2). */
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { useLangue } from '../../i18n';
import { enregistrerInventaire, ErreurSaisie, validerInventaire } from '../../donnees/saisie';
import { fmt, fmtMontant, lireMontant } from '../../ui/format';
import { fichesStock } from '../../donnees/stock';
import { Erreurs } from '../composants';
import { FichesStock, lireQuantite } from './FichesStock';
import { db, useDossier } from '../session';

interface Brouillon {
  designation: string;
  quantite: string;
  /** Prix d'achat unitaire ; pour un travail en cours, ce qu'il a déjà coûté. */
  prix: string;
  travaux?: boolean;
}

export function Stock() {
  const { t } = useLangue();
  const params = useParams<{ onglet?: string }>();
  const [onglet, setOnglet] = useState<'fiches' | 'inventaire'>(params.onglet === 'inventaire' ? 'inventaire' : 'fiches');
  return (
    <>
      <div className="seg deux" role="group">
        <button aria-pressed={onglet === 'fiches'} onClick={() => setOnglet('fiches')}>
          {t('stock.onglet.fiches')}
        </button>
        <button aria-pressed={onglet === 'inventaire'} onClick={() => setOnglet('inventaire')}>
          {t('stock.onglet.inventaire')}
        </button>
      </div>
      {onglet === 'fiches' ? <FichesStock /> : <Inventaire />}
    </>
  );
}

function Inventaire() {
  const { chargement, annoncer, entreprise, aujourdhui } = useDossier();
  const { t } = useLangue();
  const { exercice } = chargement;
  const fiches = useLiveQuery(() => fichesStock(db, entreprise.id, exercice.fin), [entreprise.id, exercice.fin]);
  const enregistrees = useLiveQuery(() => db.inventaires.where('exerciceId').equals(exercice.id).sortBy('ordre'), [exercice.id]);
  const [lignes, setLignes] = useState<Brouillon[] | null>(null);
  const [erreurs, setErreurs] = useState<string[]>([]);

  useEffect(() => {
    if (enregistrees && lignes === null) {
      setLignes(
        enregistrees.length
          ? enregistrees.map((l) => ({ designation: l.designation, quantite: String(l.quantite).replace('.', ','), prix: String(l.prixUnitaire), ...(l.travauxEnCours ? { travaux: true } : {}) }))
          : [{ designation: '', quantite: '', prix: '' }],
      );
    }
  }, [enregistrees, lignes]);

  const valide = exercice.stockFinal !== null;
  const calculees = (lignes ?? []).map((l, i) => {
    const q = l.travaux ? 1 : lireQuantite(l.quantite);
    const p = lireMontant(l.prix, 'CDF');
    return { ...l, i, q, p, montant: q !== null && p !== null ? Math.round(q * p) : null };
  });
  const total = calculees.reduce((s, l) => s + (l.montant ?? 0), 0);
  const modifier = (i: number, champ: keyof Brouillon, v: string) => setLignes((ls) => (ls ?? []).map((l, j) => (j === i ? { ...l, [champ]: v } : l)));

  async function garder(): Promise<boolean> {
    const utiles = calculees.filter((l) => l.designation.trim());
    if (utiles.some((l) => l.montant === null)) {
      setErreurs([t('saisir.erreur.montant')]);
      return false;
    }
    // Références de la note 2 : S1, S2… pour le stock, T1, T2… pour les travaux en cours.
    let ns = 0;
    let nt = 0;
    try {
      await enregistrerInventaire(
        db,
        exercice.id,
        utiles.map((l) => ({
          reference: l.travaux ? `T${++nt}` : `S${++ns}`,
          designation: l.designation.trim(),
          quantite: l.q ?? 0,
          prixUnitaire: l.p ?? 0,
          montant: l.montant ?? 0,
          ...(l.travaux ? { travauxEnCours: true } : {}),
        })),
      );
      setErreurs([]);
      return true;
    } catch (x) {
      setErreurs(x instanceof ErreurSaisie ? x.messages : [(x as Error).message]);
      return false;
    }
  }

  async function valider() {
    if (!window.confirm(t('stock.confirmer'))) return;
    if (!(await garder())) return;
    try {
      await validerInventaire(db, exercice.id, aujourdhui);
      annoncer(t('stock.ok'));
    } catch (x) {
      setErreurs(x instanceof ErreurSaisie ? x.messages : [(x as Error).message]);
    }
  }

  return (
    <>
      <div className="kpis" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="kpi">
          <div className="n">{t('stock.initial')}</div>
          <div className="v">{fmt(exercice.stockInitial)}</div>
        </div>
        <div className="kpi">
          <div className="n">{t('stock.total')}</div>
          <div className="v">{fmt(valide ? (exercice.stockFinal ?? 0) : total)}</div>
        </div>
      </div>
      {valide ? (
        <>
          <div className="tampon ok">{t('stock.valide', { total: fmtMontant(exercice.stockFinal ?? 0, 'CDF') })}</div>
          <div className="tableau">
            <table>
              <thead>
                <tr>
                  <th>{t('stock.designation')}</th>
                  <th className="d">{t('stock.quantite')}</th>
                  <th className="d">{t('stock.prix')}</th>
                  <th className="d">CDF</th>
                </tr>
              </thead>
              <tbody>
                {(enregistrees ?? []).map((l) => (
                  <tr key={l.id}>
                    <td>{l.designation}</td>
                    <td className="d num">{l.travauxEnCours ? '' : String(l.quantite).replace('.', ',')}</td>
                    <td className="d num">{l.travauxEnCours ? t('stock.travail') : fmt(l.prixUnitaire)}</td>
                    <td className="d num">{fmt(l.montant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="liste">
            {calculees.filter((l) => !l.travaux).map((l) => (
              <div className="ligne" key={l.i} style={{ gridTemplateColumns: '1fr' }}>
                <label className="champ">
                  {t('stock.designation')}
                  <input value={l.designation} onChange={(e) => modifier(l.i, 'designation', e.target.value)} />
                </label>
                <div className="deux-col">
                  <label className="champ">
                    {t('stock.quantite')}
                    <input inputMode="decimal" value={l.quantite} onChange={(e) => modifier(l.i, 'quantite', e.target.value)} />
                  </label>
                  <label className="champ">
                    {t('stock.prix')}
                    <input inputMode="numeric" value={l.prix} onChange={(e) => modifier(l.i, 'prix', e.target.value)} />
                  </label>
                </div>
                <div className="meta">
                  <span className="num">{l.montant !== null ? fmtMontant(l.montant, 'CDF') : ''}</span>
                  <button className="lien-bouton" onClick={() => setLignes((ls) => (ls ?? []).filter((_, j) => j !== l.i))}>
                    {t('stock.retirer')}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {(fiches?.fiches.length ?? 0) > 0 && (
            <>
              <button
                className="bouton discret"
                onClick={() =>
                  setLignes((ls) => [
                    ...(fiches?.fiches ?? [])
                      .filter((f) => f.etat.quantite > 0)
                      .map((f) => ({
                        designation: f.article.unite ? `${f.article.designation} (${f.article.unite})` : f.article.designation,
                        quantite: String(f.etat.quantite).replace('.', ','),
                        prix: String(Math.round(f.etat.coutUnitaire)),
                      })),
                    ...(ls ?? []).filter((l) => l.travaux),
                  ])
                }
              >
                {t('stock.reprendre')}
              </button>
              <p className="aide">{t('stock.aideReprendre')}</p>
            </>
          )}
          <button className="bouton discret" onClick={() => setLignes((ls) => [...(ls ?? []), { designation: '', quantite: '', prix: '' }])}>
            {t('stock.ajouter')}
          </button>
          {/* AUDCIF, art. 43 : valeur actuelle plus basse que le coût d'entrée. */}
          <p className="aide">{t('stock.aideAbime')}</p>

          <h2 className="titre-section">{t('stock.travaux')}</h2>
          <p className="aide">{t('stock.aideTravaux')}</p>
          {calculees.some((l) => l.travaux) && (
            <div className="liste">
              {calculees
                .filter((l) => l.travaux)
                .map((l) => (
                  <div className="ligne" key={l.i} style={{ gridTemplateColumns: '1fr' }}>
                    <>
                      <label className="champ">
                        {t('stock.travail')}
                        <input value={l.designation} onChange={(e) => modifier(l.i, 'designation', e.target.value)} />
                      </label>
                      <label className="champ">
                        {t('stock.valeurTravail')}
                        <input inputMode="numeric" value={l.prix} onChange={(e) => modifier(l.i, 'prix', e.target.value)} />
                      </label>
                    </>
                    <div className="meta">
                      <span />
                      <button className="lien-bouton" onClick={() => setLignes((ls) => (ls ?? []).filter((_, j) => j !== l.i))}>
                        {t('stock.retirer')}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
          <button className="bouton discret" onClick={() => setLignes((ls) => [...(ls ?? []), { designation: '', quantite: '1', prix: '', travaux: true }])}>
            {t('stock.ajouterTravail')}
          </button>

          <Erreurs messages={erreurs} />
          <div className="duo">
            <button className="bouton discret" onClick={() => void garder().then((ok) => ok && annoncer(t('stock.okBrouillon')))}>
              {t('stock.brouillon')}
            </button>
            <button className="bouton" onClick={() => void valider()}>
              {t('stock.valider')}
            </button>
          </div>
        </>
      )}
    </>
  );
}
