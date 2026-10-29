/** Journaux de trésorerie mensuels, en lecture seule. */
import { useMemo, useState } from 'react';
import { useParams } from 'wouter';
import { COLONNES_DEPENSE, COLONNES_RECETTE, journalMensuel, NATURES } from '../../moteur';
import { moisEntre } from '../../moteur/dates';
import { fmtDate, fmtNu } from '../../ui/format';
import { Chargement, dateRefDe, Fenetre, Pastille, useBureau, useDossierBureau } from '../contexte';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const VENT: Record<string, string> = {
  ventes: 'Ventes',
  autres: 'Autres',
  materiel: 'Matériel, mobilier, cautions',
  exploitant: 'Compte exploitant',
  emprunts: 'Emprunts',
  transferts: 'Transferts',
  achats_marchandises: 'Achats marchandises',
  achats_fournitures: 'Achats matières et fournitures',
  loyers: 'Loyers',
  salaires: 'Salaires',
  impots_taxes: 'Impôts et taxes',
};

export function Journaux() {
  const { id } = useParams<{ id: string }>();
  const { aujourdhui } = useBureau();
  const c = useDossierBureau(id);
  const [compte, setCompte] = useState<string | null>(null);
  const [mois, setMois] = useState<string | null>(null);

  const tousMois = c ? moisEntre(c.exercice.debut.slice(0, 7), dateRefDe(c, aujourdhui).slice(0, 7)) : [];
  const compteId = compte ?? c?.comptes[0]?.id ?? '';
  const moisChoisi = mois ?? tousMois[tousMois.length - 1] ?? '';
  const journal = useMemo(() => (c && compteId && moisChoisi ? journalMensuel(c.dossier, compteId, moisChoisi) : null), [c, compteId, moisChoisi]);
  const annulees = useMemo(() => new Set(c?.dossier.operations.filter((o) => o.annule).map((o) => o.annule)), [c]);

  if (!c || !journal) return <Chargement etat={c} />;
  const d = journal.devise;
  const nature = (opId: string) => {
    const o = c.dossier.operations.find((x) => x.id === opId);
    return o ? NATURES[o.nature].libelleSMT : '';
  };

  return (
    <Fenetre titre={`Journal de trésorerie · ${journal.compte.libelle}`} sousTitre={`Modèle note 4 · montants en ${d === 'USD' ? 'dollars' : 'francs congolais'}`}>
      <div className="flex items-end gap-2.5">
        <label>
          <span className="libelle">Compte</span>
          <select className="champ" value={compteId} onChange={(e) => setCompte(e.target.value)}>
            {c.comptes.map((x) => (
              <option key={x.id} value={x.id}>
                {x.libelle} ({x.devise})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="libelle">Mois</span>
          <select className="champ" value={moisChoisi} onChange={(e) => setMois(e.target.value)}>
            {[...tousMois].reverse().map((m) => (
              <option key={m} value={m}>
                {MOIS[Number(m.slice(5, 7)) - 1]} {m.slice(0, 4)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex gap-2.5 items-start">
        <div className="encart flex-1 min-w-0 overflow-auto">
          <table className="grille">
            <thead>
              <tr>
                <th>Date</th>
                <th>Libellés</th>
                <th>Nature</th>
                <th>Pièce</th>
                <th className="m">Recettes</th>
                <th className="m">Dépenses</th>
                <th className="m">Solde</th>
              </tr>
            </thead>
            <tbody>
              <tr className="total">
                <td />
                <td colSpan={5}>Report à nouveau</td>
                <td className="m">{fmtNu(journal.reportANouveau, d)}</td>
              </tr>
              {journal.lignes.map((l) => (
                <tr key={l.operation} className={annulees.has(l.operation) ? 'line-through text-text-dim' : ''}>
                  <td className="font-mono whitespace-nowrap">{fmtDate(l.date)}</td>
                  <td>
                    {l.libelle} {l.annulation && <Pastille ton="neutre">annulation</Pastille>}
                  </td>
                  <td className="text-text-dim">{nature(l.operation)}</td>
                  <td>{l.piece ? 'oui' : <Pastille ton="avert">manque</Pastille>}</td>
                  <td className="m text-positive">{l.recette ? fmtNu(l.recette, d) : ''}</td>
                  <td className="m text-danger">{l.depense ? fmtNu(l.depense, d) : ''}</td>
                  <td className={`m ${l.solde < 0 ? 'text-danger' : ''}`}>{fmtNu(l.solde, d)}</td>
                </tr>
              ))}
              {journal.lignes.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-text-dim">
                    Aucun mouvement ce mois.
                  </td>
                </tr>
              )}
              <tr className="total">
                <td />
                <td colSpan={3}>Solde à reporter</td>
                <td className="m">{fmtNu(journal.totalRecettes, d)}</td>
                <td className="m">{fmtNu(journal.totalDepenses, d)}</td>
                <td className="m">{fmtNu(journal.soldeAReporter, d)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="encart w-[280px] flex-shrink-0">
          <div className="encart-titre">Ventilation</div>
          <table className="grille">
            <tbody>
              {COLONNES_RECETTE.map((k) => (
                <tr key={`r-${k}`}>
                  <td>Recettes · {VENT[k]}</td>
                  <td className="m">{journal.ventilation.recettes[k] ? fmtNu(journal.ventilation.recettes[k], d) : '·'}</td>
                </tr>
              ))}
              {COLONNES_DEPENSE.map((k) => (
                <tr key={`d-${k}`}>
                  <td>Dépenses · {VENT[k]}</td>
                  <td className="m">{journal.ventilation.depenses[k] ? fmtNu(journal.ventilation.depenses[k], d) : '·'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Fenetre>
  );
}
