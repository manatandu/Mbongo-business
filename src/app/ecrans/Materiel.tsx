/** Registre du matériel, du mobilier et des cautions (note 1), avec sortie du registre. */
import { useMemo, useState } from 'react';
import { calculerEtats, type LigneNote1 } from '../../moteur';
import { useLangue } from '../../i18n';
import { ErreurSaisie, sortirImmobilisation } from '../../donnees/saisie';
import { fmtDate, fmtMontant, lireMontant, lireTaux } from '../../ui/format';
import { Erreurs, Pastille } from '../composants';
import { db, useDossier } from '../session';

type Motif = 'vendu' | 'caution' | 'jete';

function Sortie({ ligne, fermer }: { ligne: LigneNote1; fermer: () => void }) {
  const { chargement, dateRef, taux, annoncer } = useDossier();
  const { t } = useLangue();
  const [motif, setMotif] = useState<Motif>(ligne.categorie === 'caution' ? 'caution' : 'vendu');
  const [prix, setPrix] = useState(ligne.categorie === 'caution' ? String(ligne.valeurNette) : '');
  const [compte, setCompte] = useState(chargement.comptes[0]?.id ?? '');
  const [tauxTexte, setTauxTexte] = useState(taux ? String(taux) : '');
  const [erreurs, setErreurs] = useState<string[]>([]);
  const c = chargement.comptes.find((x) => x.id === compte);
  const avecPrix = motif !== 'jete';

  async function valider() {
    const p = avecPrix ? lireMontant(prix, c?.devise ?? 'CDF') : 0;
    if (avecPrix && !(p && p > 0)) return setErreurs([t('saisir.erreur.montant')]);
    const tx = c?.devise === 'USD' ? lireTaux(tauxTexte) : null;
    if (avecPrix && c?.devise === 'USD' && !tx) return setErreurs([t('saisir.erreur.taux')]);
    try {
      await sortirImmobilisation(db, chargement.exercice.id, ligne.id, {
        date: dateRef,
        prix: p ?? 0,
        compte,
        taux: tx,
        libelle: `${motif === 'caution' ? t('materiel.motif.caution') : t('materiel.motif.vendu')} : ${ligne.designation}`,
      });
      annoncer(t('materiel.ok'));
      fermer();
    } catch (x) {
      setErreurs(x instanceof ErreurSaisie ? x.messages : [(x as Error).message]);
    }
  }

  return (
    <div className="actions">
      <label className="champ">
        {t('materiel.motif')}
        <select value={motif} onChange={(e) => setMotif(e.target.value as Motif)}>
          {ligne.categorie === 'caution' ? <option value="caution">{t('materiel.motif.caution')}</option> : <option value="vendu">{t('materiel.motif.vendu')}</option>}
          <option value="jete">{t('materiel.motif.jete')}</option>
        </select>
      </label>
      {avecPrix && (
        <div className="deux-col">
          <label className="champ">
            {t('materiel.prix')}
            <input inputMode="decimal" value={prix} onChange={(e) => setPrix(e.target.value)} />
          </label>
          <label className="champ">
            {t('tiers.surCompte')}
            <select value={compte} onChange={(e) => setCompte(e.target.value)}>
              {chargement.comptes.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.libelle}
                  {x.devise === 'USD' ? ' (USD)' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {avecPrix && c?.devise === 'USD' && (
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
          {t('commun.valider')}
        </button>
      </div>
    </div>
  );
}

export function Materiel() {
  const { chargement, dateRef } = useDossier();
  const { t } = useLangue();
  const [ouverte, setOuverte] = useState<string | null>(null);
  const note1 = useMemo(() => calculerEtats(chargement.dossier, { auDate: dateRef }).notes.note1, [chargement.dossier, dateRef]);

  return (
    <>
      <h2 className="titre-section">{t('materiel.titre')}</h2>
      <div className="liste">
        {note1.lignes.map((l) => (
          <div className="ligne" key={l.id}>
            <div className="l">
              <b style={{ fontWeight: 600 }}>{l.designation}</b> {l.categorie === 'caution' && <Pastille ton="info">{t('materiel.caution')}</Pastille>}
            </div>
            <span className="num">{fmtMontant(l.montant, 'CDF')}</span>
            <div className="meta">
              <span>{t('materiel.achat', { date: fmtDate(l.date) })}</span>
              {l.categorie !== 'caution' && (
                <span>
                  {t('materiel.dotation')} : {fmtMontant(l.dotation, 'CDF')}
                </span>
              )}
              <span>
                {t('materiel.reste')} : {fmtMontant(l.valeurNette, 'CDF')}
              </span>
              {l.dateSortie ? (
                <Pastille ton="ok">{t('materiel.sorti', { date: fmtDate(l.dateSortie) })}</Pastille>
              ) : (
                ouverte !== l.id && (
                  <button className="bouton discret petit" onClick={() => setOuverte(l.id)}>
                    {t('materiel.sortir')}
                  </button>
                )
              )}
            </div>
            {ouverte === l.id && <Sortie ligne={l} fermer={() => setOuverte(null)} />}
          </div>
        ))}
        {note1.lignes.length === 0 && (
          <div className="ligne">
            <div className="l aide">{t('materiel.vide')}</div>
          </div>
        )}
      </div>
    </>
  );
}
