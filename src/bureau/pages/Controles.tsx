/** Contrôles automatiques du dossier, en détail. L'assistant signale ; il ne corrige pas. */
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { useLocation, useParams } from 'wouter';
import { chiffreAffairesEstime, controler, evaluerSeuil, type NiveauAnomalie } from '../../moteur';
import { lireReglage } from '../../donnees/reglages';
import { fmt, fmtDate } from '../../ui/format';
import { IconBook, IconPrint, IconScale } from '../chrome/icons';
import { useRibbon } from '../chrome/ribbon-context';
import { Chargement, dateRefDe, db, Page, Pastille, useBureau, useDossierBureau } from '../contexte';

const NIVEAU: Record<NiveauAnomalie, { libelle: string; ton: 'danger' | 'avert' | 'neutre' }> = {
  a_traiter: { libelle: 'À TRAITER', ton: 'danger' },
  a_revoir: { libelle: 'À REVOIR', ton: 'avert' },
  information: { libelle: 'INFO', ton: 'neutre' },
};

export function Controles() {
  const { id } = useParams<{ id: string }>();
  const { aujourdhui } = useBureau();
  const [, aller] = useLocation();
  const c = useDossierBureau(id);
  const fcfa = useLiveQuery(() => lireReglage<number | null>(db, 'fcfaVersCdf', null), []);
  useRibbon([
    {
      titre: 'DOSSIER',
      boutons: [
        { label: 'Journaux', Icon: IconBook, onClick: () => aller(`/dossier/${id}/journaux`) },
        { label: 'États SMT', Icon: IconScale, onClick: () => aller(`/dossier/${id}/etats`) },
      ],
    },
    { titre: 'SORTIE', boutons: [{ label: 'Imprimer', Icon: IconPrint, onClick: () => window.print() }] },
  ]);

  const vue = useMemo(() => {
    if (!c) return null;
    const ref = dateRefDe(c, aujourdhui);
    const anomalies = controler(c.dossier, ref, { fcfaVersCdf: fcfa ?? null });
    const ca = chiffreAffairesEstime(c.dossier, ref);
    return { ref, anomalies, ca, seuil: fcfa ? evaluerSeuil(c.entreprise.secteur, ca, fcfa) : null };
  }, [c, aujourdhui, fcfa]);

  if (!c || !vue) return <Chargement etat={c} />;
  const nb = c.dossier.operations.length;
  const usd = c.dossier.operations.filter((o) => o.devise === 'USD').length;

  return (
    <Page titre="Contrôles automatiques" sousTitre={`Situation au ${fmtDate(vue.ref)}`}>
      <div className="grid grid-cols-4 gap-2.5">
        {[
          ['Opérations de l’exercice', fmt(nb)],
          ['Dont en dollars', fmt(usd)],
          ['Chiffre d’affaires approché (FC)', fmt(vue.ca)],
          ['Part du seuil SMT', vue.seuil ? `${Math.round(vue.seuil.ratio * 100)} % de ${fmt(vue.seuil.seuil)} FC` : 'taux FCFA non saisi'],
        ].map(([l, v]) => (
          <div key={l} className="panneau px-2 py-1.5">
            <div className="text-[10px] uppercase tracking-wide text-text-dim">{l}</div>
            <div className="font-mono text-[13px]">{v}</div>
          </div>
        ))}
      </div>
      <div className="panneau">
        <div className="panneau-titre">
          <span>Anomalies relevées</span>
          <span className="font-normal text-text-dim">{vue.anomalies.length} ligne(s)</span>
        </div>
        <table className="grille">
          <thead>
            <tr>
              <th>Niveau</th>
              <th>Contrôle</th>
              <th>Détail</th>
              <th className="m">Éléments</th>
            </tr>
          </thead>
          <tbody>
            {vue.anomalies.map((a) => (
              <tr key={a.code}>
                <td>
                  <Pastille ton={NIVEAU[a.niveau].ton}>{NIVEAU[a.niveau].libelle}</Pastille>
                </td>
                <td className="font-mono text-[11px] whitespace-nowrap">{a.code}</td>
                <td>{a.message}</td>
                <td className="m">{a.references.length || ''}</td>
              </tr>
            ))}
            {vue.anomalies.length === 0 && (
              <tr>
                <td colSpan={4} className="text-text-dim">
                  Aucune anomalie.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="m-0 text-[11px] text-text-dim">
        L'assistant n'a pas de droit d'écriture sur les opérations du commerçant : il le prévient, réclame la pièce, et c'est le commerçant qui corrige depuis son
        téléphone.
      </p>
    </Page>
  );
}
