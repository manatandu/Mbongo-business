/** Portefeuille de l'assistant : tous les dossiers suivis, avec leur état de contrôle. */
import { useLiveQuery } from 'dexie-react-hooks';
import { useLocation } from 'wouter';
import { resumeDossier } from '../../donnees/bureau';
import { chargerDossier } from '../../donnees/dossier';
import { exerciceCourant } from '../../donnees/entreprise';
import { fmt, fmtDate } from '../../ui/format';
import { IconPhone, IconPrint } from '../chrome/icons';
import { useRibbon } from '../chrome/ribbon-context';
import { db, Fenetre, Pastille, useBureau } from '../contexte';

const SECTEURS = { negoce: 'Négoce', artisanat: 'Artisanat', services: 'Services' } as const;

export function Portefeuille() {
  const { aujourdhui } = useBureau();
  const [, aller] = useLocation();
  useRibbon([
    { titre: 'Dossiers', boutons: [{ label: 'Appli commerçant', Icon: IconPhone, onClick: () => window.open('./index.html', '_blank') }] },
    { titre: 'Sortie', boutons: [{ label: 'Imprimer', Icon: IconPrint, onClick: () => window.print() }] },
  ]);

  const lignes = useLiveQuery(async () => {
    const entreprises = await db.entreprises.toArray();
    const r = [];
    for (const e of entreprises) {
      const ex = await exerciceCourant(db, e.id, Number(aujourdhui.slice(0, 4)));
      if (!ex) continue;
      const c = await chargerDossier(db, ex.id);
      r.push({ e, ex, resume: resumeDossier(c, aujourdhui) });
    }
    return r.sort((a, b) => b.resume.aTraiter - a.resume.aTraiter || a.e.nom.localeCompare(b.e.nom));
  }, [aujourdhui]);

  const total = lignes?.length ?? 0;
  const aJour = lignes?.filter((l) => !l.resume.aTraiter && !l.resume.aRevoir).length ?? 0;
  const aTraiter = lignes?.filter((l) => l.resume.aTraiter).length ?? 0;

  return (
    <Fenetre
      titre="Clients suivis"
      sousTitre={`${total} dossier(s) · ${aJour} à jour · ${aTraiter} à traiter`}
      aide="Un clic ouvre le dossier. Tant que le serveur partagé n'existe pas (étape 3), le bureau lit les dossiers enregistrés sur ce poste."
    >
      <div className="overflow-auto">
        <table className="grille">
          <thead>
            <tr>
              <th>Entreprise</th>
              <th>Secteur</th>
              <th>Responsable</th>
              <th>Exercice</th>
              <th>Dernière saisie</th>
              <th className="m">Ventes cumulées (FC)</th>
              <th className="m">Résultat provisoire (FC)</th>
              <th className="m">À traiter</th>
              <th className="m">À revoir</th>
              <th>État</th>
            </tr>
          </thead>
          <tbody>
            {(lignes ?? []).map(({ e, ex, resume }) => (
              <tr key={e.id} className="cursor-pointer" onDoubleClick={() => aller(`/dossier/${e.id}/controles`)} onClick={() => aller(`/dossier/${e.id}/controles`)}>
                <td className="font-semibold">
                  {e.nom}
                  {e.demo && (
                    <span className="ml-1.5">
                      <Pastille ton="neutre">Fictif</Pastille>
                    </span>
                  )}
                </td>
                <td>{SECTEURS[e.secteur]}</td>
                <td className="whitespace-nowrap">{e.responsable}</td>
                <td className="font-mono whitespace-nowrap">
                  {ex.annee} · {ex.statut === 'arrete' ? 'arrêté' : 'ouvert'}
                </td>
                <td className="font-mono">{resume.derniereSaisie ? fmtDate(resume.derniereSaisie) : 'aucune'}</td>
                <td className="m">{fmt(resume.ventes)}</td>
                <td className="m">{fmt(resume.resultat)}</td>
                <td className="m">{resume.aTraiter || ''}</td>
                <td className="m">{resume.aRevoir || ''}</td>
                <td className="whitespace-nowrap">{resume.aTraiter ? <Pastille ton="danger">À traiter</Pastille> : resume.aRevoir ? <Pastille ton="avert">À revoir</Pastille> : <Pastille ton="ok">À jour</Pastille>}</td>
              </tr>
            ))}
            {lignes && lignes.length === 0 && (
              <tr>
                <td colSpan={10} className="text-text-dim">
                  Aucun dossier sur ce poste. Ouvrez l'appli du commerçant (menu Fichier) et chargez la démonstration, ou créez une entreprise.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Fenetre>
  );
}
