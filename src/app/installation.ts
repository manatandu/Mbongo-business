/**
 * Appli installée sur l'écran d'accueil, qui s'ouvre sans réseau.
 * Le service worker garde l'appli en cache ; les données restent dans la base locale.
 * Une nouvelle version n'est appliquée que si le commerçant le demande : jamais au milieu d'une saisie.
 */
import { useSyncExternalStore } from 'react';

interface EvenementInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Etat {
  /** Une nouvelle version attend d'être appliquée. */
  majPrete: boolean;
  /** L'appli est en cache : elle s'ouvrira sans réseau. */
  horsLignePret: boolean;
  /** Le navigateur propose l'installation. */
  peutInstaller: boolean;
  /** Ouverte depuis l'écran d'accueil. */
  installee: boolean;
}

let etat: Etat = { majPrete: false, horsLignePret: false, peutInstaller: false, installee: false };
let demande: EvenementInstallation | null = null;
let appliquer: ((recharger?: boolean) => Promise<void>) | null = null;
const abonnes = new Set<() => void>();

function changer(m: Partial<Etat>) {
  etat = { ...etat, ...m };
  abonnes.forEach((f) => f());
}

export function demarrerInstallation(): void {
  if (typeof window === 'undefined') return;
  changer({ installee: window.matchMedia?.('(display-mode: standalone)').matches ?? false });
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    demande = e as EvenementInstallation;
    changer({ peutInstaller: true });
  });
  window.addEventListener('appinstalled', () => {
    demande = null;
    changer({ peutInstaller: false, installee: true });
  });
  // En développement, pas de service worker : le module n'existe qu'à la construction.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    void import('virtual:pwa-register').then(({ registerSW }) => {
      appliquer = registerSW({
        onNeedRefresh: () => changer({ majPrete: true }),
        onOfflineReady: () => changer({ horsLignePret: true }),
        onRegisteredSW: (_url, r) => {
          if (r?.active) changer({ horsLignePret: true });
        },
      });
    });
  }
}

export async function installer(): Promise<void> {
  if (!demande) return;
  await demande.prompt();
  await demande.userChoice;
  demande = null;
  changer({ peutInstaller: false });
}

export function mettreAJour(): void {
  // On recharge dès que la nouvelle version prend la main. Le module d'enregistrement ne le fait pas
  // quand la version a été trouvée après l'ouverture de la page : on ne compte pas sur lui.
  let fait = false;
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (fait) return;
    fait = true;
    window.location.reload();
  });
  void appliquer?.(true);
}

export function useInstallation(): Etat {
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    () => etat,
  );
}
