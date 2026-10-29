/**
 * Saisie d'une recette, d'une dépense ou d'un transfert, payé ou à crédit.
 * Le formulaire vérifie l'évident ; le moteur vérifie le reste avant toute écriture.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { NATURES_DETTE, NATURES_IMMOBILISATION, type CategorieImmobilisation, type Devise, type Nature, type TypeClient, type TypeOperation } from '../../moteur';
import { useLangue, type Cle } from '../../i18n';
import { ajouterPhoto, enregistrerFacture, enregistrerOperation, ErreurSaisie } from '../../donnees/saisie';
import { lireMontant, lireTaux } from '../../ui/format';
import { Erreurs } from '../composants';
import { compresserPhoto } from '../photo';
import { db, useDossier } from '../session';

const NATURES_RECETTE: Nature[] = ['ventes', 'autres_recettes', 'apport', 'emprunt_recu'];
const NATURES_DEPENSE: Nature[] = [
  'achats_marchandises',
  'achats_fournitures',
  'loyers',
  'salaires',
  'impots_taxes',
  'autres_depenses',
  'materiel',
  'caution',
  'prelevement',
  'interets',
  'remboursement_emprunt',
];
const NATURES_VENTE_CREDIT: Nature[] = ['ventes', 'autres_recettes'];

function natures(type: TypeOperation, credit: boolean): Nature[] {
  if (type === 'transfert') return ['transfert'];
  if (type === 'recette') return credit ? NATURES_VENTE_CREDIT : NATURES_RECETTE;
  return credit ? [...NATURES_DETTE] : NATURES_DEPENSE;
}

export function Saisir() {
  const { chargement, dateRef, taux, annoncer, entreprise, aujourdhui } = useDossier();
  const { t } = useLangue();
  const [, aller] = useLocation();
  const params = useParams<{ type?: string }>();
  const { comptes, exercice } = chargement;

  const depart = params.type ?? 'recette';
  const [type, setType] = useState<TypeOperation>(depart === 'depense' || depart === 'achat-credit' ? 'depense' : depart === 'transfert' ? 'transfert' : 'recette');
  const [credit, setCredit] = useState(depart.endsWith('credit'));
  const [nature, setNature] = useState<Nature>(type === 'depense' ? 'achats_marchandises' : type === 'transfert' ? 'transfert' : 'ventes');
  const [montant, setMontant] = useState('');
  const [deviseCredit, setDeviseCredit] = useState<Devise>('CDF');
  const [compteId, setCompteId] = useState(comptes[0]?.id ?? '');
  const [versId, setVersId] = useState(comptes.find((c) => c.type === 'banque')?.id ?? comptes[1]?.id ?? '');
  const [recu, setRecu] = useState('');
  const [libelle, setLibelle] = useState('');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(dateRef);
  const [tauxTexte, setTauxTexte] = useState(taux ? String(taux) : '');
  const [tiers, setTiers] = useState('');
  const [facture, setFacture] = useState('');
  const [typeClient, setTypeClient] = useState<TypeClient>('particulier');
  const [adresse, setAdresse] = useState('');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [papier, setPapier] = useState(false);
  const [reprise, setReprise] = useState(false);
  const [designation, setDesignation] = useState('');
  const [categorie, setCategorie] = useState<CategorieImmobilisation>('materiel');
  const [duree, setDuree] = useState('5');
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [occupe, setOccupe] = useState(false);
  // Date, détail, facture papier, report du cahier : rarement utiles, repliés par défaut.
  const [options, setOptions] = useState(false);

  useEffect(() => {
    if (taux && !tauxTexte) setTauxTexte(String(taux));
  }, [taux, tauxTexte]);

  const compte = comptes.find((c) => c.id === compteId);
  const vers = comptes.find((c) => c.id === versId);
  const devise: Devise = credit ? deviseCredit : (compte?.devise ?? 'CDF');
  const change = type === 'transfert' && compte && vers && compte.devise !== vers.devise;
  const tauxVisible = type === 'transfert' ? compte?.devise === 'USD' && vers?.devise === 'USD' : devise === 'USD';
  const estBien = !credit && NATURES_IMMOBILISATION.includes(nature);
  const creditPossible = type !== 'transfert';

  const choisirType = (nouveau: TypeOperation) => {
    setType(nouveau);
    setNature(nouveau === 'depense' ? 'achats_marchandises' : nouveau === 'transfert' ? 'transfert' : 'ventes');
    if (nouveau === 'transfert') setCredit(false);
    setErreurs([]);
  };
  const choisirCredit = (oui: boolean) => {
    setCredit(oui);
    if (!natures(type, oui).includes(nature)) setNature(natures(type, oui)[0] ?? 'ventes');
  };

  async function prendrePhoto(fichier: File | undefined) {
    if (!fichier) return;
    try {
      setPhoto(await compresserPhoto(fichier));
    } catch {
      setPhoto(fichier);
    }
  }

  async function enregistrer(e: FormEvent) {
    e.preventDefault();
    const err: string[] = [];
    const m = lireMontant(montant, devise);
    if (!m || m <= 0) err.push(t('saisir.erreur.montant'));
    if (type === 'transfert' && compteId === versId) err.push(t('saisir.erreur.comptes'));
    if (credit && !tiers.trim()) err.push(t('saisir.erreur.nom'));
    const tauxLu = tauxVisible ? lireTaux(tauxTexte) : null;
    if (tauxVisible && !tauxLu) err.push(t('saisir.erreur.taux'));
    const recuLu = change && vers ? lireMontant(recu, vers.devise) : null;
    if (change && !(recuLu && recuLu > 0)) err.push(t('saisir.erreur.montant'));
    const dureeLue = Number(duree);
    if (estBien && nature === 'materiel' && !(Number.isInteger(dureeLue) && dureeLue >= 1 && dureeLue <= 20)) err.push(t('saisir.erreur.duree'));
    setErreurs(err);
    if (err.length || !m || !compte) return;

    const texte = libelle.trim() || (type === 'transfert' ? `${compte.libelle} → ${vers?.libelle ?? ''}` : t(`nature.${nature}` as Cle));
    setOccupe(true);
    try {
      if (credit) {
        const genre = type === 'recette' ? 'creance' : 'dette';
        await enregistrerFacture(db, exercice.id, genre, {
          date,
          facture: facture.trim(),
          nom: tiers.trim(),
          nature,
          montant: m,
          devise,
          taux: devise === 'USD' ? tauxLu : null,
          ...(genre === 'creance' ? { client: typeClient, ...(adresse.trim() ? { adresse: adresse.trim() } : {}) } : {}),
        });
        annoncer(t(genre === 'creance' ? 'saisir.okCreance' : 'saisir.okDette'));
        aller(genre === 'creance' ? '/clients' : '/clients/dettes');
        return;
      }
      const id = await enregistrerOperation(
        db,
        exercice.id,
        {
          date,
          type,
          compte: compte.id,
          ...(type === 'transfert' ? { compteDestination: versId } : {}),
          ...(change && recuLu ? { montantDestination: recuLu } : {}),
          nature,
          libelle: texte,
          montant: m,
          devise: compte.devise,
          taux: tauxVisible ? tauxLu : null,
          piece: photo !== null || papier,
          ...(reprise ? { reprise: true } : {}),
          ...(reference.trim() ? { reference: reference.trim() } : {}),
        },
        estBien ? { designation: designation.trim() || texte, categorie, duree: nature === 'caution' ? 0 : dureeLue } : undefined,
      );
      if (photo) await ajouterPhoto(db, entreprise.id, id, photo);
      annoncer(t('saisir.ok', { compte: compte.libelle }));
      aller(`/journal/${compte.id}/${date.slice(0, 7)}`);
    } catch (x) {
      setErreurs(x instanceof ErreurSaisie ? x.messages : [(x as Error).message]);
    } finally {
      setOccupe(false);
    }
  }

  const libelleCompte = (id: string) => {
    const c = comptes.find((x) => x.id === id);
    return c ? `${c.libelle}${c.devise === 'USD' ? ' (USD)' : ''}` : id;
  };

  if (aujourdhui > exercice.fin) {
    return (
      <>
        <p className="aide">{t('fin.saisir', { annee: exercice.annee, suivante: exercice.annee + 1 })}</p>
        <Link href="/" className="bouton">
          {t('fin.accueil')}
        </Link>
      </>
    );
  }

  return (
    <form onSubmit={enregistrer} noValidate>
      <div className="seg" role="group" aria-label={t('nav.saisir')}>
        <button type="button" className="t-in" aria-pressed={type === 'recette'} onClick={() => choisirType('recette')}>
          {t('saisir.recette')}
        </button>
        <button type="button" className="t-out" aria-pressed={type === 'depense'} onClick={() => choisirType('depense')}>
          {t('saisir.depense')}
        </button>
        <button type="button" aria-pressed={type === 'transfert'} onClick={() => choisirType('transfert')}>
          {t('saisir.transfert')}
        </button>
      </div>

      <div className={credit ? 'ligne-montant' : ''}>
        <label className="champ">
          {t('saisir.montant')} ({devise === 'USD' ? 'USD' : 'CDF'})
          <input
            className="montant"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            aria-invalid={erreurs.includes(t('saisir.erreur.montant'))}
          />
        </label>
        {credit && (
          <label className="champ">
            {t('saisir.devise')}
            <select value={deviseCredit} onChange={(e) => setDeviseCredit(e.target.value as Devise)}>
              <option value="CDF">CDF</option>
              <option value="USD">USD</option>
            </select>
          </label>
        )}
      </div>

      {creditPossible && (
        <label className="case">
          <input type="checkbox" checked={credit} onChange={(e) => choisirCredit(e.target.checked)} />
          <span>{t(type === 'recette' ? 'saisir.credit.recette' : 'saisir.credit.depense')}</span>
        </label>
      )}

      {credit ? (
        <div className="deux-col">
          <label className="champ">
            {t(type === 'recette' ? 'saisir.client' : 'saisir.fournisseur')}
            <input value={tiers} onChange={(e) => setTiers(e.target.value)} autoComplete="off" aria-invalid={erreurs.includes(t('saisir.erreur.nom'))} />
          </label>
          <label className="champ">
            {t('saisir.facture')}
            <input value={facture} onChange={(e) => setFacture(e.target.value)} placeholder={t('saisir.facultatif')} autoComplete="off" />
          </label>
          {type === 'recette' && (
            <>
              <label className="champ">
                {t('client.question')}
                <select value={typeClient} onChange={(e) => setTypeClient(e.target.value as TypeClient)}>
                  <option value="particulier">{t('client.particulier')}</option>
                  <option value="commercant">{t('client.commercant')}</option>
                </select>
              </label>
              <label className="champ">
                {t('client.adresse')}
                <input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder={t('saisir.facultatif')} autoComplete="off" />
              </label>
            </>
          )}
        </div>
      ) : (
        <div className="deux-col">
          <label className="champ">
            {t(type === 'transfert' ? 'saisir.depuis' : 'saisir.compte')}
            <select value={compteId} onChange={(e) => setCompteId(e.target.value)}>
              {comptes.map((c) => (
                <option key={c.id} value={c.id}>
                  {libelleCompte(c.id)}
                </option>
              ))}
            </select>
          </label>
          {type === 'transfert' ? (
            <label className="champ">
              {t('saisir.vers')}
              <select value={versId} onChange={(e) => setVersId(e.target.value)}>
                {comptes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {libelleCompte(c.id)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="champ">
              {t('saisir.nature')}
              <select value={nature} onChange={(e) => setNature(e.target.value as Nature)}>
                {natures(type, false).map((n) => (
                  <option key={n} value={n}>
                    {t(`nature.${n}` as Cle)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {credit && (
        <label className="champ">
          {t('saisir.nature')}
          <select value={nature} onChange={(e) => setNature(e.target.value as Nature)}>
            {natures(type, true).map((n) => (
              <option key={n} value={n}>
                {t(`nature.${n}` as Cle)}
              </option>
            ))}
          </select>
        </label>
      )}

      {change && vers && (
        <label className="champ">
          {t('saisir.recu')} ({vers.devise === 'USD' ? 'USD' : 'CDF'})
          <input inputMode="decimal" value={recu} onChange={(e) => setRecu(e.target.value)} autoComplete="off" />
        </label>
      )}

      {tauxVisible && (
        <label className="champ">
          {t('saisir.taux')}
          <input inputMode="decimal" value={tauxTexte} onChange={(e) => setTauxTexte(e.target.value)} aria-invalid={erreurs.includes(t('saisir.erreur.taux'))} />
        </label>
      )}

      {estBien && (
        <>
          <label className="champ">
            {t('saisir.bien')}
            <input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder={libelle || t(`nature.${nature}` as Cle)} />
          </label>
          {nature === 'materiel' && (
            <div className="deux-col">
              <label className="champ">
                {t('saisir.categorie')}
                <select value={categorie} onChange={(e) => setCategorie(e.target.value as CategorieImmobilisation)}>
                  <option value="materiel">{t('categorie.materiel')}</option>
                  <option value="mobilier">{t('categorie.mobilier')}</option>
                </select>
              </label>
              <label className="champ">
                {t('saisir.duree')}
                <input inputMode="numeric" value={duree} onChange={(e) => setDuree(e.target.value)} />
              </label>
            </div>
          )}
        </>
      )}

      {!credit && (
        <label className="photo-champ">
          <input type="file" accept="image/*" capture="environment" onChange={(e) => void prendrePhoto(e.target.files?.[0])} />
          <span className="bouton discret">{photo ? t('saisir.photoPrise', { taille: Math.round(photo.size / 1024) }) : t('saisir.photo')}</span>
        </label>
      )}

      <button type="button" className="lien-bouton" aria-expanded={options} onClick={() => setOptions(!options)}>
        {t(options ? 'saisir.moinsOptions' : 'saisir.plusOptions')}
      </button>
      {options && (
        <>
          <label className="champ">
            {t('saisir.date')}
            <input type="date" value={date} min={exercice.debut} max={exercice.fin} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="champ">
            {t('saisir.libelle')}
            <input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder={t(`saisir.libelleAide.${type}` as Cle)} />
          </label>
          {!credit && type !== 'transfert' && (
            <label className="champ">
              {t('saisir.reference')}
              <input value={reference} onChange={(e) => setReference(e.target.value)} autoComplete="off" />
            </label>
          )}
          {!credit && !photo && (
            <label className="case">
              <input type="checkbox" checked={papier} onChange={(e) => setPapier(e.target.checked)} />
              <span>{t('saisir.papier')}</span>
            </label>
          )}
          {!credit && type !== 'transfert' && (nature === 'ventes' || nature === 'achats_marchandises') && (
            <label className="case">
              <input type="checkbox" checked={reprise} onChange={(e) => setReprise(e.target.checked)} />
              <span>{t('saisir.reprise')}</span>
            </label>
          )}
        </>
      )}

      <Erreurs messages={erreurs} />
      <button className="bouton" type="submit" disabled={occupe}>
        {t('saisir.enregistrer')}
      </button>
    </form>
  );
}
