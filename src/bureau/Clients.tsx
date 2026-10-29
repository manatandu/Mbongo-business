/** Écran 1 : la liste des clients suivis, avec ce qui demande de l'attention. */
import { useLiveQuery } from 'dexie-react-hooks';
import { useLocation } from 'wouter';
import { resumeDossier } from '../donnees/bureau';
import { chargerDossier } from '../donnees/dossier';
import { exerciceCourant } from '../donnees/entreprise';
import { fmt, fmtDate } from '../ui/format';
import { db, useBureau } from './contexte';
import { Fenetre, Pastille } from './ui';

const SECTEURS = { negoce: 'Négoce', artisanat: 'Artisanat', services: 'Services' } as const;

export function Clients() {
  const { aujourdhui } = useBureau();
  const [, aller] = useLocation();
  const lignes = useLiveQuery(async () => {
    const r = [];
    for (const e of await db.entreprises.toArray()) {
      const ex = await exerciceCourant(db, e.id, Number(aujourdhui.slice(0, 4)));
      // Une année passée dont les états attendent l'arrêté de l'expert.
      const enAttente = (await db.exercices.where('entrepriseId').equals(e.id).toArray()).filter((x) => x.annee < (ex?.annee ?? 0) && x.statut !== 'arrete').map((x) => x.annee);
      if (ex) r.push({ e, ex, enAttente, resume: resumeDossier(await chargerDossier(db, ex.id), aujourdhui) });
    }
    return r.sort((a, b) => b.resume.aTraiter - a.resume.aTraiter || a.e.nom.localeCompare(b.e.nom));
  }, [aujourdhui]);

  return (
    <Fenetre titre="Clients suivis" droite={<span className="text-chrome-text-dim">{lignes?.length ?? 0} client(s)</span>}>
      <div className="overflow-auto">
        <table className="grille">
          <thead>
            <tr>
              <th>Entreprise</th>
              <th>Secteur</th>
              <th>Dernière saisie</th>
              <th className="m">Ventes de l'année (CDF)</th>
              <th className="m">Résultat provisoire (CDF)</th>
              <th>À faire</th>
            </tr>
          </thead>
          <tbody>
            {(lignes ?? []).map(({ e, ex, enAttente, resume }) => (
              <tr key={e.id} className="cursor-pointer" onClick={() => aller(`/client/${e.id}`)}>
                <td className="font-semibold">
                  <a href={`#/client/${e.id}`} className="text-text no-underline">
                    {e.nom}
                  </a>
                  {e.demo && (
                    <span className="ml-1.5">
                      <Pastille ton="neutre">fictif</Pastille>
                    </span>
                  )}
                </td>
                <td>{SECTEURS[e.secteur]}</td>
                <td>{resume.derniereSaisie ? fmtDate(resume.derniereSaisie) : 'aucune'}</td>
                <td className="m">{fmt(resume.ventes)}</td>
                <td className="m">{fmt(resume.resultat)}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {enAttente.map((a) => (
                      <Pastille key={a} ton="avert">
                        États {a} à arrêter
                      </Pastille>
                    ))}
                    {ex.statut === 'arrete' ? (
                      <Pastille ton="ok">États arrêtés</Pastille>
                    ) : resume.aTraiter ? (
                      <Pastille ton="danger">À traiter ({resume.aTraiter})</Pastille>
                    ) : resume.aRevoir ? (
                      <Pastille ton="avert">À revoir ({resume.aRevoir})</Pastille>
                    ) : (
                      <Pastille ton="ok">Rien à signaler</Pastille>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {lignes && lignes.length === 0 && (
              <tr>
                <td colSpan={6} className="text-text-dim">
                  Aucun client sur cet ordinateur. Ouvrez <a href="./index.html">l'appli du commerçant</a> et chargez la démonstration.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Fenetre>
  );
}
