/**
 * Fin de journée : ce qui est entré et sorti aujourd'hui, et le comptage de la caisse.
 * Rien n'est verrouillé : un oubli se saisit encore le lendemain, à sa vraie date.
 * Un écart de caisse constaté peut être noté (autre recette ou autre dépense) : c'est le commerçant qui décide.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { soldesTresorerie, versFC, type Nature, type Operation, type SoldeCompte } from '../../moteur';
import { useLangue } from '../../i18n';
import { ecrireReglage, lireReglage } from '../../donnees/reglages';
import { enregistrerOperation, ErreurSaisie } from '../../donnees/saisie';
import { fmtMontant, lireMontant } from '../../ui/format';
import { Erreurs } from '../composants';
import { db, useDossier } from '../session';

/** « Entré » et « sorti » : l'activité seule, sans les apports, prélèvements, prêts ni matériel. */
export const ACTIVITE: ReadonlySet<Nature> = new Set<Nature>(['ventes', 'autres_recettes', 'achats_marchandises', 'achats_fournitures', 'loyers', 'salaires', 'impots_taxes', 'interets', 'autres_depenses']);
export const valeur = (o: Operation): number => (o.annule ? -1 : 1) * versFC(o.montant, o.devise, o.taux);

export const cleJournee = (entrepriseId: string) => `journee:${entrepriseId}`;

/** Dernier jour compté, pour l'accueil. */
export function useJourneeFaite(entrepriseId: string): string | null | undefined {
  return useLiveQuery(() => lireReglage<string | null>(db, cleJournee(entrepriseId), null), [entrepriseId]);
}

function Comptage({ s, ecart }: { s: SoldeCompte; ecart: (compte: SoldeCompte, valeur: number | null) => void }) {
  const { t } = useLangue();
  const [texte, setTexte] = useState('');
  const compte = lireMontant(texte, s.compte.devise);
  const diff = compte === null ? null : compte - s.natif;
  return (
    <div className="comptage">
      <div>
        <b style={{ fontWeight: 600 }}>{s.compte.libelle}</b> <span className="aide">{t('journee.attendu', { montant: fmtMontant(s.natif, s.compte.devise) })}</span>
      </div>
      <label className="champ">
        {t('journee.compte')} ({s.compte.devise})
        <input
          inputMode="decimal"
          value={texte}
          onChange={(e) => {
            setTexte(e.target.value);
            ecart(s, lireMontant(e.target.value, s.compte.devise));
          }}
        />
      </label>
      {diff !== null && (
        <p className={diff === 0 ? 'aide' : 'erreur'}>
          {diff === 0 ? t('journee.juste') : t(diff > 0 ? 'journee.plus' : 'journee.moins', { montant: fmtMontant(Math.abs(diff), s.compte.devise) })}
        </p>
      )}
    </div>
  );
}

export function FinJournee() {
  const { chargement, aujourdhui, taux, annoncer, entreprise } = useDossier();
  const { t } = useLangue();
  const [, aller] = useLocation();
  const { dossier, exercice } = chargement;
  const [comptes, setComptes] = useState<Record<string, number | null>>({});
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [occupe, setOccupe] = useState(false);

  const vue = useMemo(() => {
    const duJour = dossier.operations.filter((o) => o.date === aujourdhui);
    const activite = duJour.filter((o) => ACTIVITE.has(o.nature));
    return {
      nombre: duJour.length,
      entre: activite.filter((o) => o.type === 'recette').reduce((x, o) => x + valeur(o), 0),
      sorti: activite.filter((o) => o.type === 'depense').reduce((x, o) => x + valeur(o), 0),
      caisses: soldesTresorerie(dossier, aujourdhui).filter((s) => s.compte.type === 'caisse'),
    };
  }, [dossier, aujourdhui]);

  const ecarts = vue.caisses.flatMap((s) => {
    const c = comptes[s.compte.id];
    return c === undefined || c === null || c === s.natif ? [] : [{ s, diff: c - s.natif }];
  });

  async function terminer(noterEcarts: boolean) {
    setOccupe(true);
    try {
      if (noterEcarts) {
        for (const { s, diff } of ecarts) {
          if (s.compte.devise === 'USD' && !taux) throw new ErreurSaisie([t('saisir.erreur.taux')]);
          await enregistrerOperation(db, exercice.id, {
            date: aujourdhui,
            type: diff > 0 ? 'recette' : 'depense',
            compte: s.compte.id,
            nature: diff > 0 ? 'autres_recettes' : 'autres_depenses',
            libelle: t('journee.libelle'),
            montant: Math.abs(diff),
            devise: s.compte.devise,
            taux: s.compte.devise === 'USD' ? taux : null,
            // Le comptage du jour tient lieu de pièce.
            piece: true,
            reference: t('journee.reference'),
          });
        }
      }
      await ecrireReglage(db, cleJournee(entreprise.id), aujourdhui);
      annoncer(t('journee.ok'));
      aller('/');
    } catch (x) {
      setErreurs(x instanceof ErreurSaisie ? x.messages : [(x as Error).message]);
    } finally {
      setOccupe(false);
    }
  }

  return (
    <>
      <div className="comptes">
        <div className="kpi">
          <div className="n">{t('journee.entre')}</div>
          <div className="v amt-in">{fmtMontant(vue.entre, 'CDF')}</div>
        </div>
        <div className="kpi">
          <div className="n">{t('journee.sorti')}</div>
          <div className="v amt-out">{fmtMontant(vue.sorti, 'CDF')}</div>
        </div>
      </div>
      <p className="aide">{t('journee.nombre', { n: vue.nombre })}</p>

      {vue.caisses.length > 0 && (
        <>
          <h2 className="titre-section">{t('journee.compter')}</h2>
          <div className="liste">
            {vue.caisses.map((s) => (
              <Comptage key={s.compte.id} s={s} ecart={(c, v) => setComptes((x) => ({ ...x, [c.compte.id]: v }))} />
            ))}
          </div>
          <p className="aide">{t('journee.aide')}</p>
        </>
      )}

      <Erreurs messages={erreurs} />
      {ecarts.length > 0 ? (
        <div className="duo">
          <button className="bouton discret" disabled={occupe} onClick={() => void terminer(false)}>
            {t('journee.sansNoter')}
          </button>
          <button className="bouton" disabled={occupe} onClick={() => void terminer(true)}>
            {t('journee.noter')}
          </button>
        </div>
      ) : (
        <button className="bouton" disabled={occupe} onClick={() => void terminer(false)}>
          {t('journee.terminer')}
        </button>
      )}
    </>
  );
}
