/** Portefeuille de l'assistant : tous les dossiers suivis, avec leur état de contrôle. */
import { useLiveQuery } from 'dexie-react-hooks';
import { useLocation } from 'wouter';
import { resumeDossier } from '../../donnees/bureau';
import { chargerDossier } from '../../donnees/dossier';
import { exerciceCourant } from '../../donnees/entreprise';
import { fmt, fmtDate } from '../../ui/format';
import { IconFolderOpen, IconPhone, IconPrint } from '../chrome/icons';
import { useRibbon } from '../chrome/ribbon-context';
import { db, Page, Pastille, useBureau } from '../contexte';

const SECTEURS = { negoce: 'Négoce', artisanat: 'Artisanat', services: 'Services' } as const;

export function Portefeuille() {
  const { aujourdhui } = useBureau();
  const [, aller] = useLocation();
  useRibbon([
    { titre: 'DOSSIERS', boutons: [{ label: 'Appli commerçant', Icon: IconPhone, onClick: () => window.open('./index.html', '_blank') }] },
    { titre: 'SORTIE', boutons: [{ label: 'Imprimer', Icon: IconPrint, onClick: () => window.print() }] },
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
    <Page titre="Clients suivis" sousTitre={`${total} dossier(s) · ${aJour} à jour · ${aTraiter} à traiter`}>
      <div className="panneau overflow-auto">
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
                      <Pastille ton="neutre">FICTIF</Pastille>
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
                <td className="whitespace-nowrap">{resume.aTraiter ? <Pastille ton="danger">À TRAITER</Pastille> : resume.aRevoir ? <Pastille ton="avert">À REVOIR</Pastille> : <Pastille ton="ok">À JOUR</Pastille>}</td>
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
      <p className="m-0 text-[11px] text-text-dim flex items-center gap-1.5">
        <IconFolderOpen width={12} height={12} /> Un clic ouvre le dossier. Le serveur partagé arrive à l'étape 3 : pour l'instant, le bureau lit les dossiers enregistrés sur ce poste.
      </p>
    </Page>
  );
}
