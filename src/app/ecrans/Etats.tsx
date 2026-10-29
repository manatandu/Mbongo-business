/**
 * États SMT : compte de résultat, bilan, notes 1 à 3.
 * Toujours en français : c'est le vocabulaire officiel.
 */
import { useMemo, useState } from 'react';
import { calculerEtats, type Etats as EtatsSMT, type Montant } from '../../moteur';
import { useLangue } from '../../i18n';
import { fmt, fmtDate } from '../../ui/format';
import { useDossier } from '../session';

type Vue = 'cr' | 'bilan' | 'notes';

const L = ({ libelle, note, valeur, classe }: { libelle: string; note?: string; valeur: Montant; classe?: string }) => (
  <tr className={classe}>
    <td>{libelle}</td>
    <td>{note ?? ''}</td>
    <td className="d num">{fmt(valeur)}</td>
  </tr>
);

function Entete({ e, titre }: { e: EtatsSMT; titre: string }) {
  return (
    <>
      <h2>{titre}</h2>
      <div className="doc-entete">
        <span>
          Entité : <b>{e.entreprise.nom}</b>
        </span>
        <span>
          Exercice clos le <b>31-12-{e.exercice.annee}</b>
        </span>
        <span>
          N° d'identification : <b>{e.entreprise.nif || 'néant'}</b>
        </span>
        <span>
          Durée : <b>12 mois</b>
        </span>
      </div>
    </>
  );
}

