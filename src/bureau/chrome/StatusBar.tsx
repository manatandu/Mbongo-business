export interface StatusBarProps {
  /** Message contextuel à gauche (défaut : "Prêt"). */
  gauche?: string;
  /** Contexte à droite (ex. nom de l'entité · référentiel · période courante). */
  droite?: string;
}

/** Barre d'état en bas d'écran : toujours présente dans l'archétype, jamais omise. */
export function StatusBar({ gauche, droite }: StatusBarProps) {
  return (
    <div className="h-6 bg-chrome border-t border-chrome-border flex items-center justify-between gap-4 px-3 text-[11px] text-text-dim">
      <span>{gauche ?? 'Prêt'}</span>
      <span>{droite}</span>
    </div>
  );
}
