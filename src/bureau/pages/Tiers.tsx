/** Journaux de suivi des créances impayées et des dettes à payer, côte à côte. */
import { useMemo } from 'react';
import { useParams } from 'wouter';
import { situationTiers, type GenreTiers, type SituationTiers } from '../../moteur';
import { fmtDate, fmtMontant } from '../../ui/format';
import { IconPrint } from '../chrome/icons';
import { useRibbon } from '../chrome/ribbon-context';
import { Chargement, dateRefDe, Fenetre, Pastille, useBureau, useDossierBureau } from '../contexte';

function Tableau({ titre, lignes }: { titre: string; lignes: SituationTiers[] }) {
  const ouvertes = lignes.filter((s) => s.encours > 0);
  return (
    <div className="encart flex-1 min-w-0 overflow-auto">
      <div className="encart-titre">
        <span>{titre}</span>
        <span className="font-normal text-text-dim">{ouvertes.length} en attente</span>
      </div>
      <table className="grille">
        <thead>
          <tr>
            <th>Date</th>
            <th>Facture</th>
            <th>Tiers</th>
            <th className="m">Montant</th>
            <th className="m">Réglé</th>
            <th className="m">Reste</th>
            <th className="m">Âge</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((s) => (
            <tr key={s.ligne.id} className={s.soldee ? 'text-text-dim' : ''}>
              <td className="font-mono whitespace-nowrap">{fmtDate(s.ligne.date)}</td>
              <td className="font-mono">{s.ligne.facture || 'sans n°'}</td>
              <td>{s.ligne.nom}</td>
              <td className="m">{fmtMontant(s.ligne.montant, s.ligne.devise)}</td>
              <td className="m">{s.regle ? fmtMontant(s.regle, s.ligne.devise) : ''}</td>
              <td className="m font-semibold">{s.encours ? fmtMontant(s.encours, s.ligne.devise) : ''}</td>
              <td className="m">{s.soldee ? <Pastille ton="ok">soldée</Pastille> : s.ageJours > 30 ? <Pastille ton="danger">{s.ageJours} j</Pastille> : `${s.ageJours} j`}</td>
            </tr>
          ))}
          {lignes.length === 0 && (
            <tr>
              <td colSpan={7} className="text-text-dim">
                Aucune facture.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Tiers() {
  const { id } = useParams<{ id: string }>();
  const { aujourdhui } = useBureau();
  const c = useDossierBureau(id);
  useRibbon([{ titre: 'Sortie', boutons: [{ label: 'Imprimer', Icon: IconPrint, onClick: () => window.print() }] }]);
  const vue = useMemo(() => {
    if (!c) return null;
    const ref = dateRefDe(c, aujourdhui);
    const s = (g: GenreTiers) => situationTiers(c.dossier, g, ref).sort((a, b) => Number(a.soldee) - Number(b.soldee) || (a.ligne.date < b.ligne.date ? -1 : 1));
    return { ref, creances: s('creance'), dettes: s('dette') };
  }, [c, aujourdhui]);
  if (!c || !vue) return <Chargement etat={c} />;
  return (
    <Fenetre titre="Créances et dettes" sousTitre={`Journaux de suivi au ${fmtDate(vue.ref)}`}>
      <div className="flex gap-2.5 items-start">
        <Tableau titre="Créances impayées (clients)" lignes={vue.creances} />
        <Tableau titre="Dettes à payer (fournisseurs)" lignes={vue.dettes} />
      </div>
    </Fenetre>
  );
}