function CompteDeResultat({ e }: { e: EtatsSMT }) {
  const r = e.compteDeResultat;
  return (
    <div className="doc">
      <Entete e={e} titre="Compte de résultat SMT" />
      <div className="tableau">
        <table>
          <thead>
            <tr>
              <th>Rubriques</th>
              <th>Note</th>
              <th className="d">Exercice {e.exercice.annee}</th>
            </tr>
          </thead>
          <tbody>
            <L libelle="Recettes sur ventes ou prestations de services" note="4" valeur={r.recettesVentes} />
            <L libelle="Autres recettes sur activités" note="4" valeur={r.autresRecettes} />
            <L libelle="Total des recettes sur produits (A)" valeur={r.A} classe="total" />
            <L libelle="Dépenses sur achats" note="4" valeur={r.achats} />
            <L libelle="Dépenses sur loyers" note="4" valeur={r.loyers} />
            <L libelle="Dépenses sur salaires" note="4" valeur={r.salaires} />
            <L libelle="Dépenses sur impôts et taxes" note="4" valeur={r.impotsTaxes} />
            <L libelle="Charges d'intérêts" valeur={r.interets} />
            <L libelle="Autres dépenses sur activités" note="4" valeur={r.autresDepenses} />
            <L libelle="Total dépenses sur charges (B)" valeur={r.B} classe="total" />
            <L libelle="Solde : excédent ou insuffisance de recettes (C = A − B)" valeur={r.C} classe="sous" />
            <L libelle="− Variation des stocks N / N-1" note="2" valeur={r.variationStocks} />
            <L libelle="− Variation des créances N / N-1" note="3" valeur={r.variationCreances} />
            <L libelle="+ Variation des dettes d'exploitation N / N-1" note="3" valeur={r.variationDettes} />
            <L libelle="Dotations amortissements (F)" note="1" valeur={r.F} />
            <L libelle="Résultat exercice (G = C − D + E − F)" valeur={r.G} classe="resultat" />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Bilan({ e }: { e: EtatsSMT }) {
  const b = e.bilan;
  return (
    <div className="doc">
      <Entete e={e} titre={`Bilan SMT au 31 décembre ${e.exercice.annee}`} />
      <div className="tableau">
        <table>
          <thead>
            <tr>
              <th>Actif</th>
              <th>Note</th>
              <th className="d">Exercice {e.exercice.annee}</th>
            </tr>
          </thead>
          <tbody>
            <L libelle="Immobilisations (valeur nette)" note="1" valeur={b.actif.immobilisations} />
            <L libelle="Stocks" note="2" valeur={b.actif.stocks} />
            <L libelle="Clients et débiteurs divers" note="3" valeur={b.actif.creances} />
            <L libelle="Caisse" valeur={b.actif.caisse} />
            <L libelle="Banque, monnaie électronique et tontine (en + ou en −)" valeur={b.actif.banque} />
            <L libelle="Total actif" valeur={b.actif.total} classe="total" />
          </tbody>
        </table>
      </div>
      <div className="tableau">
        <table>
          <thead>
            <tr>
              <th>Passif</th>
              <th>Note</th>
              <th className="d">Exercice {e.exercice.annee}</th>
            </tr>
          </thead>
          <tbody>
            <L libelle="Compte exploitant" note="1" valeur={b.passif.compteExploitant} />
            <L libelle="Résultat exercice" valeur={b.passif.resultat} />
            <L libelle="Emprunt" valeur={b.passif.emprunt} />
            <L libelle="Fournisseurs et créditeurs divers" note="3" valeur={b.passif.dettes} />
            <L libelle="Total passif" valeur={b.passif.total} classe="total" />
          </tbody>
        </table>
      </div>
      <p className="aide">
        <span className={`pill ${b.equilibre ? 'ok' : 'bad'}`}>{b.equilibre ? 'Bilan équilibré' : 'Écart à analyser'}</span>
      </p>
    </div>
  );
}

function Notes({ e }: { e: EtatsSMT }) {
  const n = e.notes;
  const pct = (v: number | null) => (v === null ? 'n.s.' : `${Math.round(v * 100)} %`);
  return (
    <div className="doc">
      <Entete e={e} titre="Notes annexes 1 à 3" />
      <h3>Note 1 · Matériel, mobilier et cautions</h3>
      <div className="tableau">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Désignation</th>
              <th className="d">Montant</th>
              <th className="d">Dotation</th>
              <th>Sortie</th>
              <th className="d">Prix de cession</th>
            </tr>
          </thead>
          <tbody>
            {n.note1.lignes.map((l) => (
              <tr key={l.id}>
                <td className="num">{fmtDate(l.date)}</td>
                <td>{l.designation}</td>
                <td className="d num">{fmt(l.montant)}</td>
                <td className="d num">{fmt(l.dotation)}</td>
                <td className="num">{l.dateSortie ? fmtDate(l.dateSortie) : ''}</td>
                <td className="d num">{l.prixCession !== null ? fmt(l.prixCession) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>Note 2 · État des stocks</h3>
      <div className="tableau">
        <table>
          <tbody>
            {n.note2.lignes.map((l) => (
              <tr key={l.reference}>
                <td>
                  {l.reference} · {l.designation}
                </td>
                <td className="d num">
                  {String(l.quantite).replace('.', ',')} × {fmt(l.prixUnitaire)}
                </td>
                <td className="d num">{fmt(l.montant)}</td>
              </tr>
            ))}
            <tr className="sous">
              <td colSpan={2}>Valeur du stock final{n.note2.inventaireFait ? '' : ' (inventaire non fait : stock initial repris)'}</td>
              <td className="d num">{fmt(n.note2.stockFinal)}</td>
            </tr>
            <tr>
              <td colSpan={2}>Valeur du stock initial</td>
              <td className="d num">{fmt(n.note2.stockInitial)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3>Note 3 · Créances et dettes non échues</h3>
      <div className="tableau">
        <table>
          <thead>
            <tr>
              <th />
              <th className="d">Au 31 décembre</th>
              <th className="d">Au 1er janvier</th>
              <th className="d">Variation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Total des créances</td>
              <td className="d num">{fmt(n.note3.creances.cloture)}</td>
              <td className="d num">{fmt(n.note3.creances.ouverture)}</td>
              <td className="d num">{pct(n.note3.creances.variation)}</td>
            </tr>
            <tr>
              <td>Total des dettes</td>
              <td className="d num">{fmt(n.note3.dettes.cloture)}</td>
              <td className="d num">{fmt(n.note3.dettes.ouverture)}</td>
              <td className="d num">{pct(n.note3.dettes.variation)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Etats() {
  const { chargement, dateRef } = useDossier();
  const { t, langue } = useLangue();
  const [vue, setVue] = useState<Vue>('cr');
  const e = useMemo(() => calculerEtats(chargement.dossier, { auDate: dateRef }), [chargement.dossier, dateRef]);
  const arrete = chargement.exercice.statut === 'arrete' || chargement.exercice.statut === 'clos';

  return (
    <>
      <div className="filtres" role="group" aria-label={t('etats.titre')}>
        {(['cr', 'bilan', 'notes'] as Vue[]).map((v) => (
          <button key={v} className="puce" aria-pressed={vue === v} onClick={() => setVue(v)}>
            {t(v === 'cr' ? 'etats.cr' : v === 'bilan' ? 'etats.bilan' : 'etats.notes')}
          </button>
        ))}
      </div>
      {langue === 'ln' && <p className="aide">{t('etats.francais')}</p>}
      {e.provisoire && <p className="aide">{t('etats.provisoire', { date: fmtDate(e.auDate) })}</p>}
      {vue === 'cr' && <CompteDeResultat e={e} />}
      {vue === 'bilan' && <Bilan e={e} />}
      {vue === 'notes' && <Notes e={e} />}
      <hr className="filet-cloture" />
      <div className={`tampon ${arrete ? 'ok' : ''}`}>{arrete ? t('etats.arretes', { date: fmtDate(chargement.exercice.arreteLe ?? e.auDate) }) : t('etats.attente')}</div>
      <button className="bouton discret pas-imprime" onClick={() => window.print()}>
        {t('etats.imprimer')}
      </button>
    </>
  );
}
