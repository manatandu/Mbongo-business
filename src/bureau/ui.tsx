/** Petits éléments d'écran du bureau. */
import type { ReactNode } from 'react';

/** La page : papier blanc à marge dorée, titre large en bleu nuit. Une par écran. */
export function Fenetre({ titre, droite, classe, children }: { titre: string; droite?: ReactNode; classe?: string; children: ReactNode }) {
  return (
    <section className={classe ? `fenetre ${classe}` : 'fenetre'}>
      <div className="fenetre-titre">
        <h1>{titre}</h1>
        {droite}
      </div>
      <div className="fenetre-corps">{children}</div>
    </section>
  );
}

/** Bloc de contenu à titre, posé dans la page : un titre, un filet bleu nuit, pas de carte. */
export function Carte({ titre, droite, children }: { titre: string; droite?: ReactNode; children: ReactNode }) {
  return (
    <section className="encart">
      <div className="encart-titre">
        <h2>{titre}</h2>
        {droite}
      </div>
      <div className="encart-corps">{children}</div>
    </section>
  );
}

export function Pastille({ ton, children }: { ton: 'ok' | 'avert' | 'danger' | 'neutre'; children: ReactNode }) {
  const c = {
    ok: 'bg-positive-soft text-positive border-positive/30',
    avert: 'bg-warning-soft text-warning border-warning/30',
    danger: 'bg-danger-soft text-danger border-danger/30',
    neutre: 'bg-sel-soft text-sel border-sel/20',
  }[ton];
  return <span className={`pastille ${c}`}>{children}</span>;
}

export function Message({ ton, children }: { ton: 'ok' | 'avert' | 'danger'; children: ReactNode }) {
  const c = { ok: 'text-positive', avert: 'text-warning', danger: 'text-danger' }[ton];
  return <div className={`message ${ton} ${c}`}>{children}</div>;
}
