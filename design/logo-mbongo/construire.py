"""Construit les symboles de la piste C (compte au bâton). python3 construire.py"""
import math
ANGLE, EP, JOINT, HAUT, BAS = 16, 24, 7, 48, 208
t = math.tan(math.radians(ANGLE)); g = (EP / 2 + JOINT) / math.cos(math.radians(ANGLE))

def barres(c):
    out = []
    for cx in (66, 106, 146, 186):
        yc = 128 + t * (126 - cx)
        out.append(f'<rect x="{cx-12}" y="{HAUT}" width="24" height="{yc-g-HAUT:.1f}" rx="12" fill="{c}"/>')
        out.append(f'<rect x="{cx-12}" y="{yc+g:.1f}" width="24" height="{BAS-(yc+g):.1f}" rx="12" fill="{c}"/>')
    return '\n    '.join(out)

def trait(c):
    return f'<rect x="18" y="{128-EP/2}" width="216" height="{EP}" rx="{EP/2}" fill="{c}" transform="rotate(-{ANGLE} 126 128)"/>'

def symbole(barre, travers):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <g>
    {barres(barre)}
    {trait(travers)}
  </g>
</svg>
'''

def tuile(fond, barre, travers, echelle=0.74):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="58" fill="{fond}"/>
  <g transform="translate(128 128) scale({echelle}) translate(-126 -128)">
    {barres(barre)}
    {trait(travers)}
  </g>
</svg>
'''

if __name__ == '__main__':
    open('c-symbole.svg', 'w').write(symbole('#000', '#000'))
    open('c-tuile-couleur.svg', 'w').write(tuile('#0B2A52', '#FFFFFF', '#E0B21B'))
