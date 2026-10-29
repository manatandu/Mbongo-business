/** Taux du dollar saisis par l'assistant, et conversion du seuil SMT exprimé en FCFA. */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { saisirTaux } from '../../donnees/bureau';
import { ecrireReglage, lireReglage } from '../../donnees/reglages';
import { SEUILS_SMT_FCFA, seuilEnFrancs } from '../../moteur';
import { fmt, fmtDate, lireTaux } from '../../ui/format';
import { IconPrint } from '../chrome/icons';
import { useRibbon } from '../chrome/ribbon-context';
import { db, Page, Pastille, useBureau } from '../contexte';

const SOURCE = { demo: 'Démonstration', assistant: 'Assistant', commercant: 'Commerçant' } as const;

export function Taux() {
  const { aujourdhui, role, annoncer } = useBureau();
  const taux = useLiveQuery(() => db.taux.orderBy('date').reverse().toArray(), []) ?? [];
  const fcfa = useLiveQuery(() => lireReglage<number | null>(db, 'fcfaVersCdf', null), []);
  const [date, setDate] = useState(aujourdhui);
  const [valeur, setValeur] = useState('');
  const [fcfaTexte, setFcfaTexte] = useState('');
  const [erreur, setErreur] = useState('');
  useRibbon([{ titre: 'SORTIE', boutons: [{ label: 'Imprimer', Icon: IconPrint, onClick: () => window.print() }] }]);

  async function ajouter(e: FormEvent) {
    e.preventDefault();
    const v = lireTaux(valeur);
    if (!v) return setErreur('Taux invalide.');
    await saisirTaux(db, date, v);
    setValeur('');
    setErreur('');
    annoncer(`Taux du ${fmtDate(date)} enregistré : 1 $ = ${fmt(v)} FC`);
  }

  async function enregistrerFcfa(e: FormEvent) {
    e.preventDefault();
    const v = lireTaux(fcfaTexte);
    if (!v) return setErreur('Taux FCFA invalide.');
    await ecrireReglage(db, 'fcfaVersCdf', v);
    setFcfaTexte('');
    setErreur('');
    annoncer('Conversion du seuil SMT enregistrée');
  }

  return (
    <Page titre="Taux du dollar" sousTitre="Saisi par l'assistant, proposé aux commerçants, confirmé par l'expert avant l'arrêté">
      <div className="flex gap-2.5 items-start">
        <div className="panneau flex-1 overflow-auto">
          <div className="panneau-titre">Historique</div>
          <table className="grille">
            <thead>
              <tr>
                <th>Date</th>
                <th className="m">FC pour 1 $</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {taux.map((t) => (
                <tr key={t.id}>
                  <td className="font-mono">{fmtDate(t.date)}</td>
                  <td className="m">{fmt(t.valeur)}</td>
                  <td>{SOURCE[t.source]}</td>
                </tr>
              ))}
              {taux.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-text-dim">
                    Aucun taux saisi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="w-[320px] flex flex-col gap-2.5">
          <form onSubmit={ajouter} className="panneau">
            <div className="panneau-titre">Taux du jour</div>
            <div className="p-2 flex flex-col gap-2">
              <label>
                <span className="libelle">Date</span>
                <input type="date" className="champ w-full" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label>
                <span className="libelle">FC pour 1 $</span>
                <input className="champ w-full text-right font-mono" inputMode="decimal" value={valeur} onChange={(e) => setValeur(e.target.value)} />
              </label>
              <button className="bouton-principal" type="submit" disabled={role !== 'assistant'}>
                Enregistrer
              </button>
              {role !== 'assistant' && <p className="m-0 text-[11px] text-text-dim">Saisie réservée au rôle Assistant (menu Affichage).</p>}
            </div>
          </form>
          <form onSubmit={enregistrerFcfa} className="panneau">
            <div className="panneau-titre">
              <span>Seuils SMT en francs congolais</span>
              {fcfa ? <Pastille ton="ok">1 FCFA = {String(fcfa).replace('.', ',')} FC</Pastille> : <Pastille ton="avert">NON SAISI</Pastille>}
            </div>
            <div className="p-2 flex flex-col gap-2">
              <table className="grille">
                <tbody>
                  {(Object.keys(SEUILS_SMT_FCFA) as (keyof typeof SEUILS_SMT_FCFA)[]).map((s) => (
                    <tr key={s}>
                      <td className="capitalize">{s === 'negoce' ? 'Négoce' : s}</td>
                      <td className="m">{fmt(SEUILS_SMT_FCFA[s])} FCFA</td>
                      <td className="m">{fcfa ? `${fmt(seuilEnFrancs(s, fcfa))} FC` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <label>
                <span className="libelle">FC pour 1 FCFA</span>
                <input className="champ w-full text-right font-mono" inputMode="decimal" value={fcfaTexte} onChange={(e) => setFcfaTexte(e.target.value)} />
              </label>
              <button className="bouton" type="submit">
                Enregistrer la conversion
              </button>
            </div>
          </form>
          {erreur && <p className="m-0 text-[12px] text-danger">{erreur}</p>}
        </div>
      </div>
    </Page>
  );
}
