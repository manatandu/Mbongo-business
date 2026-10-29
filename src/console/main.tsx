import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../bureau/bureau.css';
import { Console } from './Console';

const racine = document.getElementById('console');
if (racine) {
  createRoot(racine).render(
    <StrictMode>
      <Console />
    </StrictMode>,
  );
}
