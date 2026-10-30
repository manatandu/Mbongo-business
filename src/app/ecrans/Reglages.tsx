/** Langue, installation sur le téléphone, code d'accès, copie de sauvegarde, démonstration. */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { useLangue } from '../../i18n';
import { chargerDemo } from '../../donnees/demo';
import { retirerEntreprise } from '../../donnees/entreprise';
import { SITE_TRK } from '../../donnees/parametres';
import { derniereCopie, faireCopie, reprendreCopie } from '../../donnees/copie';
import { codeDefini, definirCode } from '../../donnees/reglages';
import { Erreurs } from '../composants';
import { MesComptes } from './Comptes';
import { ChoixMethodeStock } from './FichesStock';
import { installer, useInstallation } from '../installation';
import { db, useDossier } from '../session';

async function telechargerCopie(entrepriseId: string, nom: string, jour: string): Promise<void> {
  const copie = await faireCopie(db, entrepriseId);
  const url = URL.createObjectURL(new Blob([JSON.stringify(copie, null, 1)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `mbongo-${nom.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${jour}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Bouton qui ouvre un fichier de copie et le reprend. */
export function ReprendreCopie({ classe, apres }: { classe: string; apres?: () => void }) {
  const { t } = useLangue();
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  async function lire(f: File | undefined) {
    if (!f) return;
    try {
      const n = await reprendreCopie(db, await f.text());
      setErreur(null);
      setMessage(t('copie.reprise', { n }));
      apres?.();
    } catch (x) {
      setErreur((x as Error).message);
    }
  }
  return (
    <>
      <label className={classe}>
        <strong>{t('copie.reprendre')}</strong>
        <input type="file" accept="application/json,.json" hidden onChange={(e) => void lire(e.target.files?.[0])} />
      </label>
      {message && <p className="aide">{message}</p>}
      {erreur && <p className="erreur">{erreur}</p>}
    </>
  );
}

export function Reglages() {
  const { entreprise, aujourdhui, annoncer } = useDossier();
  const { t, langue, changer } = useLangue();
  const [, aller] = useLocation();
  const [code, setCode] = useState('');
  const [erreurs, setErreurs] = useState<string[]>([]);
  const aCode = useLiveQuery(() => codeDefini(db), []);
  const appli = useInstallation();
  const copieLe = useLiveQuery(() => derniereCopie(db, entreprise.id), [entreprise.id]);
  const nonEnvoyees = useLiveQuery(() => db.operations.where('entrepriseId').equals(entreprise.id).filter((o) => o.envoi === 'local').count(), [entreprise.id]);

  async function enregistrerCode() {
    try {
      await definirCode(db, code);
      setCode('');
      setErreurs([]);
      annoncer(t('reglages.codeOk'));
    } catch (x) {
      setErreurs([(x as Error).message]);
    }
  }

  return (
    <>
      <MesComptes />

      <h2 className="titre-section">{t('reglages.langue')}</h2>
      <div className="seg deux" role="group" aria-label={t('reglages.langue')}>
        <button aria-pressed={langue === 'fr'} onClick={() => changer('fr')}>
          Français
        </button>
        <button aria-pressed={langue === 'ln'} onClick={() => changer('ln')}>
          Lingala
        </button>
      </div>

      <h2 className="titre-section">{t('reglages.telephone')}</h2>
      <p className="aide">{appli.installee ? t('reglages.installee') : appli.horsLignePret ? t('reglages.horsLigne') : t('reglages.horsLignePasEncore')}</p>
      {appli.peutInstaller && !appli.installee && (
        <button className="bouton" onClick={() => void installer()}>
          {t('reglages.installer')}
        </button>
      )}
      {appli.iphone && !appli.installee && <p className="aide">{t('reglages.installerIphone')}</p>}

      <h2 className="titre-section">{t('reglages.code')}</h2>
      {aCode ? (
        <button
          className="bouton discret"
          onClick={() =>
            void definirCode(db, null).then(() => {
              annoncer(t('reglages.codeRetire'));
            })
          }
        >
          {t('reglages.codeRetirer')}
        </button>
      ) : (
        <div className="deux-col">
          <label className="champ">
            {t('reglages.codeNouveau')}
            <input inputMode="numeric" type="password" maxLength={4} autoComplete="new-password" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </label>
          <button className="bouton" style={{ alignSelf: 'end' }} disabled={code.length !== 4} onClick={() => void enregistrerCode()}>
            {t('reglages.codeDefinir')}
          </button>
        </div>
      )}
      <Erreurs messages={erreurs} />

      <ChoixMethodeStock />

      <h2 className="titre-section">{t('reglages.donnees')}</h2>
      <p className="aide">
        {copieLe ? t('copie.derniere', { n: Math.max(0, Math.round((Date.parse(aujourdhui) - Date.parse(copieLe.slice(0, 10))) / 86_400_000)) }) : t('copie.jamais')} {t('copie.photos')}
      </p>
      <button className="bouton discret" onClick={() => void telechargerCopie(entreprise.id, entreprise.nom, aujourdhui)}>
        {t('reglages.copie')}
      </button>
      <ReprendreCopie classe="bouton discret" />

      {entreprise.demo && (
        <>
          <h2 className="titre-section">{t('reglages.demo')}</h2>
          <button
            className="bouton discret"
            onClick={() =>
              void chargerDemo(db, aujourdhui).then(() => {
                annoncer(t('reglages.demoOk'));
                aller('/');
              })
            }
          >
            {t('reglages.demoRecharger')}
          </button>
          <button
            className="bouton discret"
            onClick={() =>
              void chargerDemo(db, aujourdhui, true).then(() => {
                annoncer(t('reglages.demoOk'));
                aller('/');
              })
            }
          >
            {t('reglages.demoFinAnnee')}
          </button>
          <button
            className="bouton danger"
            onClick={() =>
              void retirerEntreprise(db, entreprise.id).then(() => {
                aller('/');
              })
            }
          >
            {t('reglages.demoQuitter')}
          </button>
        </>
      )}

      <h2 className="titre-section">{t('reglages.apropos')}</h2>
      <p className="aide">
        Mbongo Business · {t('app.editeur')}
      </p>
      <a className="bouton discret" href={SITE_TRK} target="_blank" rel="noopener">
        {t('reglages.site')}
      </a>
    </>
  );
}
