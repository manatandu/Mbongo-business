/**
 * Tailwind du bureau seulement (l'appli du commerçant n'en a pas).
 * Repris du kit de design « logiciel de gestion » et adapté à Mbongo : couleurs de la charte Mbongo,
 * police du système uniquement. Les couleurs passent par leur canal `--x-rgb` pour accepter une opacité
 * (`border-danger/30`) ; le texte garde la variable pleine pour ne jamais passer sous le contraste mesuré.
 */
const COULEURS = [
  'chrome',
  'mica',
  'chrome-alt',
  'chrome-border',
  'chrome-text',
  'chrome-text-dim',
  'bg',
  'surface',
  'surface-alt',
  'border',
  'border-dark',
  'text',
  'text-dim',
  'sel',
  'sel-soft',
  'positive',
  'positive-soft',
  'warning',
  'warning-soft',
  'danger',
  'danger-soft',
];

const SYSTEME = ['"Segoe UI Variable Text"', '"Segoe UI"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Roboto', 'Arial', 'sans-serif'];

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./bureau.html', './src/bureau/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Une seule police : celle du système. Le nom Mbongo s'écrit dans la même, en gras.
      fontFamily: { sans: SYSTEME, mono: SYSTEME, marque: SYSTEME },
      colors: Object.fromEntries(COULEURS.map((n) => [n, `rgb(var(--${n}-rgb) / <alpha-value>)`])),
      textColor: Object.fromEntries(COULEURS.map((n) => [n, `var(--${n})`])),
      borderRadius: { DEFAULT: '4px' },
      boxShadow: {
        plate: 'var(--ombre-plate)',
        posee: 'var(--ombre-posee)',
        flottante: 'var(--ombre-flottante)',
        dominante: 'var(--ombre-dominante)',
      },
    },
  },
  plugins: [],
};
