/** Tableaux des états SMT : en-tête, compte de résultat, bilan, notes 1 à 3. Vocabulaire exact du modèle AUDCIF (Titre X). */
import type { Bilan, DossierExercice, Etats as EtatsSMT, Montant } from '../moteur';
import { fmt, fmtDate } from '../ui/format';
import { champsEntete, type Mentions } from './entete';
import { cleTiers, datesParTiers, detailBanque } from './journaux';
import { Pastille } from './ui';

/** Une ligne : exercice N, puis N-1 (tiret quand la valeur n'existe pas). */
const L = ({ l, n, v, p, c }: { l: string; n?: string; v: Montant; p: Montant | undefined; c?: string }) => (
  <tr className={c}>
    <td>{l}</td>
    <td className="text-text-dim">{n ?? ''}</td>
    <td className="m">{fmt(v)}</td>
    <td className="m text-text-dim">{p === undefined ? '—' : fmt(p)}</td>
  </tr>
);

/** En-tête du modèle, repris en tête du jeu d'états et à l'impression. */
export function EnteteEtats({ e, mentions, titre }: { e: EtatsSMT; mentions: Mentions; titre: string }) {
  return (
    <div className="entete-etats">
      <div className="entete-etats-titre">{titre}</div>
      {mentions.fictif && <div className="text-warning font-bold">Données fictives de démonstration</div>}
      <dl>
        {champsEntete(e, mentions).map(([l, v]) => (
          <div key={l} className={l === 'Statut' && mentions.arreteLe ? 'large' : ''}>
            <dt>{l}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export interface ProprietesEtats {
  e: EtatsSMT;
  /** États de l'année précédente tenue dans Mbongo. */
  precedent?: EtatsSMT | null;
  /** Première année : bilan d'ouverture, repris en colonne N-1 du bilan (AUDCIF, art. 34 al. 4). */
  ouverture?: Bilan | null;
  /** Dossier de l'exercice : détail de la ligne Banque, dates de la note 3. */
  dossier?: DossierExercice;
  methodeStock?: string | undefined;
  mentions?: Mentions;
}

export function TablesEtats({ e, precedent: prec = null, ouverture = null, dossier, methodeStock, mentions = {} }: ProprietesEtats) {
  const r = e.compteDeResultat;
  const b = e.bilan;
  const n = e.notes;
  const pr = prec?.compteDeResultat;
  const pb = prec?.bilan ?? ouverture ?? undefined;
  const premiere = !prec;
  const pct = (v: number | null) => (v === null ? 'n.s.' : `${Math.round(v * 100)} %`);
  const banques = dossier ? detailBanque(dossier, e.auDate) : [];
  const datesC = dossier ? datesParTiers(dossier, 'creance') : null;
  const datesD = dossier ? datesParTiers(dossier, 'dette') : null;
  const dateDe = (m: Map<string, string> | null, nom: string) => {
    const d = m?.get(cleTiers(nom));
    return d ? fmtDate(d) : '';
  };
  const travaux = n.note2.lignes.filter((l) => l.travauxEnCours);
  return (
    <div className="flex flex-col gap-4">
      <EnteteEtats e={e} mentions={mentions} titre={`États financiers SMT · exercice ${e.exercice.annee}`} />
      <div className="grid grid-cols-2 gap-2.5 items-start etats-colonnes">
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
              <L l="Recettes sur ventes ou prestations de services" n="4" v={r.recettesVentes} p={pr?.recettesVentes} />
              <L l="Autres recettes sur activités" n="4" v={r.autresRecettes} p={pr?.autresRecettes} />
              <L l="Total des recettes sur produits (A)" v={r.A} p={pr?.A} c="total" />
              <L l="Dépenses sur achats" n="4" v={r.achats} p={pr?.achats} />
              <L l="Dépenses sur loyers" n="4" v={r.loyers} p={pr?.loyers} />
              <L l="Dépenses sur salaires" n="4" v={r.salaires} p={pr?.salaires} />
              <L l="Dépenses sur impôts et taxes" n="4" v={r.impotsTaxes} p={pr?.impotsTaxes} />
              <L l="Charges d'intérêts" v={r.interets} p={pr?.interets} />
              <L l="Autres dépenses sur activités" n="4" v={r.autresDepenses} p={pr?.autresDepenses} />
              <L l="Total dépenses sur charges (B)" v={r.B} p={pr?.B} c="total" />
              <L l="Solde : excédent ou insuffisance de recettes (C = A − B)" v={r.C} p={pr?.C} c="total" />
              <L l="− Variation des stocks N / N-1" n="2" v={r.variationStocks} p={pr?.variationStocks} />
              <L l="− Variation des créances N / N-1" n="3" v={r.variationCreances} p={pr?.variationCreances} />
              <L l="+ Variation des dettes d'exploitation N / N-1" n="3" v={r.variationDettes} p={pr?.variationDettes} />
              <L l="Dotations amortissements (F)" n="1" v={r.F} p={pr?.F} />
              <L l="Résultat exercice (G = C − D + E − F)" v={r.G} p={pr?.G} c="resultat" />
            </tbody>
          </table>
          {premiere && <p className="mt-1.5 mb-0 text-text-dim text-[13px]">Colonne {e.exercice.annee - 1} non disponible : première année tenue dans Mbongo.</p>}
        </div>
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
              <L l="Immobilisations (valeur nette)" n="1" v={b.actif.immobilisations} p={pb?.actif.immobilisations} />
              <L l="Stocks" n="2" v={b.actif.stocks} p={pb?.actif.stocks} />
              <L l="Clients et débiteurs divers" n="3" v={b.actif.creances} p={pb?.actif.creances} />
              <L l="Caisse" v={b.actif.caisse} p={pb?.actif.caisse} />
              <L l="Banque (en + ou en −)" v={b.actif.banque} p={pb?.actif.banque} />
              {banques.map((x) => (
                <tr key={x.libelle} className="detail">
                  <td className="pl-5 text-text-dim">dont {x.libelle}</td>
                  <td />
                  <td className="m text-text-dim">{fmt(x.montant)}</td>
                  <td />
                </tr>
              ))}
              <L l="Total actif" v={b.actif.total} p={pb?.actif.total} c="total" />
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
              <L l="Compte exploitant" n="1" v={b.passif.compteExploitant} p={pb?.passif.compteExploitant} />
              <L l="Résultat exercice" v={b.passif.resultat} p={pb?.passif.resultat} />
              <L l="Emprunt" v={b.passif.emprunt} p={pb?.passif.emprunt} />
              <L l="Fournisseurs et créditeurs divers" n="3" v={b.passif.dettes} p={pb?.passif.dettes} />
              <L l="Total passif" v={b.passif.total} p={pb?.passif.total} c="total" />
            </tbody>
          </table>
          {premiere && ouverture && (
            <p className="mt-1.5 mb-0 text-text-dim text-[13px]">
              Première année tenue dans Mbongo : la dernière colonne reprend le bilan d'ouverture au {fmtDate(e.exercice.debut)} (soldes d'ouverture).
            </p>
          )}
          {banques.length > 0 && <p className="mt-1.5 mb-0 text-text-dim text-[13px]">Banque : comptes bancaires, monnaie électronique et tontine, en francs.</p>}
        </div>
      </div>

      <div className="encart">
        <div className="encart-titre">Note 1 · Tableau SMT de suivi du matériel, du mobilier et des cautions</div>
        <table className="grille">
          <thead>
            <tr>
              <th>Date</th>
              <th>Désignation</th>
              <th className="m">Montant</th>
              <th className="m">Dotation</th>
              <th className="m">Valeur nette</th>
              <th>Date de sortie</th>
              <th className="m">Prix de cession</th>
            </tr>
          </thead>
          <tbody>
            {n.note1.lignes.map((l) => (
              <tr key={l.id}>
                <td>{fmtDate(l.date)}</td>
                <td>{l.designation}</td>
                <td className="m">{fmt(l.montant)}</td>
                <td className="m">{fmt(l.dotation)}</td>
                <td className="m">{fmt(l.valeurNette)}</td>
                <td>{l.dateSortie ? fmtDate(l.dateSortie) : ''}</td>
                <td className="m">{l.prixCession !== null ? fmt(l.prixCession) : ''}</td>
              </tr>
            ))}
            {n.note1.lignes.length === 0 && (
              <tr>
                <td colSpan={7} className="text-text-dim">
                  Aucun matériel, mobilier ni caution.
                </td>
              </tr>
            )}
            <tr className="total">
              <td colSpan={2}>Total</td>
              <td className="m">{fmt(n.note1.totalMontant)}</td>
              <td className="m">{fmt(n.note1.totalDotations)}</td>
              <td className="m">{fmt(n.note1.totalValeurNette)}</td>
              <td colSpan={2} />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="encart">
        <div className="encart-titre">Note 2 · État des stocks</div>
        {methodeStock && <p className="mt-0 mb-1.5 text-text-dim text-[13px]">{methodeStock}</p>}
        <table className="grille">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Désignation</th>
              <th className="m">Quantité</th>
              <th className="m">Prix unitaire</th>
              <th className="m">Montant</th>
            </tr>
          </thead>
          <tbody>
            {n.note2.lignes.map((l, i) => (
              <tr key={`${l.reference}-${i}`}>
                <td>{l.reference}</td>
                <td>{l.travauxEnCours ? `${l.designation} (travail en cours)` : l.designation}</td>
                <td className="m">{l.travauxEnCours ? '' : String(l.quantite).replace('.', ',')}</td>
                <td className="m">{l.travauxEnCours ? '' : fmt(l.prixUnitaire)}</td>
                <td className="m">{fmt(l.montant)}</td>
              </tr>
            ))}
            {travaux.length > 0 && (
              <tr>
                <td colSpan={4}>dont travaux en cours</td>
                <td className="m">{fmt(travaux.reduce((s, l) => s + l.montant, 0))}</td>
              </tr>
            )}
            <tr className="total">
              <td colSpan={4}>Valeur du stock final{n.note2.inventaireFait ? '' : ' (inventaire non fait : stock initial repris)'}</td>
              <td className="m">{fmt(n.note2.stockFinal)}</td>
            </tr>
            <tr>
              <td colSpan={4}>Valeur du stock initial</td>
              <td className="m">{fmt(n.note2.stockInitial)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="encart">
        <div className="encart-titre">Note 3 · Créances et dettes non échues</div>
        <table className="grille">
          <thead>
            <tr>
              <th>Date</th>
              <th>Nom du client ou du fournisseur</th>
              <th className="m">Montant au 31 décembre</th>
              <th className="m">Montant au 1er janvier</th>
              <th className="m">Variation</th>
            </tr>
          </thead>
          <tbody>
            {n.note3.creances.lignes.map((x) => (
              <tr key={'creances' + x.nom}>
                <td>{dateDe(datesC, x.nom)}</td>
                <td>{x.nom}</td>
                <td className="m">{fmt(x.cloture)}</td>
                <td className="m">{fmt(x.ouverture)}</td>
                <td className="m">{pct(x.variation)}</td>
              </tr>
            ))}
            <tr className="total">
              <td colSpan={2}>Total des créances</td>
              <td className="m">{fmt(n.note3.creances.cloture)}</td>
              <td className="m">{fmt(n.note3.creances.ouverture)}</td>
              <td className="m">{pct(n.note3.creances.variation)}</td>
            </tr>
            {n.note3.dettes.lignes.map((x) => (
              <tr key={'dettes' + x.nom}>
                <td>{dateDe(datesD, x.nom)}</td>
                <td>{x.nom}</td>
                <td className="m">{fmt(x.cloture)}</td>
                <td className="m">{fmt(x.ouverture)}</td>
                <td className="m">{pct(x.variation)}</td>
              </tr>
            ))}
            <tr className="total">
              <td colSpan={2}>Total des dettes</td>
              <td className="m">{fmt(n.note3.dettes.cloture)}</td>
              <td className="m">{fmt(n.note3.dettes.ouverture)}</td>
              <td className="m">{pct(n.note3.dettes.variation)}</td>
            </tr>
          </tbody>
        </table>
        {dossier && <p className="mt-1.5 mb-0 text-text-dim text-[13px]">Date : celle de la plus ancienne facture du client ou du fournisseur.</p>}
      </div>
    </div>
  );
}
