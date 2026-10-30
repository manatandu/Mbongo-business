"""Pistes D, E, F du logo Mbongo, en noir. python3 pistes2.py"""
import outils

def svg(corps, vb='0 0 256 256'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">\n{corps}\n</svg>\n'

# D. Le nzimbu : la coquille-monnaie du royaume Kongo, vue de dessous. Une fente, et ses dents qui la mordent.
fente = 'M128 56c13 0 16 30 16 72s-3 72-16 72s-16-30-16-72s3-72 16-72Z'
dents = ''.join(f'<rect x="{112 if c else 133}" y="{y}" width="11" height="9" rx="2" fill="#000"/>' for y in range(76, 176, 22) for c in (True, False))
d = svg(f'''  <path fill="#000" fill-rule="evenodd" d="M128 22C180 22 210 72 210 128S180 234 128 234S46 184 46 128S76 22 128 22Z {fente}"/>
  {dents}''')
open('d-symbole.svg', 'w').write(d)

# E. Le billet plié : un billet plié en accordéon, tenu debout. Le haut des plis dessine un M ; le bas est droit.
xs, haut, bas, j = [40, 84, 128, 172, 216], [70, 48, 112, 48, 70], 208, 4
pans = []
for i in range(4):
    x0, x1, h0, h1 = xs[i] + j, xs[i + 1] - j, haut[i], haut[i + 1]
    a = (h1 - h0) / (xs[i + 1] - xs[i])
    pans.append(f'<path fill="#000" fill-opacity="{1 if i % 2 == 0 else 0.5}" d="M{x0} {h0 + a * j:.1f}L{x1} {h1 - a * j:.1f}V{bas}H{x0}Z"/>')
e = svg('  ' + '\n  '.join(pans))
open('e-symbole.svg', 'w').write(e)

# F. Le total : le nom souligné deux fois, comme on clôt un total. Symbole : le m seul, souligné deux fois.
def mot_souligne(texte, couleur_mot='#000', couleur_traits='#000'):
    dm, _, _ = outils.traces(texte, 100, graisse=800, largeur=125, interlettre=-0.03)
    x0, y0, x1, y1 = outils.boite(texte, 100, graisse=800, largeur=125, interlettre=-0.03)
    l = x1 - x0
    traits = f'<rect x="0" y="{y1 + 22:.1f}" width="{l:.1f}" height="14" rx="7" fill="{couleur_traits}"/><rect x="0" y="{y1 + 46:.1f}" width="{l:.1f}" height="14" rx="7" fill="{couleur_traits}"/>'
    corps = f'<g transform="translate({-x0:.1f} 0)"><path fill="{couleur_mot}" d="{dm}"/></g>{traits}'
    return corps, l, y0, y1 + 60

corps, l, y0, y1 = mot_souligne('mbongo')
open('f-mot.svg', 'w').write(svg(f'  <g transform="translate(10 {-y0 + 10:.1f})">{corps}</g>', vb=f'0 0 {l + 20:.0f} {y1 - y0 + 20:.0f}'))
corps, l, y0, y1 = mot_souligne('m')
e_ = 150 / l
open('f-symbole.svg', 'w').write(svg(f'  <g transform="translate({128 - 75} {128 - (y1 - y0) * e_ / 2:.1f}) scale({e_:.3f}) translate(0 {-y0:.1f})">{corps}</g>'))
