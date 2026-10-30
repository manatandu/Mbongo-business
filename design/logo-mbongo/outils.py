"""Outils communs du logo Mbongo : le nom en tracés (Archivo, aucun texte vivant), rendu PNG par Chromium."""
import io
import os
from functools import lru_cache

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ICI = os.path.dirname(os.path.abspath(__file__))
POLICE = os.path.join(ICI, '..', '..', 'src', 'ui', 'polices', 'archivo-latin-wdth-normal.woff2')


@lru_cache(maxsize=8)
def police(graisse: int, largeur: float) -> TTFont:
    """Instance fixe d'Archivo variable (licence OFL : usage en logo permis)."""
    f = TTFont(POLICE)
    return instancer.instantiateVariableFont(f, {'wght': graisse, 'wdth': largeur})


def traces(texte: str, hauteur_x: float, graisse=800, largeur=118.0, interlettre=-0.02):
    """Retourne (d, largeur, hauteur_capitale) ; ligne de base à y = 0, x commence à 0.
    `hauteur_x` : hauteur des minuscules (x-height) en unités SVG. `interlettre` : en fraction de hauteur_x."""
    f = police(graisse, largeur)
    cmap, glyphes = f.getBestCmap(), f.getGlyphSet()
    e = hauteur_x / f['OS/2'].sxHeight
    pen = SVGPathPen(glyphes)
    x = 0.0
    for car in texte:
        g = glyphes[cmap[ord(car)]]
        g.draw(TransformPen(pen, (e, 0, 0, -e, x, 0)))
        x += g.width * e + interlettre * hauteur_x
    x -= interlettre * hauteur_x
    return pen.getCommands(), x, f['OS/2'].sCapHeight * e


def boite(texte: str, hauteur_x: float, **k):
    """Boîte réelle (xmin, ymin, xmax, ymax) des tracés, ligne de base à 0, y vers le bas."""
    f = police(k.get('graisse', 800), k.get('largeur', 118.0))
    cmap, glyphes = f.getBestCmap(), f.getGlyphSet()
    e = hauteur_x / f['OS/2'].sxHeight
    bp = BoundsPen(glyphes)
    x = 0.0
    for car in texte:
        g = glyphes[cmap[ord(car)]]
        g.draw(TransformPen(bp, (e, 0, 0, -e, x, 0)))
        x += g.width * e + k.get('interlettre', -0.02) * hauteur_x
    return bp.bounds


def png(svg_fichiers, taille, dossier):
    """Rend des SVG en PNG transparents (Chromium par Playwright)."""
    import json
    import subprocess
    script = f"""
const {{ chromium }} = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {{
  const b = await chromium.launch(); const p = await b.newPage();
  for (const [f, t] of {json.dumps([[os.path.abspath(f), t] for f, t in [(f, taille) if isinstance(taille, int) else (f, taille[i]) for i, f in enumerate(svg_fichiers)]])}) {{
    const svg = fs.readFileSync(f, 'utf8'); const m = svg.match(/viewBox="0 0 ([\\d.]+) ([\\d.]+)"/);
    const r = m ? m[1] / m[2] : 1; const l = r >= 1 ? t : Math.round(t * r); const h = r >= 1 ? Math.round(t / r) : t;
    await p.setViewportSize({{ width: l, height: h }});
    await p.setContent(`<html><body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${{Buffer.from(svg).toString('base64')}}" width="${{l}}" height="${{h}}" style="display:block"></body></html>`);
    await p.screenshot({{ path: path.join({json.dumps(os.path.abspath(dossier))}, path.basename(f).replace('.svg', '') + '-' + t + '.png'), omitBackground: true }});
  }}
  await b.close();
}})();
"""
    env = dict(os.environ, NODE_PATH='/opt/node-tools/node_modules')
    subprocess.run(['node', '-e', script], check=True, env=env)
