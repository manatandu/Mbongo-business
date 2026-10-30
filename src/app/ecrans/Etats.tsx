/**
 * États SMT : compte de résultat, bilan, notes 1 à 3.
 * Toujours en français : c'est le vocabulaire officiel.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { calculerEtats, type Etats as EtatsSMT, type Montant } from '../../moteur';
import { useLangue } from '../../i18n';
import { fmt, fmtDate } from '../../ui/format';
import { etatsPrecedents } from '../../donnees/dossier';
import { mentionMethodeStock } from '../../donnees/stock';
import { db, useDossier } from '../session';

type Vue = 'cr' | 'bilan' | 'notes';

/** Une ligne d'état : exercice N, puis N-1 (tiret la première année tenue dans Mbongo). */
const L = ({ libelle, note, valeur, n1, classe }: { libelle: string; note?: string; valeur: Montant; n1: Montant | undefined; classe?: string }) => (
  <tr className={classe}>
    <td>{libelle}</td>
    <td>{note ?? ''}</td>
    <td className="d num">{fmt(valeur)}</td>
    <td className="d num">{n1 === undefined ? '—' : fmt(n1)}</td>
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

function CompteDeResultat({ e, p }: { e: EtatsSMT; p: EtatsSMT | null }) {
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
              <th className="d">{e.exercice.annee}</th>
              <th className="d">{e.exercice.annee - 1}</th>
            </tr>
          </thead>
          <tbody>
            <L libelle="Recettes sur ventes ou prestations de services" note="4" valeur={r.recettesVentes} n1={p?.compteDeResultat.recettesVentes} />
            <L libelle="Autres recettes sur activités" note="4" valeur={r.autresRecettes} n1={p?.compteDeResultat.autresRecettes} />
            <L libelle="Total des recettes sur produits (A)" valeur={r.A} n1={p?.compteDeResultat.A} classe="total" />
            <L libelle="Dépenses sur achats" note="4" valeur={r.achats} n1={p?.compteDeResultat.achats} />
            <L libelle="Dépenses sur loyers" note="4" valeur={r.loyers} n1={p?.compteDeResultat.loyers} />
            <L libelle="Dépenses sur salaires" note="4" valeur={r.salaires} n1={p?.compteDeResultat.salaires} />
            <L libelle="Dépenses sur impôts et taxes" note="4" valeur={r.impotsTaxes} n1={p?.compteDeResultat.impotsTaxes} />
            <L libelle="Charges d'intérêts" valeur={r.interets} n1={p?.compteDeResultat.interets} />
            <L libelle="Autres dépenses sur activités" note="4" valeur={r.autresDepenses} n1={p?.compteDeResultat.autresDepenses} />
            <L libelle="Total dépenses sur charges (B)" valeur={r.B} n1={p?.compteDeResultat.B} classe="total" />
            <L libelle="Solde : excédent ou insuffisance de recettes (C = A − B)" valeur={r.C} n1={p?.compteDeResultat.C} classe="sous" />
            <L libelle="− Variation des stocks N / N-1" note="2" valeur={r.variationStocks} n1={p?.compteDeResultat.variationStocks} />
            <L libelle="− Variation des créances N / N-1" note="3" valeur={r.variationCreances} n1={p?.compteDeResultat.variationCreances} />
            <L libelle="+ Variation des dettes d'exploitation N / N-1" note="3" valeur={r.variationDettes} n1={p?.compteDeResultat.variationDettes} />
            <L libelle="Dotations amortissements (F)" note="1" valeur={r.F} n1={p?.compteDeResultat.F} />
            <L libelle="Résultat exercice (G = C − D + E − F)" valeur={r.G} n1={p?.compteDeResultat.G} classe="resultat" />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Bilan({ e, p }: { e: EtatsSMT; p: EtatsSMT | null }) {
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
              <th className="d">{e.exercice.annee}</th>
              <th className="d">{e.exercice.annee - 1}</th>
            </tr>
          </thead>
          <tbody>
            <L libelle="Immobilisations (valeur nette)" note="1" valeur={b.actif.immobilisations} n1={p?.bilan.actif.immobilisations} />
            <L libelle="Stocks" note="2" valeur={b.actif.stocks} n1={p?.bilan.actif.stocks} />
            <L libelle="Clients et débiteurs divers" note="3" valeur={b.actif.creances} n1={p?.bilan.actif.creances} />
            <L libelle="Caisse" valeur={b.actif.caisse} n1={p?.bilan.actif.caisse} />
            <L libelle="Banque, monnaie électronique et tontine (en + ou en −)" valeur={b.actif.banque} n1={p?.bilan.actif.banque} />
            <L libelle="Total actif" valeur={b.actif.total} n1={p?.bilan.actif.total} classe="total" />
          </tbody>
        </table>
      </div>
      <div className="tableau">
        <table>
          <thead>
            <tr>
              <th>Passif</th>
              <th>Note</th>
              <th className="d">{e.exercice.annee}</th>
              <th className="d">{e.exercice.annee - 1}</th>
            </tr>
          </thead>
          <tbody>
            <L libelle="Compte exploitant" note="1" valeur={b.passif.compteExploitant} n1={p?.bilan.passif.compteExploitant} />
            <L libelle="Résultat exercice" valeur={b.passif.resultat} n1={p?.bilan.passif.resultat} />
            <L libelle="Emprunt" valeur={b.passif.emprunt} n1={p?.bilan.passif.emprunt} />
            <L libelle="Fournisseurs et créditeurs divers" note="3" valeur={b.passif.dettes} n1={p?.bilan.passif.dettes} />
            <L libelle="Total passif" valeur={b.passif.total} n1={p?.bilan.passif.total} classe="total" />
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
      <MentionStock />
      <div className="tableau">
        <table>
          <tbody>
            {n.note2.lignes.map((l) => (
              <tr key={l.reference}>
                <td>
                  {l.reference} · {l.designation}
                </td>
                <td className="d num">{l.travauxEnCours ? 'travail en cours' : `${String(l.quantite).replace('.', ',')} × ${fmt(l.prixUnitaire)}`}</td>
                <td className="d num">{fmt(l.montant)}</td>
              </tr>
            ))}
            {n.note2.lignes.some((l) => l.travauxEnCours) && (
              <tr>
                <td colSpan={2}>dont travaux en cours</td>
                <td className="d num">{fmt(n.note2.lignes.filter((l) => l.travauxEnCours).reduce((s, l) => s + l.montant, 0))}</td>
              </tr>
            )}
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
              <th>Client ou fournisseur</th>
              <th className="d">Au 31 décembre</th>
              <th className="d">Au 1er janvier</th>
              <th className="d">Variation</th>
            </tr>
          </thead>
          <tbody>
            {n.note3.creances.lignes.map((l) => (
              <tr key={'creances' + l.nom}>
                <td>{l.nom}</td>
                <td className="d num">{fmt(l.cloture)}</td>
                <td className="d num">{fmt(l.ouverture)}</td>
                <td className="d num">{pct(l.variation)}</td>
              </tr>
            ))}
            <tr className="total">
              <td>Total des créances</td>
              <td className="d num">{fmt(n.note3.creances.cloture)}</td>
              <td className="d num">{fmt(n.note3.creances.ouverture)}</td>
              <td className="d num">{pct(n.note3.creances.variation)}</td>
            </tr>
            {n.note3.dettes.lignes.map((l) => (
              <tr key={'dettes' + l.nom}>
                <td>{l.nom}</td>
                <td className="d num">{fmt(l.cloture)}</td>
                <td className="d num">{fmt(l.ouverture)}</td>
                <td className="d num">{pct(l.variation)}</td>
              </tr>
            ))}
            <tr className="total">
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

function MentionStock() {
  const { entreprise } = useDossier();
  const texte = useLiveQuery(() => mentionMethodeStock(db, entreprise.id), [entreprise.id]);
  return (
    <>
      {/* AUDCIF, art. 10 et 33 : les règles et méthodes retenues figurent dans les notes annexes. */}
      <p className="aide">
        Règles appliquées : Système minimal de trésorerie (AUDCIF, art. 13 et 21, Titre X). Recettes et dépenses à leur date de paiement ; créances, dettes et stock
        ajoutés à la clôture. Amortissement linéaire sans prorata temporis. Comptes et factures en dollars au taux de clôture, sans prendre de gain non encaissé (art.
        54). Créance déclarée perdue sortie du bilan à sa date.
      </p>
      {texte && <p className="aide">{texte}</p>}
    </>
  );
}

export function Etats() {
  const { chargement, dateRef } = useDossier();
  const { t, langue } = useLangue();
  const [vue, setVue] = useState<Vue>('cr');
  const e = useMemo(() => calculerEtats(chargement.dossier, { auDate: dateRef }), [chargement.dossier, dateRef]);
  const precedent = useLiveQuery(() => etatsPrecedents(db, chargement.exercice.id), [chargement.exercice.id]);
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
      {vue === 'cr' && <CompteDeResultat e={e} p={precedent ?? null} />}
      {vue === 'bilan' && <Bilan e={e} p={precedent ?? null} />}
      {vue === 'notes' && <Notes e={e} />}
      <hr className="filet-cloture" />
      <div className={`tampon ${arrete ? 'ok' : ''}`}>{arrete ? t('etats.arretes', { date: fmtDate(chargement.exercice.arreteLe ?? e.auDate) }) : t('etats.attente')}</div>
      <button className="bouton discret pas-imprime" onClick={() => window.print()}>
        {t('etats.imprimer')}
      </button>
    </>
  );
}
