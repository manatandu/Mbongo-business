/** Inventaire du stock de fin d'exercice (note 2). Brouillon modifiable, puis validation par le commerçant. */
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useLangue } from '../../i18n';
import { enregistrerInventaire, ErreurSaisie, validerInventaire } from '../../donnees/saisie';
import { fmt, fmtMontant, lireMontant } from '../../ui/format';
import { Erreurs } from '../composants';
import { db, useDossier } from '../session';

interface Brouillon {
  designation: string;
  quantite: string;
  prix: string;
}

const lireQuantite = (s: string): number | null => {
  const n = Number(s.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export function Stock() {
  const { chargement, annoncer } = useDossier();
  const { t } = useLangue();
  const { exercice } = chargement;
  const enregistrees = useLiveQuery(() => db.inventaires.where('exerciceId').equals(exercice.id).sortBy('ordre'), [exercice.id]);
  const [lignes, setLignes] = useState<Brouillon[] | null>(null);
  const [erreurs, setErreurs] = useState<string[]>([]);

  useEffect(() => {
    if (enregistrees && lignes === null) {
      setLignes(enregistrees.length ? enregistrees.map((l) => ({ designation: l.designation, quantite: String(l.quantite).replace('.', ','), prix: String(l.prixUnitaire) })) : [{ designation: '', quantite: '', prix: '' }]);
    }
  }, [enregistrees, lignes]);

  const valide = exercice.stockFinal !== null;
  const calculees = (lignes ?? []).map((l, i) => {
    const q = lireQuantite(l.quantite);
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
    try {
      await enregistrerInventaire(
        db,
        exercice.id,
        utiles.map((l, k) => ({ reference: `L${k + 1}`, designation: l.designation.trim(), quantite: l.q ?? 0, prixUnitaire: l.p ?? 0, montant: l.montant ?? 0 })),
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
    await validerInventaire(db, exercice.id);
    annoncer(t('stock.ok'));
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
                    <td className="d num">{String(l.quantite).replace('.', ',')}</td>
                    <td className="d num">{fmt(l.prixUnitaire)}</td>
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
            {calculees.map((l) => (
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
          <button className="bouton discret" onClick={() => setLignes((ls) => [...(ls ?? []), { designation: '', quantite: '', prix: '' }])}>
            {t('stock.ajouter')}
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
