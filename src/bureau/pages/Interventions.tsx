/** Journal des interventions de l'assistant et de l'expert, en ajout seulement. */
import { useLiveQuery } from 'dexie-react-hooks';
import { IconPrint } from '../chrome/icons';
import { useRibbon } from '../chrome/ribbon-context';
import { db, LIBELLE_ROLE, Page } from '../contexte';

const ACTION = {
  taux_saisi: 'Taux du jour saisi',
  taux_confirme: 'Taux confirmé',
  taux_cloture: 'Taux de clôture',
  inventaire_prepare: 'Inventaire préparé',
  arrete: 'Arrêté des états',
  reouverture: 'Réouverture',
} as const;

export function Interventions() {
  useRibbon([{ titre: 'SORTIE', boutons: [{ label: 'Imprimer', Icon: IconPrint, onClick: () => window.print() }] }]);
  const lignes = useLiveQuery(() => db.interventions.orderBy('le').reverse().toArray(), []) ?? [];
  const entreprises = useLiveQuery(() => db.entreprises.toArray(), []) ?? [];
  const nom = (eid: string | null) => (eid ? (entreprises.find((e) => e.id === eid)?.nom ?? 'dossier retiré') : 'tous les dossiers');
  return (
    <Page titre="Journal des interventions" sousTitre="Qui a fait quoi, quand · aucune ligne ne s'efface">
      <div className="panneau overflow-auto">
        <table className="grille">
          <thead>
            <tr>
              <th>Le</th>
              <th>Rôle</th>
              <th>Action</th>
              <th>Dossier</th>
              <th>Détail</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.id}>
                <td className="font-mono whitespace-nowrap">{new Date(l.le).toLocaleString('fr-FR')}</td>
                <td>{LIBELLE_ROLE[l.role]}</td>
                <td>{ACTION[l.action]}</td>
                <td>{nom(l.entrepriseId)}</td>
                <td>{l.detail}</td>
              </tr>
            ))}
            {lignes.length === 0 && (
              <tr>
                <td colSpan={5} className="text-text-dim">
                  Aucune intervention pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
