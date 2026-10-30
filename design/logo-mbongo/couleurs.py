"""Versions en couleur (tuile bleu nuit) des six pistes, et lockups avec le nom en tracés. python3 couleurs.py"""
import re
import outils

NUIT, OR, BLANC = '#0B2A52', '#E0B21B', '#FFFFFF'

def interieur(f):
    s = open(f).read()
    return s[s.index('>', s.index('<svg')) + 1:s.rindex('</svg>')]

def recolore(piste, corps, BLANC=BLANC, OR=OR):
    if piste == 'a':
        corps = corps.replace('<rect x="16" y="16" width="224" height="224" rx="52" fill="#000"/>', '')
        corps = corps.replace('fill="#fff"', f'fill="{BLANC}"')
        return re.sub(r'(<polygon[^>]*fill=")[^"]+', r'\g<1>' + OR, corps), 1.18
    if piste == 'b':
        corps = corps.replace('fill="#000"', f'fill="{BLANC}"')
        return corps.replace('<rect x="94" y="52" width="28" height="128" fill="#FFFFFF"/>', f'<rect x="94" y="52" width="28" height="128" fill="{OR}"/>'), 0.8
    if piste == 'c':
        corps = re.sub(r'<rect ([^>]*)fill="#000" transform', r'<rect \1fill="' + OR + '" transform', corps)
        return corps.replace('fill="#000"', f'fill="{BLANC}"'), 0.74
    if piste == 'd':
        return corps.replace('fill="#000"', f'fill="{OR}"'), 0.78
    if piste == 'e':
        corps = re.sub(r'fill="#000" fill-opacity="1"', f'fill="{BLANC}"', corps)
        return re.sub(r'fill="#000" fill-opacity="0.5"', f'fill="{OR}"', corps), 0.8
    if piste == 'f':
        corps = re.sub(r'<rect ([^>]*)fill="#000"', r'<rect \1fill="' + OR + '"', corps)
        return corps.replace('fill="#000"', f'fill="{BLANC}"'), 0.86

def tuile(piste, fond=NUIT, principal=BLANC, accent=OR):
    corps, e = recolore(piste, interieur(f'{piste}-symbole.svg'), principal, accent)
    return f'<rect width="256" height="256" rx="58" fill="{fond}"/><g transform="translate(128 128) scale({e}) translate(-128 -128)">{corps}</g>'

def lockup(piste, couleur_nom=NUIT):
    """Tuile + « Mbongo » en tracés, hauteur 256."""
    d, _, _ = outils.traces('Mbongo', 92, graisse=800, largeur=118)
    x0, y0, x1, y1 = outils.boite('Mbongo', 92, graisse=800, largeur=118)
    base = 128 + (-y0) / 2 - 6
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {256 + 56 + x1 - x0:.0f} 256">{tuile(piste)}'
            f'<path fill="{couleur_nom}" d="{d}" transform="translate({256 + 56 - x0:.1f} {base:.1f})"/></svg>\n')

if __name__ == '__main__':
    for p in 'abcdef':
        open(f'{p}-tuile-couleur.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">{tuile(p)}</svg>\n')
        open(f'{p}-lockup-couleur.svg', 'w').write(lockup(p))
