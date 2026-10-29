/**
 * Icônes SVG inline, tracé simple et cohérent. Gabarit du skill « dense-desktop-design »,
 * complété pour Mbongo en suivant le même gabarit (`base()`).
 */
import type { ComponentType, SVGProps } from 'react';

export type Icone = ComponentType<SVGProps<SVGSVGElement>>;

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'square' as const,
  ...props,
});

export const IconHome = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 11l9-7 9 7M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9" /></svg>
);
export const IconDashboard = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 13h6V4H4v9zM14 20h6V4h-6v16zM4 20h6v-4H4v4z" /></svg>
);
export const IconNew = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconList = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 6h16M4 12h16M4 18h10" /></svg>
);
export const IconRefresh = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 4v6h6M20 20v-6h-6M4 10a8 8 0 0114-5.3M20 14a8 8 0 01-14 5.3" /></svg>
);
export const IconExport = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></svg>
);
export const IconPrint = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 9V3h12v6M6 18H4a1 1 0 01-1-1v-5a1 1 0 011-1h16a1 1 0 011 1v5a1 1 0 01-1 1h-2M6 14h12v7H6z" /></svg>
);
export const IconFilter = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 5h16l-6 8v6l-4-2v-4z" /></svg>
);
export const IconSearch = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
);
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M20 6L9 17l-5-5" /></svg>
);
export const IconLogo = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 19V6l8 8 8-8v13" /></svg>
);
export const IconFolderOpen = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 7a1 1 0 011-1h4l2 2h10a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V7z" /></svg>
);
export const IconBook = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 19.5A2.5 2.5 0 016.5 17H20V4H6.5A2.5 2.5 0 004 6.5v13z" /></svg>
);
export const IconInfo = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.01" /></svg>
);
export const IconLock = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="5" y="11" width="14" height="9" rx="1.5" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
);
export const IconUsers = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3 20v-1.5A4.5 4.5 0 017.5 14h3A4.5 4.5 0 0115 18.5V20" /><circle cx="17" cy="9" r="2.6" /><path d="M15.5 14.2A4 4 0 0121 18v2" /></svg>
);
export const IconAlert = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3l9 16H3zM12 10v4M12 17v.01" /></svg>
);
export const IconScale = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 4v16M6 20h12M5 8h14M5 8l-3 6h6zM19 8l-3 6h6z" /></svg>
);
export const IconCoins = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><ellipse cx="9" cy="7" rx="6" ry="2.5" /><path d="M3 7v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V7M9 16.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4c0-1.4-2.7-2.5-6-2.5" /></svg>
);
export const IconBox = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10" /></svg>
);
export const IconTool = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 8h16v11H4zM8 8V5h8v3M4 13h16" /></svg>
);
export const IconStamp = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M9 3h6v5l-1 4h4l2 4H4l2-4h4L9 8zM4 20h16" /></svg>
);
export const IconHistory = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 12a9 9 0 103-6.7M3 4v5h5M12 7v5l3 3" /></svg>
);
export const IconPhone = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="7" y="2.5" width="10" height="19" rx="1.5" /><path d="M11 18h2" /></svg>
);
