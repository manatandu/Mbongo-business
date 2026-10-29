/** Éléments d'écran du bureau, dans le registre du kit adapté à Mbongo. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LignesSquelette } from './kit/Squelette';

/**
 * Bulle d'aide « ? » : l'explication reste à portée sans encombrer l'écran.
 * Un écran sobre n'a pas de paragraphe explicatif permanent.
 */
export function Aide({ titre, children }: { titre: string; children: ReactNode }) {
  const [ouverte, setOuverte] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ouverte) return;
    const fermer = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOuverte(false);
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && setOuverte(false);
    document.addEventListener('mousedown', fermer);
    document.addEventListener('keydown', echap);
    return () => {
      document.removeEventListener('mousedown', fermer);
      document.removeEventListener('keydown', echap);
    };
  }, [ouverte]);
  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label={`Aide : ${titre}`}
        aria-expanded={ouverte}
        onClick={() => setOuverte(!ouverte)}
        className="w-[18px] h-[18px] rounded-full border border-white/40 text-[11px] font-semibold leading-none grid place-items-center text-chrome-text hover:bg-white/15"
      >
        ?
      </button>
      {ouverte && (
        <span role="note" className="panneau-menu anim-menu absolute right-0 top-[calc(100%+6px)] z-30 w-[320px] rounded-lg border border-border p-3 text-[12px] text-text font-normal">
          {children}
        </span>
      )}
    </span>
  );
}

/**
 * Fenêtre active : barre de titre à l'encre, contenu sur le fond de fenêtre.
 * Le titre de la fenêtre est le titre de l'écran : rien ne le répète dessous.
 */
export function Fenetre({ titre, sousTitre, aide, children }: { titre: string; sousTitre?: string; aide?: ReactNode; children: ReactNode }) {
  return (
    <section className="anim-fenetre shadow-posee bg-surface border border-border rounded-lg" style={{ overflow: 'visible' }}>
      <div className="h-8 flex items-center gap-3 px-3 text-white rounded-t-lg" style={{ background: 'var(--bandeau)' }}>
        <h1 className="m-0 text-[12.5px] font-semibold">{titre}</h1>
        {sousTitre && <span className="text-[12px] text-chrome-text-dim truncate">{sousTitre}</span>}
        <span className="flex-1" />
        {aide && <Aide titre={titre}>{aide}</Aide>}
      </div>
      <div className="p-3 flex flex-col gap-3 rounded-b-lg" style={{ background: 'var(--fenetre)' }}>
        {children}
      </div>
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

/** Message dans la fenêtre : refus, avertissement ou confirmation. */
export function Message({ ton, children }: { ton: 'ok' | 'avert' | 'danger'; children: ReactNode }) {
  const c = { ok: 'border-positive/30 bg-positive-soft text-positive', avert: 'border-warning/30 bg-warning-soft text-warning', danger: 'border-danger/30 bg-danger-soft text-danger' }[ton];
  return <div className={`anim-alerte border px-3 py-2 rounded text-[12px] ${c}`}>{children}</div>;
}

/** Chargement : la forme de ce qui arrive ; dossier introuvable : ce qu'il faut faire. */
export function Chargement({ etat }: { etat: unknown }) {
  if (etat === undefined) {
    return (
      <Fenetre titre="Ouverture du dossier">
        <span className="sr-only">Chargement…</span>
        <LignesSquelette lignes={5} />
      </Fenetre>
    );
  }
  return (
    <Fenetre titre="Dossier introuvable">
      <p className="m-0">Ce dossier n'est pas sur ce poste. Revenez au portefeuille (menu Fichier) et ouvrez un dossier de la liste.</p>
    </Fenetre>
  );
}
