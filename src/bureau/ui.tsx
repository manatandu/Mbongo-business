/** Petits éléments d'écran du bureau. */
import type { ReactNode } from 'react';

/** Fenêtre du kit : barre de titre à l'encre, corps sur fond de fenêtre. Une par écran. */
export function Fenetre({ titre, droite, children }: { titre: string; droite?: ReactNode; children: ReactNode }) {
  return (
    <section className="fenetre">
      <div className="fenetre-titre">
        <h1 className="m-0 text-[14px] font-semibold">{titre}</h1>
        {droite}
      </div>
      <div className="fenetre-corps">{children}</div>
    </section>
  );
}

/** Bloc de contenu à titre, posé dans une fenêtre. */
export function Carte({ titre, droite, children }: { titre: string; droite?: ReactNode; children: ReactNode }) {
  return (
    <section className="encart">
      <div className="encart-titre">
        <h2 className="m-0 text-[14px] font-semibold">{titre}</h2>
        {droite}
      </div>
      <div className="p-3 flex flex-col gap-3">{children}</div>
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
  const c = { ok: 'border-positive/30 bg-positive-soft text-positive', avert: 'border-warning/30 bg-warning-soft text-warning', danger: 'border-danger/30 bg-danger-soft text-danger' }[ton];
  return <div className={`border px-3 py-2 rounded ${c}`}>{children}</div>;
}
