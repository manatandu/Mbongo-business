/**
 * Onglet « Journaux » d'un client : journal de trésorerie au tracé de la note 4 (un par caisse, banque, monnaie électronique, tontine),
 * journaux de suivi des créances impayées et des dettes à payer (Titre X, ch. 1 et 3). Lecture seule, imprimable.
 */
import { useMemo, useState } from 'react';
import type { DateISO, DossierExercice, Etats, GenreTiers } from '../moteur';
import { fmt, fmtDate, fmtNu } from '../ui/format';
import type { Mentions } from './entete';
import { DEPENSES_MODELE, journalBureau, LIBELLE_DEPENSE, LIBELLE_RECETTE, moisExercice, RECETTES_MODELE, suiviTiers } from './journaux';
import { EnteteEtats } from './TablesEtats';
import { Carte, Message } from './ui';

const NOM_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const libelleMois = (m: string) => `${NOM_MOIS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

function JournalTresorerie({ d, compteId, mois }: { d: DossierExercice; compteId: string; mois: string }) {
  const j = useMemo(() => journalBureau(d, compteId, mois), [d, compteId, mois]);
  const usd = j.devise === 'USD';
  const recettes = [...RECETTES_MODELE, ...j.recettesAjoutees];
  const depenses = [...DEPENSES_MODELE, ...j.depensesAjoutees];
  const nu = (m: number) => fmtNu(m, j.devise);
  const vide = recettes.length + depenses.length;
  return (
    <>
      <div className="overflow-auto">
        <table className="grille journal">
          <thead>
            <tr>
              <th rowSpan={2}>Date</th>
              <th rowSpan={2}>Libellés</th>
              <th rowSpan={2}>N° pièce</th>
              <th rowSpan={2} className="m">
                Recettes
              </th>
              <th rowSpan={2} className="m">
                Dépenses
              </th>
              <th rowSpan={2} className="m">
                Solde
              </th>
              {usd && (
                <th rowSpan={2} className="m">
                  Contre-valeur (CDF)
                </th>
              )}
              <th colSpan={recettes.length} className="groupe">
                Ventilation recettes
              </th>
              <th colSpan={depenses.length} className="groupe">
                Ventilation dépenses
              </th>
            </tr>
            <tr>
              {recettes.map((k) => (
                <th key={'r' + k} className="m">
                  {LIBELLE_RECETTE[k]}
                </th>
              ))}
              {depenses.map((k) => (
                <th key={'d' + k} className="m">
                  {LIBELLE_DEPENSE[k]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="report">
              <td>{fmtDate(`${mois}-01`)}</td>
              <td>Report à nouveau</td>
              <td />
              <td />
              <td />
              <td className="m">{nu(j.reportANouveau)}</td>
              {usd && <td className="m">{j.reportFC === null ? '' : fmt(j.reportFC)}</td>}
              <td colSpan={vide} />
            </tr>
            {j.lignes.map((l, i) => (
              <tr key={`${l.operation}-${i}`}>
                <td>{fmtDate(l.date)}</td>
                <td>
                  {l.libelle}
                  {l.annulation && <span className="text-text-dim"> (annulation)</span>}
                </td>
                <td>{l.reference || (l.piece ? '' : <span className="text-warning">sans pièce</span>)}</td>
                <td className="m">{l.recette ? nu(l.recette) : ''}</td>
                <td className="m">{l.depense ? nu(l.depense) : ''}</td>
                <td className="m">{nu(l.solde)}</td>
                {usd && <td className="m">{l.fc === null ? '' : fmt(l.fc)}</td>}
                {recettes.map((k) => (
                  <td key={'r' + k} className="m">
                    {l.cote === 'recette' && l.colonne === k ? nu(l.recette) : ''}
                  </td>
                ))}
                {depenses.map((k) => (
                  <td key={'d' + k} className="m">
                    {l.cote === 'depense' && l.colonne === k ? nu(l.depense) : ''}
                  </td>
                ))}
              </tr>
            ))}
            {j.lignes.length === 0 && (
              <tr>
                <td colSpan={6 + (usd ? 1 : 0) + vide} className="text-text-dim">
                  Aucune opération ce mois-ci sur ce compte.
                </td>
              </tr>
            )}
            <tr className="total">
              <td />
              <td>Totaux du mois</td>
              <td />
              <td className="m">{nu(j.totalRecettes)}</td>
              <td className="m">{nu(j.totalDepenses)}</td>
              <td />
              {usd && <td />}
              {recettes.map((k) => (
                <td key={'r' + k} className="m">
                  {nu(j.ventilation.recettes[k])}
                </td>
              ))}
              {depenses.map((k) => (
                <td key={'d' + k} className="m">
                  {nu(j.ventilation.depenses[k])}
                </td>
              ))}
            </tr>
            <tr className="total">
              <td />
              <td>Solde à reporter</td>
              <td />
              <td />
              <td />
              <td className="m">{nu(j.soldeAReporter)}</td>
              {usd && <td className="m">{j.soldeFC === null ? '' : fmt(j.soldeFC)}</td>}
              <td colSpan={vide} />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="m-0 text-text-dim text-[13px]">
        Montants en {usd ? 'dollars (USD)' : 'francs congolais (CDF)'}, dans la devise du compte.
        {usd && " Contre-valeur en francs au taux du jour de chaque opération, saisi par le commerçant ; report au taux d'ouverture."}
        {j.recettesAjoutees.length + j.depensesAjoutees.length > 0 && ' Colonnes ajoutées au modèle (compte exploitant, emprunts, transferts, matériel) : admises par la note 4.'}
      </p>
    </>
  );
}

function Suivi({ d, genre, date }: { d: DossierExercice; genre: GenreTiers; date: DateISO }) {
  const lignes = useMemo(() => suiviTiers(d, genre, date), [d, genre, date]);
  const creance = genre === 'creance';
  return (
    <Carte titre={creance ? 'Journal de suivi des créances impayées' : 'Journal de suivi des dettes à payer'}>
      <div className="overflow-auto">
        <table className="grille">
          <thead>
            <tr>
              <th>Date</th>
              <th>N° facture</th>
              <th>{creance ? 'Nom du client' : 'Nom du fournisseur'}</th>
              <th className="m">Montant</th>
              <th className="m">Réglé</th>
              <th className="m">Reste</th>
              <th>Devise</th>
              <th>Date de paiement</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((x) => (
              <tr key={x.ligne.id}>
                <td>{fmtDate(x.ligne.date)}</td>
                <td>{x.ligne.facture}</td>
                <td>{x.ligne.nom}</td>
                <td className="m">{fmtNu(x.ligne.montant, x.ligne.devise)}</td>
                <td className="m">{fmtNu(x.regle, x.ligne.devise)}</td>
                <td className="m">{x.soldee ? 'soldée' : fmtNu(x.reste, x.ligne.devise)}</td>
                <td>{x.ligne.devise}</td>
                <td>{x.dernierReglement ? `${fmtDate(x.dernierReglement)}${x.soldee ? '' : ' (en partie)'}` : ''}</td>
              </tr>
            ))}
            {lignes.length === 0 && (
              <tr>
                <td colSpan={8} className="text-text-dim">
                  Aucune facture sur l'exercice.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="m-0 text-text-dim text-[13px]">
        Toutes les factures de l'exercice, soldées comprises, et celles des années passées encore dues à l'ouverture. Date de paiement : celle du dernier règlement.
      </p>
    </Carte>
  );
}

export function Journaux({ d, e, date, mentions }: { d: DossierExercice; e: Etats; date: DateISO; mentions: Mentions }) {
  const mois = moisExercice(d, date);
  const [compteId, setCompte] = useState(d.comptes[0]?.id ?? '');
  const [m, setMois] = useState(mois[mois.length - 1] ?? d.exercice.debut.slice(0, 7));
  const compte = d.comptes.find((c) => c.id === compteId) ?? d.comptes[0];
  return (
    <div className="flex flex-col gap-4">
      <EnteteEtats e={e} mentions={mentions} titre={`Journaux · exercice ${e.exercice.annee}`} />
      <div className="flex flex-col gap-4">
        <Carte titre={`Journal de trésorerie (note 4)${compte ? ` · ${compte.libelle} · ${libelleMois(m)}` : ''}`}>
          <div className="ecran-seul flex flex-wrap items-end gap-3">
            <label>
              <span className="libelle">Compte</span>
              <select className="champ" aria-label="Compte" value={compte?.id ?? ''} onChange={(x) => setCompte(x.target.value)}>
                {d.comptes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.libelle} ({c.devise})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="libelle">Mois</span>
              <select className="champ" aria-label="Mois" value={m} onChange={(x) => setMois(x.target.value)}>
                {mois.map((x) => (
                  <option key={x} value={x}>
                    {libelleMois(x)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {compte ? <JournalTresorerie d={d} compteId={compte.id} mois={m} /> : <Message ton="avert">Aucun compte de trésorerie.</Message>}
        </Carte>
      </div>
      <Suivi d={d} genre="creance" date={date} />
      <Suivi d={d} genre="dette" date={date} />
    </div>
  );
}
