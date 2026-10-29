import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './bureau.css';
import { Bureau } from './Bureau';

const racine = document.getElementById('bureau');
if (racine) {
  createRoot(racine).render(
    <StrictMode>
      <Bureau />
    </StrictMode>,
  );
}
