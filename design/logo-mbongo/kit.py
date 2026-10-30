"""Kit du logo Mbongo Business, pour la piste retenue.

    python3 kit.py c        (c : « le compte au bâton », la piste en place)

Écrit kit/ : symboles, logos horizontal et empilé, versions une couleur et négatif, petite taille, icône d'appli,
PNG, favicon.ico, planche du kit. Le nom est en tracés (Archivo 800, largeur 118 %) : aucun texte vivant.
Ne pas retoucher les fichiers de kit/ à la main : modifier ce script et le relancer.
"""
import os
import shutil
import sys

import construire
import couleurs
import outils

NUIT, OR, OR_CLAIR, BLANC, NOIR = '#0B2A52', '#C99A06', '#E0B21B', '#FFFFFF', '#000000'
# Hauteur des minuscules du nom, pour un symbole de 256 : réglée à l'œil sur la planche du kit.
HX_HORIZONTAL, HX_EMPILE = 68, 56
ICI = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.join(ICI, 'kit')

# Versions : (nom, couleur principale, accent, fond de la tuile, fond conseillé pour la planche)
VERSIONS = [
    ('couleur', NUIT, OR, NUIT, '#FFFFFF'),
    ('negatif', BLANC, OR_CLAIR, '#14396A', NUIT),
    ('nuit', NUIT, NUIT, NUIT, '#FFFFFF'),
    ('noir', NOIR, NOIR, NOIR, '#FFFFFF'),
    ('blanc', BLANC, BLANC, BLANC, '#333333'),
]


def symbole_nu(piste, principal, accent, petit=False):
    """Le symbole sans tuile, dans un carré de 256."""
    if piste == 'c':
        # Petite taille : sans joint (il se boucherait), traits plus épais. En une couleur, le joint reste nécessaire.
        sans_joint = petit and principal != accent
        corps = construire.barres(principal, coupe=not sans_joint, ep=30 if sans_joint else 24) + construire.trait(accent, ep=30 if sans_joint else construire.EP)
        return f'<g transform="translate(128 128) scale(1.08) translate(-126 -128)">{corps}</g>'
    corps, e = couleurs.recolore(piste, couleurs.interieur(f'{piste}-symbole.svg'), principal, accent)
    return f'<g transform="translate(128 128) scale({min(1.0, e * 1.25):.2f}) translate(-128 -128)">{corps}</g>'


def tuile(piste, fond, principal, accent, petit=False):
    """Icône d'appli : tuile pleine, symbole en réserve."""
    if piste == 'c':
        sans_joint = petit
        corps = construire.barres(principal, coupe=not sans_joint, ep=32 if sans_joint else 24) + construire.trait(accent, ep=32 if sans_joint else construire.EP)
        e = 0.84 if petit else 0.74
        return f'<rect width="256" height="256" rx="58" fill="{fond}"/><g transform="translate(128 128) scale({e}) translate(-126 -128)">{corps}</g>'
    return couleurs.tuile(piste, fond, principal, accent)


def nom(couleur, x, base, hauteur_x=92):
    d, _, _ = outils.traces('Mbongo', hauteur_x, graisse=800, largeur=118)
    x0, y0, x1, y1 = outils.boite('Mbongo', hauteur_x, graisse=800, largeur=118)
    return f'<path fill="{couleur}" d="{d}" transform="translate({x - x0:.1f} {base:.1f})"/>', x1 - x0, -y0, y1


def svg(l, h, titre, corps):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {l:.0f} {h:.0f}" role="img" aria-label="{titre}"><title>{titre}</title>{corps}</svg>\n'


def ecrire(nom_fichier, contenu):
    with open(os.path.join(KIT, nom_fichier), 'w') as f:
        f.write(contenu)
    return os.path.join(KIT, nom_fichier)


def main(piste):
    if os.path.isdir(KIT):
        shutil.rmtree(KIT)
    os.makedirs(os.path.join(KIT, 'png'))
    titre = 'Mbongo Business'
    for v, p, a, fond, _ in VERSIONS:
        ecrire(f'mbongo-symbole-{v}.svg', svg(256, 256, titre, symbole_nu(piste, p, a)))
        ecrire(f'mbongo-symbole-petit-{v}.svg', svg(256, 256, titre, symbole_nu(piste, p, a, petit=True)))
        # Horizontal : symbole de 256, espace de 40, nom dont la hauteur des capitales vaut ~ la moitié du symbole.
        trace, l, cap, desc = nom(p, 256 + 24, 0, HX_HORIZONTAL)
        base = 128 + cap / 2 - 2
        trace, l, cap, desc = nom(p, 256 + 24, base, HX_HORIZONTAL)
        ecrire(f'mbongo-horizontal-{v}.svg', svg(256 + 24 + l + 8, 256, titre, symbole_nu(piste, p, a) + trace))
        # Empilé : symbole au-dessus, nom centré dessous.
        trace, l, cap, desc = nom(p, 0, 0, HX_EMPILE)
        largeur = max(256, l)
        trace, _, _, _ = nom(p, (largeur - l) / 2, 256 + 8 + cap, HX_EMPILE)
        ecrire(f'mbongo-empile-{v}.svg', svg(largeur, 256 + 8 + cap + desc + 8, titre, f'<g transform="translate({(largeur - 256) / 2:.1f} 0)">{symbole_nu(piste, p, a)}</g>' + trace))
    # Icônes : tuile bleu nuit, traits blancs, accent or.
    icone = ecrire('mbongo-icone-appli.svg', svg(256, 256, titre, tuile(piste, NUIT, BLANC, OR_CLAIR)))
    petite = ecrire('mbongo-icone-petite.svg', svg(256, 256, titre, tuile(piste, NUIT, BLANC, OR_CLAIR, petit=True)))

    png = os.path.join(KIT, 'png')
    outils.png([icone] * 4, [512, 192, 180, 64], png)
    outils.png([petite] * 3, [48, 32, 16], png)
    outils.png([os.path.join(KIT, f'mbongo-horizontal-{v}.svg') for v in ('couleur', 'negatif')], 480, png)
    outils.png([os.path.join(KIT, 'mbongo-empile-couleur.svg')], 480, png)
    os.rename(os.path.join(png, 'mbongo-icone-appli-180.png'), os.path.join(png, 'apple-touch-icon.png'))
    from PIL import Image
    tailles = [16, 32, 48]
    images = [Image.open(os.path.join(png, f'mbongo-icone-petite-{t}.png')) for t in tailles]
    images[-1].save(os.path.join(KIT, 'favicon.ico'), sizes=[(t, t) for t in tailles], append_images=images[:-1])
    print(f'Kit écrit dans {KIT} (piste {piste}).')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'c')
