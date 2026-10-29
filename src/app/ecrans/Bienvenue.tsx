/** Premier lancement : démonstration fictive ou création de l'entreprise. */
import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import type { SecteurSMT } from '../../moteur';
import { useLangue, type Cle } from '../../i18n';
import { chargerDemo } from '../../donnees/demo';
import { creerEntreprise, type CompteACreer } from '../../donnees/entreprise';
import { lireMontant, lireTaux } from '../../ui/format';
import { Erreurs, Marque } from '../composants';
import { db, useSession } from '../session';

function ChoixLangue() {
  const { langue, changer } = useLangue();
  return (
    <div className="seg deux" role="group" aria-label="Langue">
      <button aria-pressed={langue === 'fr'} onClick={() => changer('fr')}>
        Français
      </button>
      <button aria-pressed={langue === 'ln'} onClick={() => changer('ln')}>
        Lingala
      </button>
    </div>
  );
}

export function Bienvenue() {
  const { t } = useLangue();
  const { aujourdhui } = useSession();
  const [occupe, setOccupe] = useState(false);
  return (
    <div className="bienvenue">
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Marque />
        <div>
          <strong style={{ fontFamily: 'var(--display)', fontSize: 20 }}>{t('app.nom')}</strong>
          <div className="aide">{t('app.editeur')}</div>
        </div>
      </div>
      <h1>{t('bienvenue.titre')}</h1>
      <ChoixLangue />
      <div className="choix">
        <button
          className="carte-choix principal"
          disabled={occupe}
          onClick={() => {
            setOccupe(true);
            void chargerDemo(db, aujourdhui).finally(() => setOccupe(false));
          }}
        >
          <strong>{t('bienvenue.demo')}</strong>
        </button>
        <Link href="/creer" className="carte-choix">
          <strong>{t('bienvenue.creer')}</strong>
        </Link>
      </div>
    </div>
  );
}

interface ChoixCompte {
  cle: Cle;
  type: CompteACreer['type'];
  devise: CompteACreer['devise'];
  coche: boolean;
  solde: string;
}

const COMPTES_PROPOSES: ChoixCompte[] = [
  { cle: 'compte.caisse', type: 'caisse', devise: 'CDF', coche: true, solde: '' },
  { cle: 'compte.caisseUsd', type: 'caisse', devise: 'USD', coche: false, solde: '' },
  { cle: 'compte.mpesa', type: 'mobile', devise: 'CDF', coche: false, solde: '' },
  { cle: 'compte.orange', type: 'mobile', devise: 'CDF', coche: false, solde: '' },
  { cle: 'compte.airtel', type: 'mobile', devise: 'CDF', coche: false, solde: '' },
  { cle: 'compte.banque', type: 'banque', devise: 'CDF', coche: false, solde: '' },
  { cle: 'compte.tontine', type: 'tontine', devise: 'CDF', coche: false, solde: '' },
];

