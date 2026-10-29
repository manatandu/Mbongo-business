/** Langue, installation sur le téléphone, code d'accès, copie de sauvegarde, démonstration. */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { useLangue } from '../../i18n';
import { chargerDemo } from '../../donnees/demo';
import { retirerEntreprise } from '../../donnees/entreprise';
import { codeDefini, definirCode } from '../../donnees/reglages';
import { Erreurs } from '../composants';
import { installer, useInstallation } from '../installation';
import { db, useDossier } from '../session';

async function telechargerCopie(entrepriseId: string, nom: string, jour: string): Promise<void> {
  const exercices = await db.exercices.where('entrepriseId').equals(entrepriseId).toArray();
  const parEntreprise = (table: 'comptes' | 'operations' | 'tiers' | 'immobilisations' | 'sorties') => db.table(table).where('entrepriseId').equals(entrepriseId).toArray();
  const copie = {
    format: 'mbongo-copie-1',
    creeLe: new Date().toISOString(),
    entreprise: await db.entreprises.get(entrepriseId),
    exercices,
    comptes: await parEntreprise('comptes'),
    operations: await parEntreprise('operations'),
    tiers: await parEntreprise('tiers'),
    immobilisations: await parEntreprise('immobilisations'),
    sorties: await parEntreprise('sorties'),
    inventaires: await db.inventaires.where('exerciceId').anyOf(exercices.map((e) => e.id)).toArray(),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(copie, null, 1)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `mbongo-${nom.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${jour}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function Reglages() {
  const { entreprise, aujourdhui, annoncer } = useDossier();
  const { t, langue, changer } = useLangue();
  const [, aller] = useLocation();
  const [code, setCode] = useState('');
  const [erreurs, setErreurs] = useState<string[]>([]);
  const aCode = useLiveQuery(() => codeDefini(db), []);
  const appli = useInstallation();
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

      <h2 className="titre-section">{t('reglages.code')}</h2>
      <p className="aide">{t('reglages.codeAide')}</p>
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

      <h2 className="titre-section">{t('reglages.donnees')}</h2>
      <p className="aide">
        {t('reglages.nonEnvoyees', { n: nonEnvoyees ?? 0 })} {t('reglages.pasDeServeur')}
      </p>
      <button className="bouton discret" onClick={() => void telechargerCopie(entreprise.id, entreprise.nom, aujourdhui)}>
        {t('reglages.copie')}
      </button>

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
    </>
  );
}
