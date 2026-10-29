/**
 * Inventaire du stock de fin d'exercice (note 2). L'assistant le prépare avec le commerçant ;
 * seul le commerçant le valide, depuis son téléphone.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { useParams } from 'wouter';
import { tracer } from '../../donnees/bureau';
import { enregistrerInventaire, ErreurSaisie } from '../../donnees/saisie';
import { fmt, lireMontant } from '../../ui/format';
import { IconPrint } from '../chrome/icons';
import { useRibbon } from '../chrome/ribbon-context';
import { Chargement, db, Page, Pastille, useBureau, useDossierBureau } from '../contexte';

export function Inventaire() {
  const { id } = useParams<{ id: string }>();
  const { annoncer } = useBureau();
  const c = useDossierBureau(id);
  const lignes = useLiveQuery(() => (c ? db.inventaires.where('exerciceId').equals(c.exercice.id).sortBy('ordre') : []), [c?.exercice.id]) ?? [];
  const [ajout, setAjout] = useState({ designation: '', quantite: '', prix: '' });
  const [erreur, setErreur] = useState('');
  useRibbon([{ titre: 'SORTIE', boutons: [{ label: 'Imprimer', Icon: IconPrint, onClick: () => window.print() }] }]);
  if (!c) return <Chargement etat={c} />;
  const valide = c.exercice.stockFinal !== null;
  const total = lignes.reduce((s, l) => s + l.montant, 0);

  const ecrire = async (nouvelles: typeof lignes, detail: string) => {
    try {
      await enregistrerInventaire(
        db,
        c.exercice.id,
        nouvelles.map((l, i) => ({ reference: `L${i + 1}`, designation: l.designation, quantite: l.quantite, prixUnitaire: l.prixUnitaire, montant: l.montant })),
      );
      await tracer(db, 'assistant', 'inventaire_prepare', detail, c.entreprise.id, c.exercice.id);
      setErreur('');
    } catch (x) {
      setErreur(x instanceof ErreurSaisie ? x.messages.join(' ') : (x as Error).message);
    }
  };

  async function ajouter(e: FormEvent) {
    e.preventDefault();
    const q = Number(ajout.quantite.replace(',', '.'));
    const p = lireMontant(ajout.prix, 'CDF');
    if (!ajout.designation.trim() || !(q >= 0) || p === null) {
      setErreur('Article, quantité et prix unitaire requis.');
      return;
    }
    const montant = Math.round(q * p);
    await ecrire([...lignes, { id: '', exerciceId: c!.exercice.id, ordre: lignes.length, reference: '', designation: ajout.designation.trim(), quantite: q, prixUnitaire: p, montant }], `Ligne ajoutée : ${ajout.designation.trim()} (${fmt(montant)} FC)`);
    setAjout({ designation: '', quantite: '', prix: '' });
    annoncer('Ligne d’inventaire ajoutée');
  }

  return (
    <Page titre="Inventaire du stock" sousTitre={`Note 2 · exercice ${c.exercice.annee}`}>
      <div className="flex gap-2.5 text-[12px] items-center">
        <span>
          Stock initial : <b className="font-mono">{fmt(c.exercice.stockInitial)} FC</b>
        </span>
        <span>
          Total compté : <b className="font-mono">{fmt(total)} FC</b>
        </span>
        {valide ? <Pastille ton="ok">VALIDÉ PAR LE COMMERÇANT : {fmt(c.exercice.stockFinal ?? 0)} FC</Pastille> : <Pastille ton="avert">BROUILLON, VALIDATION SUR LE TÉLÉPHONE</Pastille>}
      </div>
      <div className="panneau overflow-auto">
        <table className="grille">
          <thead>
            <tr>
              <th>Réf.</th>
              <th>Article</th>
              <th className="m">Quantité</th>
              <th className="m">Prix unitaire</th>
              <th className="m">Montant</th>
              {!valide && <th />}
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.id}>
                <td className="font-mono">{l.reference}</td>
                <td>{l.designation}</td>
                <td className="m">{String(l.quantite).replace('.', ',')}</td>
                <td className="m">{fmt(l.prixUnitaire)}</td>
                <td className="m">{fmt(l.montant)}</td>
                {!valide && (
                  <td>
                    <button className="bouton h-[20px] px-1.5 text-[11px]" onClick={() => void ecrire(lignes.filter((x) => x.id !== l.id), `Ligne retirée : ${l.designation}`)}>
                      Retirer
                    </button>
                  </td>
                )}
              </tr>
            ))}
            <tr className="total">
              <td colSpan={4}>Valeur du stock compté</td>
              <td className="m">{fmt(total)}</td>
              {!valide && <td />}
            </tr>
          </tbody>
        </table>
      </div>
      {!valide && (
        <form onSubmit={ajouter} className="panneau p-2 flex items-end gap-2">
          <label className="flex-1">
            <span className="libelle">Article</span>
            <input className="champ w-full" value={ajout.designation} onChange={(e) => setAjout({ ...ajout, designation: e.target.value })} />
          </label>
          <label>
            <span className="libelle">Quantité</span>
            <input className="champ w-24 text-right font-mono" value={ajout.quantite} onChange={(e) => setAjout({ ...ajout, quantite: e.target.value })} />
          </label>
          <label>
            <span className="libelle">Prix unitaire (FC)</span>
            <input className="champ w-32 text-right font-mono" value={ajout.prix} onChange={(e) => setAjout({ ...ajout, prix: e.target.value })} />
          </label>
          <button className="bouton-principal" type="submit">
            Ajouter
          </button>
        </form>
      )}
      {erreur && <p className="m-0 text-[12px] text-danger">{erreur}</p>}
    </Page>
  );
}
