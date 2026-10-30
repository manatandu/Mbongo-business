/** Langue, installation sur le téléphone, code d'accès, copie de sauvegarde, démonstration. */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { useLangue } from '../../i18n';
import { chargerDemo } from '../../donnees/demo';
import { retirerEntreprise } from '../../donnees/entreprise';
import { SITE_TRK } from '../../donnees/parametres';
import { derniereCopie, faireCopie, reprendreCopie } from '../../donnees/copie';
import { enAttente, envoyer, liaison, relier } from '../../donnees/envoi';
import { codeDefini, definirCode } from '../../donnees/reglages';
import { fmtDate } from '../../ui/format';
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
        {classe.includes('carte') ? <strong>{t('copie.reprendre')}</strong> : t('copie.reprendre')}
        <input type="file" accept="application/json,.json" hidden onChange={(e) => void lire(e.target.files?.[0])} />
      </label>
      {message && <p className="aide">{message}</p>}
      {erreur && <p className="erreur">{erreur}</p>}
    </>
  );
}

/** Liaison avec TRK Consulting : le code client une fois, puis l'envoi se fait seul. */
function LienTrk() {
  const { entreprise, annoncer } = useDossier();
  const { t } = useLangue();
  const lien = useLiveQuery(() => liaison(db, entreprise.id), [entreprise.id]);
  const attente = useLiveQuery(() => enAttente(db, entreprise.id), [entreprise.id]);
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  async function agir(f: () => Promise<unknown>, ok: string) {
    setOccupe(true);
    try {
      await f();
      setErreur(null);
      annoncer(ok);
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setOccupe(false);
    }
  }

  if (lien === undefined) return null;
  return (
    <>
      <h2 className="titre-section">{t('lien.titre')}</h2>
      {lien ? (
        <>
          <p className="aide">
            {t('lien.relie', { client: lien.client })} {lien.dernierEnvoi ? t('lien.dernier', { date: fmtDate(lien.dernierEnvoi.slice(0, 10)) }) : ''}{' '}
            {attente ? t('lien.attente', { n: attente }) : t('lien.ajour')}
          </p>
          {attente ? (
            <button className="bouton discret" disabled={occupe} onClick={() => void agir(() => envoyer(db, entreprise.id), t('lien.envoye'))}>
              {t('lien.envoyer')}
            </button>
          ) : null}
        </>
      ) : (
        <div className="deux-col">
          <label className="champ">
            {t('lien.code')}
            <input autoCapitalize="characters" autoComplete="off" placeholder="KX7P-29QD" value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          <button
            className="bouton"
            style={{ alignSelf: 'end' }}
            disabled={occupe || code.replace(/[^A-Za-z0-9]/g, '').length !== 8}
            onClick={() => void agir(async () => (await relier(db, entreprise.id, code), await envoyer(db, entreprise.id)), t('lien.ok'))}
          >
            {t('lien.relier')}
          </button>
        </div>
      )}
      {erreur && <p className="erreur">{erreur}</p>}
    </>
  );
}

export function Reglages() {
  const { entreprise, aujourdhui, annoncer } = useDossier();
  const versCode = useParams<{ section?: string }>().section === 'code';
  const { t, langue, changer } = useLangue();
  const [, aller] = useLocation();
  const [code, setCode] = useState('');
  const [erreurs, setErreurs] = useState<string[]>([]);
  const aCode = useLiveQuery(() => codeDefini(db), []);
  const appli = useInstallation();
  const copieLe = useLiveQuery(() => derniereCopie(db, entreprise.id), [entreprise.id]);

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

  const codeAcces = (
    <>
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
            <input inputMode="numeric" type="password" maxLength={4} autoComplete="new-password" autoFocus={versCode} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </label>
          <button className="bouton" style={{ alignSelf: 'end' }} disabled={code.length !== 4} onClick={() => void enregistrerCode()}>
            {t('reglages.codeDefinir')}
          </button>
        </div>
      )}
      <Erreurs messages={erreurs} />
    </>
  );

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

      {/* Installer : seulement tant que ce n'est pas fait. */}
      {!appli.installee && (appli.peutInstaller || appli.iphone) && (
        <>
          <h2 className="titre-section">{t('reglages.telephone')}</h2>
          {appli.peutInstaller && (
            <button className="bouton" onClick={() => void installer()}>
              {t('reglages.installer')}
            </button>
          )}
          {appli.iphone && <p className="aide">{t('reglages.installerIphone')}</p>}
        </>
      )}

      {!entreprise.demo && <LienTrk />}

      <h2 className="titre-section">{t('reglages.donnees')}</h2>
      <p className="aide">{copieLe ? t('copie.derniere', { n: Math.max(0, Math.round((Date.parse(aujourdhui) - Date.parse(copieLe.slice(0, 10))) / 86_400_000)) }) : t('copie.jamais')}</p>
      <div className="deux-col">
        <button className="bouton discret" onClick={() => void telechargerCopie(entreprise.id, entreprise.nom, aujourdhui)}>
          {t('reglages.copie')}
        </button>
        <ReprendreCopie classe="bouton discret" />
      </div>

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

      {/* Le reste sert rarement : replié. */}
      <details className="replie" open={versCode || undefined}>
        <summary>{t('reglages.autres')}</summary>
        <div className="replie-contenu">
          <p className="aide">{appli.installee ? t('reglages.installee') : appli.horsLignePret ? t('reglages.horsLigne') : t('reglages.horsLignePasEncore')}</p>
          {codeAcces}
          <ChoixMethodeStock />
          <p className="aide">{t('copie.photos')}</p>
          <p className="aide">Mbongo Business · {t('app.editeur')}</p>
          <a className="bouton discret" href={SITE_TRK} target="_blank" rel="noopener">
            {t('reglages.site')}
          </a>
        </div>
      </details>
    </>
  );
}
