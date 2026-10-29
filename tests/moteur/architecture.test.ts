/**
 * Le moteur reste pur : il n'importe rien hors de son dossier et ne lit jamais l'horloge.
 * C'est ce qui permet de l'utiliser à la fois sur le téléphone, au bureau et sur le serveur.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DOSSIER = join(import.meta.dirname, '../../src/moteur');
const fichiers = readdirSync(DOSSIER).filter((f) => f.endsWith('.ts'));

describe('pureté du moteur', () => {
  it.each(fichiers)('%s n’importe que des modules du moteur', (f) => {
    const source = readFileSync(join(DOSSIER, f), 'utf8');
    const imports = [...source.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
    for (const i of imports) expect(i, `${f} importe ${i}`).toMatch(/^\.\/[a-z-]+$/);
  });

  it.each(fichiers)('%s ne lit pas l’horloge', (f) => {
    const source = readFileSync(join(DOSSIER, f), 'utf8');
    expect(source).not.toMatch(/Date\.now\(|new Date\(\)|performance\.now\(|Math\.random\(/);
  });
});
