/** Tableaux des états SMT : compte de résultat, bilan, notes 2 et 3. Vocabulaire exact du modèle AUDCIF. */
import type { Etats as EtatsSMT, Montant } from '../moteur';
import { fmt } from '../ui/format';
import { Pastille } from './ui';

/** Une ligne : exercice N, puis N-1 (tiret la première année tenue dans Mbongo). */
const L = ({ l, n, v, p, c }: { l: string; n?: string; v: Montant; p: Montant | undefined; c?: string }) => (
  <tr className={c}>
    <td>{l}</td>
    <td className="text-text-dim">{n ?? ''}</td>
    <td className="m">{fmt(v)}</td>
    <td className="m text-text-dim">{p === undefined ? '—' : fmt(p)}</td>
  </tr>
);

export function TablesEtats({ e, precedent: prec = null }: { e: EtatsSMT; precedent?: EtatsSMT | null }) {
  const r = e.compteDeResultat;
  const b = e.bilan;
  const n = e.notes;
  const pct = (v: number | null) => (v === null ? 'n.s.' : `${Math.round(v * 100)} %`);
  return (
    <div className="grid grid-cols-2 gap-2.5 items-start">
      <div className="encart">
        <div className="encart-titre">Compte de résultat SMT · exercice {e.exercice.annee}</div>
        <table className="grille">
          <thead>
            <tr>
              <th>Rubriques</th>
              <th>Note</th>
              <th className="m">{e.exercice.annee} (CDF)</th>
              <th className="m">{e.exercice.annee - 1}</th>
            </tr>
          </thead>
          <tbody>
            <L l="Recettes sur ventes ou prestations de services" n="4" v={r.recettesVentes} p={prec?.compteDeResultat.recettesVentes} />
            <L l="Autres recettes sur activités" n="4" v={r.autresRecettes} p={prec?.compteDeResultat.autresRecettes} />
            <L l="Total des recettes sur produits (A)" v={r.A} p={prec?.compteDeResultat.A} c="total" />
            <L l="Dépenses sur achats" n="4" v={r.achats} p={prec?.compteDeResultat.achats} />
            <L l="Dépenses sur loyers" n="4" v={r.loyers} p={prec?.compteDeResultat.loyers} />
            <L l="Dépenses sur salaires" n="4" v={r.salaires} p={prec?.compteDeResultat.salaires} />
            <L l="Dépenses sur impôts et taxes" n="4" v={r.impotsTaxes} p={prec?.compteDeResultat.impotsTaxes} />
            <L l="Charges d'intérêts" v={r.interets} p={prec?.compteDeResultat.interets} />
            <L l="Autres dépenses sur activités" n="4" v={r.autresDepenses} p={prec?.compteDeResultat.autresDepenses} />
            <L l="Total dépenses sur charges (B)" v={r.B} p={prec?.compteDeResultat.B} c="total" />
            <L l="Solde : excédent ou insuffisance de recettes (C = A − B)" v={r.C} p={prec?.compteDeResultat.C} c="total" />
            <L l="− Variation des stocks N / N-1" n="2" v={r.variationStocks} p={prec?.compteDeResultat.variationStocks} />
            <L l="− Variation des créances N / N-1" n="3" v={r.variationCreances} p={prec?.compteDeResultat.variationCreances} />
            <L l="+ Variation des dettes d'exploitation N / N-1" n="3" v={r.variationDettes} p={prec?.compteDeResultat.variationDettes} />
            <L l="Dotations amortissements (F)" n="1" v={r.F} p={prec?.compteDeResultat.F} />
            <L l="Résultat exercice (G = C − D + E − F)" v={r.G} p={prec?.compteDeResultat.G} c="resultat" />
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="encart">
          <div className="encart-titre">
            <span>Bilan SMT au 31 décembre {e.exercice.annee}</span>
            {b.equilibre ? <Pastille ton="ok">équilibré</Pastille> : <Pastille ton="danger">écart</Pastille>}
          </div>
          <table className="grille">
            <thead>
              <tr>
                <th>Actif</th>
                <th>Note</th>
                <th className="m">{e.exercice.annee}</th>
                <th className="m">{e.exercice.annee - 1}</th>
              </tr>
            </thead>
            <tbody>
              <L l="Immobilisations (valeur nette)" n="1" v={b.actif.immobilisations} p={prec?.bilan.actif.immobilisations} />
              <L l="Stocks" n="2" v={b.actif.stocks} p={prec?.bilan.actif.stocks} />
              <L l="Clients et débiteurs divers" n="3" v={b.actif.creances} p={prec?.bilan.actif.creances} />
              <L l="Caisse" v={b.actif.caisse} p={prec?.bilan.actif.caisse} />
              <L l="Banque, monnaie électronique, tontine (en + ou en −)" v={b.actif.banque} p={prec?.bilan.actif.banque} />
              <L l="Total actif" v={b.actif.total} p={prec?.bilan.actif.total} c="total" />
            </tbody>
            <thead>
              <tr>
                <th>Passif</th>
                <th>Note</th>
                <th className="m">{e.exercice.annee}</th>
                <th className="m">{e.exercice.annee - 1}</th>
              </tr>
            </thead>
            <tbody>
              <L l="Compte exploitant" n="1" v={b.passif.compteExploitant} p={prec?.bilan.passif.compteExploitant} />
              <L l="Résultat exercice" v={b.passif.resultat} p={prec?.bilan.passif.resultat} />
              <L l="Emprunt" v={b.passif.emprunt} p={prec?.bilan.passif.emprunt} />
              <L l="Fournisseurs et créditeurs divers" n="3" v={b.passif.dettes} p={prec?.bilan.passif.dettes} />
              <L l="Total passif" v={b.passif.total} p={prec?.bilan.passif.total} c="total" />
            </tbody>
          </table>
        </div>
        <div className="encart">
          <div className="encart-titre">Notes 2 et 3</div>
          <table className="grille">
            <thead>
              <tr>
                <th />
                <th className="m">Clôture</th>
                <th className="m">Ouverture</th>
                <th className="m">Variation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Stocks{n.note2.inventaireFait ? '' : ' (non inventorié)'}</td>
                <td className="m">{fmt(n.note2.stockFinal)}</td>
                <td className="m">{fmt(n.note2.stockInitial)}</td>
                <td className="m" />
              </tr>
              {n.note3.creances.lignes.map((x) => (
                <tr key={'creances' + x.nom}>
                  <td className="pl-4 text-text-dim">{x.nom}</td>
                  <td className="m">{fmt(x.cloture)}</td>
                  <td className="m">{fmt(x.ouverture)}</td>
                  <td className="m">{pct(x.variation)}</td>
                </tr>
              ))}
              <tr className="total">
                <td>Créances</td>
                <td className="m">{fmt(n.note3.creances.cloture)}</td>
                <td className="m">{fmt(n.note3.creances.ouverture)}</td>
                <td className="m">{pct(n.note3.creances.variation)}</td>
              </tr>
              {n.note3.dettes.lignes.map((x) => (
                <tr key={'dettes' + x.nom}>
                  <td className="pl-4 text-text-dim">{x.nom}</td>
                  <td className="m">{fmt(x.cloture)}</td>
                  <td className="m">{fmt(x.ouverture)}</td>
                  <td className="m">{pct(x.variation)}</td>
                </tr>
              ))}
              <tr className="total">
                <td>Dettes</td>
                <td className="m">{fmt(n.note3.dettes.cloture)}</td>
                <td className="m">{fmt(n.note3.dettes.ouverture)}</td>
                <td className="m">{pct(n.note3.dettes.variation)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
