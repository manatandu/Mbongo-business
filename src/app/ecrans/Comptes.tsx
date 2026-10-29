/** Mes comptes : caisses, banques, mobiles money et tontines, autant qu'il en faut, chacun dans sa devise. */
import { useState, type FormEvent } from 'react';
import type { Devise, TypeCompte } from '../../moteur';
import { useLangue, type Cle } from '../../i18n';
import { ajouterCompte, BANQUES, MOBILE_MONEY } from '../../donnees/entreprise';
import { lireMontant } from '../../ui/format';
import { Erreurs } from '../composants';
import { db, useDossier } from '../session';

const AUTRE = '__autre';

export function MesComptes() {
  const { t } = useLangue();
  const { chargement, entreprise, annoncer } = useDossier();
  const { comptes, exercice } = chargement;
  const [ouvert, setOuvert] = useState(false);
  const [type, setType] = useState<TypeCompte>('banque');
  const [choix, setChoix] = useState<string>(BANQUES[0]);
  const [nom, setNom] = useState('');
  const [devise, setDevise] = useState<Devise>('CDF');
  const [solde, setSolde] = useState('');
  const [erreurs, setErreurs] = useState<string[]>([]);

  const liste: readonly string[] = type === 'banque' ? BANQUES : type === 'mobile' ? MOBILE_MONEY : [];
  const libre = liste.length === 0 || choix === AUTRE;

  const changerType = (nouveau: TypeCompte) => {
    setType(nouveau);
    setChoix(nouveau === 'banque' ? BANQUES[0] : nouveau === 'mobile' ? MOBILE_MONEY[0] : AUTRE);
    setNom('');
  };

  async function ajouter(e: FormEvent) {
    e.preventDefault();
    const s = solde.trim() ? lireMontant(solde, devise) : 0;
    if (s === null) return setErreurs([t('saisir.erreur.montant')]);
    const libelle = libre ? nom : nom.trim() ? `${choix}, ${nom.trim()}` : choix;
    try {
      await ajouterCompte(db, entreprise.id, exercice.id, { type, libelle, devise, solde: s });
      setErreurs([]);
      setNom('');
      setSolde('');
      setOuvert(false);
      annoncer(t('compte.ok'));
    } catch (x) {
      setErreurs([(x as Error).message]);
    }
  }

  return (
    <>
      <h2 className="titre-section">{t('reglages.comptes')}</h2>
      <ul className="liste-comptes">
        {comptes.map((c) => (
          <li key={c.id}>
            <span>{c.libelle}</span>
            <span className="aide">
              {t(`compte.type.${c.type}` as Cle)} · {c.devise}
            </span>
          </li>
        ))}
      </ul>
      {!ouvert ? (
        <button className="bouton discret" onClick={() => setOuvert(true)}>
          + {t('compte.ajouter')}
        </button>
      ) : (
        <form className="encart-form" onSubmit={(e) => void ajouter(e)} noValidate>
          <div className="deux-col">
            <label className="champ">
              {t('compte.type')}
              <select value={type} onChange={(e) => changerType(e.target.value as TypeCompte)}>
                {(['caisse', 'banque', 'mobile', 'tontine'] as const).map((k) => (
                  <option key={k} value={k}>
                    {t(`compte.type.${k}` as Cle)}
                  </option>
                ))}
              </select>
            </label>
            {liste.length > 0 && (
              <label className="champ">
                {t('compte.etablissement')}
                <select value={choix} onChange={(e) => setChoix(e.target.value)}>
                  {liste.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                  <option value={AUTRE}>{t('compte.autre')}</option>
                </select>
              </label>
            )}
          </div>
          <label className="champ">
            {libre ? t('compte.nom') : t('compte.precision')}
            <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={libre ? t(`compte.exemple.${type}` as Cle) : t('saisir.facultatif')} />
          </label>
          <div className="deux-col">
            <label className="champ">
              {t('compte.devise')}
              <select value={devise} onChange={(e) => setDevise(e.target.value as Devise)}>
                <option value="CDF">CDF</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label className="champ">
              {t('compte.solde')}
              <input inputMode="decimal" placeholder="0" value={solde} onChange={(e) => setSolde(e.target.value)} />
            </label>
          </div>
          <p className="aide">{t('compte.aideSolde')}</p>
          <Erreurs messages={erreurs} />
          <div className="deux-col">
            <button className="bouton discret" type="button" onClick={() => setOuvert(false)}>
              {t('commun.annuler')}
            </button>
            <button className="bouton" type="submit">
              {t('compte.ajouter')}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
