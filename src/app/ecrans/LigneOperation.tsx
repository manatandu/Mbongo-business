/** Une saisie dans une liste : libellé, montant signé, date, compte, nature. */
import type { Operation } from '../../moteur';
import { useLangue, type Cle } from '../../i18n';
import { fmtDate } from '../../ui/format';
import { Montant, Pastille } from '../composants';

export function LigneOperation({ operation: o, libelleCompte }: { operation: Operation; libelleCompte: (id: string) => string }) {
  const { t } = useLangue();
  const entree = o.type === 'recette' ? !o.annule : o.type === 'depense' ? Boolean(o.annule) : null;
  const signe = entree === null ? '↔' : entree ? '+' : '−';
  const ou = o.type === 'transfert' ? `${libelleCompte(o.compte)} → ${libelleCompte(o.compteDestination ?? '')}` : libelleCompte(o.compte);
  return (
    <div className="ligne">
      <div className="l">{o.libelle}</div>
      <Montant valeur={o.montant} devise={o.devise} signe={signe} classe={entree === null ? '' : entree ? 'amt-in' : 'amt-out'} />
      <div className="meta">
        <span>{fmtDate(o.date)}</span>
        <span>{ou}</span>
        <span>{t(`nature.${o.nature}` as Cle)}</span>
        {o.annule && <Pastille ton="info">{t('journal.annulation')}</Pastille>}
        {!o.piece && <Pastille ton="warn">{t('journal.sansPiece')}</Pastille>}
      </div>
    </div>
  );
}
