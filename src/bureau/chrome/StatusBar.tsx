export interface StatusBarProps {
  /** Message contextuel à gauche (défaut : "Prêt"). */
  gauche?: string;
  /** Contexte à droite (ex. nom de l'entité · référentiel · période courante). */
  droite?: string;
}

/** Barre d'état en bas d'écran : toujours présente dans l'archétype, jamais omise. */
export function StatusBar({ gauche, droite }: StatusBarProps) {
  return (
    <div className="h-5 bg-chrome border-t border-border flex items-center justify-between px-2.5 text-[10px] text-text-dim">
      <span>{gauche ?? 'Prêt'}</span>
      <span>{droite}</span>
    </div>
  );
}
