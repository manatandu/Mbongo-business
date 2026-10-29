/** Lance la prévisualisation de la construction (dist/) pour les essais Playwright. */
const { spawn } = require('node:child_process');
const path = require('node:path');

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

async function lancerServeur(port) {
  // Vite lancé directement (pas par npx) : à la fin, on arrête bien le serveur lui-même.
  const p = spawn(path.join(__dirname, '..', 'node_modules', '.bin', 'vite'), ['preview', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`http://localhost:${port}/`)).ok) return p;
    } catch {
      // pas encore prêt
    }
    await attendre(200);
  }
  p.kill();
  throw new Error('Le serveur de prévisualisation ne répond pas. La construction a-t-elle été faite (npm run build) ?');
}

module.exports = { lancerServeur, attendre };
