/** Registre du matériel, du mobilier et des cautions (note 1). */
import { useMemo } from 'react';
import { useParams } from 'wouter';
import { calculerEtats } from '../../moteur';
import { fmt, fmtDate } from '../../ui/format';
import { IconPrint } from '../chrome/icons';
import { useRibbon } from '../chrome/ribbon-context';
import { Chargement, dateRefDe, Page, Pastille, useBureau, useDossierBureau } from '../contexte';

const CATEGORIE = { materiel: 'Matériel', mobilier: 'Mobilier', caution: 'Caution' } as Record<string, string>;

export function Materiel() {
  const { id } = useParams<{ id: string }>();
  const { aujourdhui } = useBureau();
  const c = useDossierBureau(id);
  useRibbon([{ titre: 'SORTIE', boutons: [{ label: 'Imprimer', Icon: IconPrint, onClick: () => window.print() }] }]);
  const note1 = useMemo(() => (c ? calculerEtats(c.dossier, { auDate: dateRefDe(c, aujourdhui) }).notes.note1 : null), [c, aujourdhui]);
  if (!c || !note1) return <Chargement etat={c} />;
  const duree = (lid: string) => c.dossier.immobilisations.find((i) => i.id === lid)?.duree ?? 0;
  return (
    <Page titre="Registre du matériel, du mobilier et des cautions" sousTitre="Note 1 · amortissement linéaire sans prorata temporis">
      <div className="panneau overflow-auto">
        <table className="grille">
          <thead>
            <tr>
              <th>Date</th>
              <th>Désignation</th>
              <th>Catégorie</th>
              <th className="m">Durée</th>
              <th className="m">Valeur d'origine</th>
              <th className="m">Dotation {c.exercice.annee}</th>
              <th className="m">Cumul</th>
              <th className="m">Valeur nette</th>
              <th>Sortie</th>
              <th className="m">Prix de cession</th>
            </tr>
          </thead>
          <tbody>
            {note1.lignes.map((l) => (
              <tr key={l.id}>
                <td className="font-mono">{fmtDate(l.date)}</td>
                <td>{l.designation}</td>
                <td>{CATEGORIE[l.categorie] ?? l.categorie}</td>
                <td className="m">{l.categorie === 'caution' ? '' : `${duree(l.id)} ans`}</td>
                <td className="m">{fmt(l.montant)}</td>
                <td className="m">{fmt(l.dotation)}</td>
                <td className="m">{fmt(l.cumul)}</td>
                <td className="m">{fmt(l.valeurNette)}</td>
                <td>{l.dateSortie ? <Pastille ton="neutre">{fmtDate(l.dateSortie)}</Pastille> : ''}</td>
                <td className="m">{l.prixCession !== null ? fmt(l.prixCession) : ''}</td>
              </tr>
            ))}
            <tr className="total">
              <td colSpan={4}>Total</td>
              <td className="m">{fmt(note1.totalMontant)}</td>
              <td className="m">{fmt(note1.totalDotations)}</td>
              <td />
              <td className="m">{fmt(note1.totalValeurNette)}</td>
              <td colSpan={2} />
            </tr>
          </tbody>
        </table>
      </div>
    </Page>
  );
}
