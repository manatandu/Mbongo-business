import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../ui/styles.css';
import { App } from './App';

// Demande au navigateur de ne pas effacer la base locale quand la mémoire manque.
void navigator.storage?.persist?.();

const racine = document.getElementById('racine');
if (racine) {
  try {
    document.documentElement.lang = localStorage.getItem('mbongo.langue') === 'ln' ? 'ln' : 'fr';
  } catch {
    // Stockage indisponible (navigation privée) : français par défaut.
  }
  createRoot(racine).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
