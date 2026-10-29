"""Convertit un texte en tracés SVG (aucun texte vivant dans un logo final).

Police : IBM Plex Sans 600 (licence OFL, usage en logo permis), celle de la marque Mbongo.
    python3 texte_en_traces.py "CONSULTING" --hauteur 40 --interlettre 0.18
Écrit sur la sortie le contenu d'un <path d="..."/>, origine en haut à gauche du texte, et la largeur obtenue.
"""
import argparse
import os

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

POLICE = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'src', 'ui', 'polices', 'ibm-plex-sans-latin-600-normal.woff2')


def traces(texte: str, hauteur: float, interlettre: float):
    """Retourne (d, largeur) pour un texte dont les capitales mesurent `hauteur`."""
    f = TTFont(POLICE)
    cmap = f.getBestCmap()
    glyphes = f.getGlyphSet()
    capitale = f['OS/2'].sCapHeight or 698
    e = hauteur / capitale
    pen = SVGPathPen(glyphes)
    x = 0.0
    for i, car in enumerate(texte):
        nom = cmap[ord(car)]
        g = glyphes[nom]
        # Unités de police (y vers le haut) vers SVG (y vers le bas), ligne de base à y = hauteur.
        g.draw(TransformPen(pen, (e, 0, 0, -e, x, hauteur)))
        x += g.width * e + (interlettre * hauteur if i < len(texte) - 1 else 0)
    return pen.getCommands(), x


if __name__ == '__main__':
    a = argparse.ArgumentParser()
    a.add_argument('texte')
    a.add_argument('--hauteur', type=float, default=40)
    a.add_argument('--interlettre', type=float, default=0.18, help='espace ajouté entre lettres, en fraction de la hauteur')
    o = a.parse_args()
    d, l = traces(o.texte, o.hauteur, o.interlettre)
    print(f'<path d="{d}"/>')
    print(f'<!-- largeur {l:.1f} -->')
