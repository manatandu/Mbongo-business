/** États SMT préparés : compte de résultat, bilan, notes 1 à 3. */
import { useMemo, useState } from 'react';
import { useParams } from 'wouter';
import { calculerEtats, type Etats as EtatsSMT, type Montant } from '../../moteur';
import { fmt, fmtDate } from '../../ui/format';
import { IconPrint } from '../chrome/icons';
import { useRibbon } from '../chrome/ribbon-context';
import { Chargement, dateRefDe, Page, Pastille, useBureau, useDossierBureau } from '../contexte';

const L = ({ l, n, v, c }: { l: string; n?: string; v: Montant; c?: string }) => (
  <tr className={c}>
    <td>{l}</td>
    <td className="font-mono text-text-dim">{n ?? ''}</td>
    <td className="m">{fmt(v)}</td>
  </tr>
);

export function TablesEtats({ e }: { e: EtatsSMT }) {
  const r = e.compteDeResultat;
  const b = e.bilan;
  const n = e.notes;
  const pct = (v: number | null) => (v === null ? 'n.s.' : `${Math.round(v * 100)} %`);
  return (
    <div className="grid grid-cols-2 gap-2.5 items-start">
      <div className="panneau">
        <div className="panneau-titre">Compte de résultat SMT · exercice {e.exercice.annee}</div>
        <table className="grille">
          <thead>
            <tr>
              <th>Rubriques</th>
              <th>Note</th>
              <th className="m">Montant (FC)</th>
            </tr>
          </thead>
          <tbody>
            <L l="Recettes sur ventes ou prestations de services" n="4" v={r.recettesVentes} />
            <L l="Autres recettes sur activités" n="4" v={r.autresRecettes} />
            <L l="Total des recettes sur produits (A)" v={r.A} c="total" />
            <L l="Dépenses sur achats" n="4" v={r.achats} />
            <L l="Dépenses sur loyers" n="4" v={r.loyers} />
            <L l="Dépenses sur salaires" n="4" v={r.salaires} />
            <L l="Dépenses sur impôts et taxes" n="4" v={r.impotsTaxes} />
            <L l="Charges d'intérêts" v={r.interets} />
            <L l="Autres dépenses sur activités" n="4" v={r.autresDepenses} />
            <L l="Total dépenses sur charges (B)" v={r.B} c="total" />
            <L l="Solde : excédent ou insuffisance de recettes (C = A − B)" v={r.C} c="total" />
            <L l="− Variation des stocks N / N-1" n="2" v={r.variationStocks} />
            <L l="− Variation des créances N / N-1" n="3" v={r.variationCreances} />
            <L l="+ Variation des dettes d'exploitation N / N-1" n="3" v={r.variationDettes} />
            <L l="Dotations amortissements (F)" n="1" v={r.F} />
            <L l="Résultat exercice (G = C − D + E − F)" v={r.G} c="resultat" />
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="panneau">
          <div className="panneau-titre">
            <span>Bilan SMT au 31 décembre {e.exercice.annee}</span>
            {b.equilibre ? <Pastille ton="ok">ÉQUILIBRÉ</Pastille> : <Pastille ton="danger">ÉCART</Pastille>}
          </div>
          <table className="grille">
            <thead>
              <tr>
                <th>Actif</th>
                <th>Note</th>
                <th className="m">FC</th>
              </tr>
            </thead>
            <tbody>
              <L l="Immobilisations (valeur nette)" n="1" v={b.actif.immobilisations} />
              <L l="Stocks" n="2" v={b.actif.stocks} />
              <L l="Clients et débiteurs divers" n="3" v={b.actif.creances} />
              <L l="Caisse" v={b.actif.caisse} />
              <L l="Banque, monnaie électronique, tontine (en + ou en −)" v={b.actif.banque} />
              <L l="Total actif" v={b.actif.total} c="total" />
            </tbody>
            <thead>
              <tr>
                <th>Passif</th>
                <th>Note</th>
                <th className="m">FC</th>
              </tr>
            </thead>
            <tbody>
              <L l="Compte exploitant" n="1" v={b.passif.compteExploitant} />
              <L l="Résultat exercice" v={b.passif.resultat} />
              <L l="Emprunt" v={b.passif.emprunt} />
              <L l="Fournisseurs et créditeurs divers" n="3" v={b.passif.dettes} />
              <L l="Total passif" v={b.passif.total} c="total" />
            </tbody>
          </table>
        </div>
        <div className="panneau">
          <div className="panneau-titre">Notes 2 et 3</div>
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
              <tr>
                <td>Créances</td>
                <td className="m">{fmt(n.note3.creances.cloture)}</td>
                <td className="m">{fmt(n.note3.creances.ouverture)}</td>
                <td className="m">{pct(n.note3.creances.variation)}</td>
              </tr>
              <tr>
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

export function Etats() {
  const { id } = useParams<{ id: string }>();
  const { aujourdhui } = useBureau();
  const c = useDossierBureau(id);
  const [aLaCloture, setALaCloture] = useState(false);
  useRibbon([{ titre: 'SORTIE', boutons: [{ label: 'Imprimer', Icon: IconPrint, onClick: () => window.print() }] }]);
  const e = useMemo(() => (c ? calculerEtats(c.dossier, aLaCloture ? {} : { auDate: dateRefDe(c, aujourdhui) }) : null), [c, aujourdhui, aLaCloture]);
  if (!c || !e) return <Chargement etat={c} />;
  return (
    <Page titre="États SMT" sousTitre={`${c.entreprise.nom} · NIF ${c.entreprise.nif || 'néant'} · ${e.provisoire ? `situation provisoire au ${fmtDate(e.auDate)}` : 'états définitifs'}`}>
      <div className="flex items-center gap-3 text-[12px]">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={aLaCloture} onChange={(x) => setALaCloture(x.target.checked)} />
          Projeter au 31 décembre (toutes les saisies, inventaire et taux de clôture s'ils existent)
        </label>
        {c.exercice.statut === 'arrete' ? <Pastille ton="ok">ARRÊTÉS PAR L'EXPERT</Pastille> : <Pastille ton="avert">EN ATTENTE D'ARRÊTÉ</Pastille>}
      </div>
      <TablesEtats e={e} />
      <p className="m-0 text-[12px] font-semibold">{e.mention}</p>
    </Page>
  );
}