export function CreerEntreprise() {
  const { t } = useLangue();
  const { aujourdhui } = useSession();
  const [, aller] = useLocation();
  const [champs, setChamps] = useState({ nom: '', responsable: '', activite: '', commune: '', telephone: '', nif: '', stock: '', taux: '' });
  const [secteur, setSecteur] = useState<SecteurSMT>('negoce');
  const [comptes, setComptes] = useState(COMPTES_PROPOSES);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const champ = (k: keyof typeof champs) => ({ value: champs[k], onChange: (e: { target: { value: string } }) => setChamps((c) => ({ ...c, [k]: e.target.value })) });
  const dollarsOuverts = comptes.some((c) => c.coche && c.devise === 'USD' && (lireMontant(c.solde, 'USD') ?? 0) > 0);

  async function creer(e: FormEvent) {
    e.preventDefault();
    const err: string[] = [];
    if (!champs.nom.trim()) err.push(t('saisir.erreur.nom'));
    const choisis = comptes.filter((c) => c.coche || c.cle === 'compte.caisse');
    const soldes = choisis.map((c) => (c.solde.trim() ? lireMontant(c.solde, c.devise) : 0));
    if (soldes.some((s) => s === null)) err.push(t('saisir.erreur.montant'));
    const stock = champs.stock.trim() ? lireMontant(champs.stock, 'CDF') : 0;
    if (stock === null) err.push(t('saisir.erreur.montant'));
    const taux = dollarsOuverts ? lireTaux(champs.taux) : null;
    if (dollarsOuverts && !taux) err.push(t('saisir.erreur.taux'));
    setErreurs(err);
    if (err.length) return;
    try {
      await creerEntreprise(db, {
        nom: champs.nom,
        responsable: champs.responsable,
        activite: champs.activite,
        commune: champs.commune,
        telephone: champs.telephone,
        nif: champs.nif,
        secteur,
        annee: Number(aujourdhui.slice(0, 4)),
        comptes: choisis.map((c, i) => ({ type: c.type, devise: c.devise, libelle: t(c.cle), solde: soldes[i] ?? 0 })),
        stockInitial: stock ?? 0,
        tauxOuverture: taux,
      });
      aller('/');
    } catch (x) {
      setErreurs([(x as Error).message]);
    }
  }

  return (
    <form className="ecran" onSubmit={creer} noValidate>
      <Link href="/" className="lien-bouton">
        ← {t('commun.retour')}
      </Link>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 22, margin: 0 }}>{t('creer.titre')}</h1>
      <label className="champ">
        {t('creer.nom')}
        <input {...champ('nom')} autoComplete="organization" />
      </label>
      <label className="champ">
        {t('creer.secteur')}
        <select value={secteur} onChange={(e) => setSecteur(e.target.value as SecteurSMT)}>
          <option value="negoce">{t('secteur.negoce')}</option>
          <option value="artisanat">{t('secteur.artisanat')}</option>
          <option value="services">{t('secteur.services')}</option>
        </select>
      </label>

      <h2 className="titre-section">{t('creer.comptes')}</h2>
      {comptes.map((c, i) => (
        <div key={c.cle} className="case" style={{ alignItems: 'center' }}>
          <input
            type="checkbox"
            aria-label={t(c.cle)}
            checked={c.coche}
            disabled={c.cle === 'compte.caisse'}
            onChange={(e) => setComptes((cs) => cs.map((x, j) => (j === i ? { ...x, coche: e.target.checked } : x)))}
          />
          <span style={{ flex: 1 }}>{t(c.cle)}</span>
          {c.coche && (
            <input
              aria-label={`${t(c.cle)} : ${t('saisir.montant')}`}
              inputMode="decimal"
              placeholder={c.devise === 'USD' ? '0 USD' : '0 CDF'}
              value={c.solde}
              onChange={(e) => setComptes((cs) => cs.map((x, j) => (j === i ? { ...x, solde: e.target.value } : x)))}
              style={{ width: 130, border: '1px solid var(--line-strong)', borderRadius: 8, padding: '6px 8px', fontFamily: 'var(--mono)', background: 'var(--surface)', fontSize: 16 }}
            />
          )}
        </div>
      ))}
      {dollarsOuverts && (
        <label className="champ">
          {t('creer.taux')}
          <input {...champ('taux')} inputMode="decimal" />
        </label>
      )}
      <label className="champ">
        {t('creer.stock')}
        <input {...champ('stock')} inputMode="numeric" />
      </label>
      <details className="replie">
        <summary>{t('creer.facultatif')}</summary>
        <div className="replie-contenu">
          <label className="champ">
            {t('creer.responsable')}
            <input {...champ('responsable')} autoComplete="name" />
          </label>
          <label className="champ">
            {t('creer.telephone')}
            <input {...champ('telephone')} inputMode="tel" autoComplete="tel" />
          </label>
          <label className="champ">
            {t('creer.activite')}
            <input {...champ('activite')} />
          </label>
          <label className="champ">
            {t('creer.commune')}
            <input {...champ('commune')} />
          </label>
          <label className="champ">
            {t('creer.nif')}
            <input {...champ('nif')} />
          </label>

        </div>
      </details>
      <Erreurs messages={erreurs} />
      <button className="bouton" type="submit">
        {t('creer.valider')}
      </button>
    </form>
  );
}
