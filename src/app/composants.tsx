/** Petits composants communs aux écrans. */
import type { ReactNode } from 'react';
import type { Devise, Montant } from '../moteur';
import { fmtMontant } from '../ui/format';

const TRACES: Record<string, string> = {
  accueil: 'M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z',
  saisir: 'M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17zM12 8v8M8 12h8',
  journal: 'M6 4h11a1 1 0 0 1 1 1v15H7a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1zM9 8h6M9 12h6M9 16h4',
  clients: 'M9 5.8a3.2 3.2 0 1 0 0 6.4a3.2 3.2 0 1 0 0-6.4zM3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6M15.5 6.5a3 3 0 0 1 0 5.6M17.5 14.8c1.6.6 2.6 2 3 4.2',
  plus: 'M5 6h14M5 12h14M5 18h14',
  etats: 'M5 20V10M10 20V4M15 20v-7M20 20V8',
  materiel: 'M4 8h16v11H4zM8 8V5h8v3M4 13h16',
  stock: 'M3 7l9-4l9 4l-9 4zM3 7v10l9 4l9-4V7M12 11v10',
  reglages: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6zM19 12a7 7 0 0 0-.1-1.2l2-1.5l-2-3.4l-2.3.9a7 7 0 0 0-2.1-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2.1 1.2l-2.3-.9l-2 3.4l2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5l2 3.4l2.3-.9a7 7 0 0 0 2.1 1.2L10 21h4l.5-2.6a7 7 0 0 0 2.1-1.2l2.3.9l2-3.4l-2-1.5c.1-.4.1-.8.1-1.2z',
};

export function Icone({ nom }: { nom: keyof typeof TRACES | string }) {
  return (
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
      <path d={TRACES[nom] ?? ''} />
    </svg>
  );
}

export function Marque() {
  return (
    <div className="marque" aria-hidden="true">
      <span>M</span>
    </div>
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
