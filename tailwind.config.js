/**
 * Tailwind, pour le bureau seulement (assistant, expert, administrateur).
 * Gabarit du skill « dense-desktop-design » (dépôt manatandu/Design_desktop_pro) :
 * seules la police de secours mono et la teinte d'accent changent (voir src/bureau/bureau.css).
 * L'appli du commerçant n'utilise pas Tailwind : le contenu analysé se limite au bureau.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./bureau.html', './src/bureau/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Registre « logiciel professionnel dense » : police système Windows, pas une police web.
        sans: ['"Segoe UI"', 'Tahoma', 'Geneva', 'Verdana', 'system-ui', 'sans-serif'],
        mono: ['Consolas', '"Courier New"', 'ui-monospace', 'monospace'],
      },
      colors: {
        chrome: 'var(--chrome)',
        'chrome-alt': 'var(--chrome-alt)',
        'chrome-border': 'var(--chrome-border)',
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-alt': 'var(--surface-alt)',
        border: 'var(--border)',
        'border-dark': 'var(--border-dark)',
        text: 'var(--text)',
        'text-dim': 'var(--text-dim)',
        sel: 'var(--sel)',
        positive: 'var(--positive)',
        'positive-soft': 'var(--positive-soft)',
        warning: 'var(--warning)',
        'warning-soft': 'var(--warning-soft)',
        danger: 'var(--danger)',
        'danger-soft': 'var(--danger-soft)',
      },
      borderRadius: {
        // Coins carrés partout : un choix délibéré, pas un oubli.
        DEFAULT: '2px',
      },
    },
  },
  plugins: [],
};
