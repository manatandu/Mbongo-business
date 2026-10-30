/** Petits composants communs aux écrans. */
import type { ReactNode } from 'react';
import type { Devise, Montant } from '../moteur';
import { fmtMontant } from '../ui/format';

const TRACES: Record<string, string> = {
  accueil: 'M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z',
  saisir: 'M12 5v14M5 12h14',
  journal: 'M6 4h11a1 1 0 0 1 1 1v15H7a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1zM9 8h6M9 12h6M9 16h4',
  clients: 'M9 5.8a3.2 3.2 0 1 0 0 6.4a3.2 3.2 0 1 0 0-6.4zM3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6M15.5 6.5a3 3 0 0 1 0 5.6M17.5 14.8c1.6.6 2.6 2 3 4.2',
  plus: 'M5 6h14M5 12h14M5 18h14',
  echeances: 'M5 6h14v14H5zM5 10h14M9 3.5v4M15 3.5v4M9 14h2M13 14h2M9 17h2',
  livre: 'M12 6.5C10 5 7 4.5 4 5v14c3-.5 6 0 8 1.5c2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v14',
  achats: 'M5 8h14l-1.2 12H6.2zM9 8V6.5a3 3 0 0 1 6 0V8',
  deconnexion: 'M10 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M15 8l4 4l-4 4M19 12H9',
  etats: 'M5 20V10M10 20V4M15 20v-7M20 20V8',
  materiel: 'M4 8h16v11H4zM8 8V5h8v3M4 13h16',
  stock: 'M3 7l9-4l9 4l-9 4zM3 7v10l9 4l9-4V7M12 11v10',
  reglages:
    'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6zM19 12a7 7 0 0 0-.1-1.2l2-1.5l-2-3.4l-2.3.9a7 7 0 0 0-2.1-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2.1 1.2l-2.3-.9l-2 3.4l2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5l2 3.4l2.3-.9a7 7 0 0 0 2.1 1.2L10 21h4l.5-2.6a7 7 0 0 0 2.1-1.2l2.3.9l2-3.4l-2-1.5c.1-.4.1-.8.1-1.2z',
};

export function Icone({ nom }: { nom: keyof typeof TRACES | string }) {
  return (
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
      <path d={TRACES[nom] ?? ''} />
    </svg>
  );
}

/** Logo de Mbongo : le compte au bâton. Quatre traits, le cinquième en travers (design/logo-mbongo). */
export function Marque() {
  return (
    <svg className="marque" viewBox="0 0 256 256" aria-hidden="true">
      <rect className="tuile" width="256" height="256" rx="58" />
      <g transform="translate(128 128) scale(0.74) translate(-126 -128)">
        <g className="traits">
          <rect className="b0" x="54" y="48" width="24" height="77.4" rx="12" />
          <rect className="b0" x="54" y="165.0" width="24" height="43.0" rx="12" />
          <rect className="b1" x="94" y="48" width="24" height="66.0" rx="12" />
          <rect className="b1" x="94" y="153.5" width="24" height="54.5" rx="12" />
          <rect className="b2" x="134" y="48" width="24" height="54.5" rx="12" />
          <rect className="b2" x="134" y="142.0" width="24" height="66.0" rx="12" />
          <rect className="b3" x="174" y="48" width="24" height="43.0" rx="12" />
          <rect className="b3" x="174" y="130.6" width="24" height="77.4" rx="12" />
        </g>
        <rect className="travers" x="18" y="116.0" width="216" height="24" rx="12" transform="rotate(-16 126 128)" />
      </g>
    </svg>
  );
}

export function Montant({ valeur, devise, signe, classe = '' }: { valeur: Montant; devise: Devise; signe?: '+' | '−' | '↔'; classe?: string }) {
  return (
    <span className={`num ${classe}`}>
      {signe ? `${signe} ` : ''}
      {fmtMontant(valeur, devise)}
    </span>
  );
}

export function Pastille({ ton, children }: { ton: 'ok' | 'warn' | 'bad' | 'info'; children: ReactNode }) {
  return <span className={`pill ${ton}`}>{children}</span>;
}

export function Erreurs({ messages }: { messages: string[] }) {
  if (!messages.length) return null;
  return (
    <div role="alert">
      {messages.map((m) => (
        <p className="erreur" key={m}>
          {m}
        </p>
      ))}
    </div>
  );
}
