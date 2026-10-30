/**
 * Tailwind du bureau seulement (l'appli du commerçant n'en a pas).
 * Couleurs de Mbongo, police Archivo (déclarée dans src/bureau/bureau.css), la même que l'appli. Les couleurs passent par leur canal `--x-rgb` pour accepter une opacité
 * (`border-danger/30`) ; le texte garde la variable pleine pour ne jamais passer sous le contraste mesuré.
 */
const COULEURS = [
  'chrome-text',
  'chrome-text-dim',
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

const POLICE = ['Archivo', '"Segoe UI"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Roboto', 'Arial', 'sans-serif'];

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./bureau.html', './src/bureau/**/*.{ts,tsx}', './console/index.html', './src/console/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: POLICE, mono: POLICE },
      colors: Object.fromEntries(COULEURS.map((n) => [n, `rgb(var(--${n}-rgb) / <alpha-value>)`])),
      textColor: Object.fromEntries(COULEURS.map((n) => [n, `var(--${n})`])),
      borderRadius: { DEFAULT: '4px' },
    },
  },
  plugins: [],
};
