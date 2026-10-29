"""Construit le kit du logo TRK Consulting (piste A, « Compte en T ») dans design/logo-trk/kit/.

Symbole : une tuile 224 × 224 (rayon 48) sur une grille de 256, coupée par deux joints de 22 en trois pavés :
l'en-tête (or) et deux colonnes (bleu nuit). C'est un compte en T, la page du journal.
Petite taille (16 à 32 px) : joints de 32, rayon 40, pour que les joints restent ouverts.
Lettres TRK dessinées (capitale 160, fût 36) ; « CONSULTING » en IBM Plex Sans 600 converti en tracés.

    python3 design/logo-trk/outils/construire_kit.py
"""
import os

from texte_en_traces import traces

ICI = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.join(ICI, '..', 'kit')

NUIT = '#0b2a52'
OR = '#c99a06'        # sur fond clair
OR_VIF = '#e0b21b'    # sur bleu nuit
BLANC = '#ffffff'
NOIR = '#000000'

# Déclinaisons : couleur de l'en-tête, des colonnes, du texte.
VARIANTES = {
    'couleur': (OR, NUIT, NUIT),
    'nuit': (NUIT, NUIT, NUIT),
    'noir': (NOIR, NOIR, NOIR),
    'blanc': (BLANC, BLANC, BLANC),
    'negatif': (OR_VIF, BLANC, BLANC),   # à poser sur le bleu nuit
}


def symbole(joint=22, rayon=48, haut_entete=52):
    """Les trois pavés du compte en T. Retourne (en-tête, colonnes)."""
    a, b = 16, 240
    bas_entete = a + haut_entete
    haut_col = bas_entete + joint
    g, d = 128 - joint / 2, 128 + joint / 2
    r = rayon
    entete = f'M{a} {a + r} A{r} {r} 0 0 1 {a + r} {a} H{b - r} A{r} {r} 0 0 1 {b} {a + r} V{bas_entete} H{a} Z'
    colonnes = (f'M{a} {haut_col} H{g:g} V{b} H{a + r} A{r} {r} 0 0 1 {a} {b - r} Z '
                f'M{d:g} {haut_col} H{b} V{b - r} A{r} {r} 0 0 1 {b - r} {b} H{d:g} Z')
    return entete, colonnes


SYMBOLE = symbole()
SYMBOLE_PETIT = symbole(joint=32, rayon=40, haut_entete=56)

# Lettres TRK dessinées, sur une hauteur de capitale de 160 (y 48 à 208), largeur 532.
TRK = ('M0 48 H128 V84 H82 V208 H46 V84 H0 Z '
       'M152 48 H212 A52 52 0 0 1 212 152 H188 V208 H152 Z M188 84 H212 A16 16 0 0 1 212 116 H188 Z '
       'M200 152 H248 L304 208 H256 Z '
       'M328 48 H364 V208 H328 Z M364 104 L420 48 H468 L364 152 Z M396 120 L420 96 L532 208 H484 Z')
LARGEUR_TRK = 532


def consulting(largeur, hauteur):
    """« CONSULTING » en tracés, justifié sur `largeur`."""
    _, nu = traces('CONSULTING', hauteur, 0)
    espace = (largeur - nu) / 9 / hauteur
    d, _ = traces('CONSULTING', hauteur, espace)
    return d


def svg(vb_l, vb_h, titre, corps):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vb_l:g} {vb_h:g}" width="{vb_l:g}" height="{vb_h:g}" '
            f'role="img" aria-labelledby="titre"><title id="titre">{titre}</title>\n{corps}\n</svg>\n')


def corps_symbole(sym, c_entete, c_col, x=0.0, y=0.0, e=1.0):
    entete, colonnes = sym
    return (f'<g id="symbole" transform="translate({x:g} {y:g}) scale({e:g})">'
            f'<path fill="{c_entete}" d="{entete}"/><path fill="{c_col}" fill-rule="evenodd" d="{colonnes}"/></g>')


def corps_texte(c, x, y_haut, cap_trk, cap_consulting, ecart):
    """TRK puis CONSULTING dessous, même largeur. `y_haut` : haut des capitales de TRK."""
    e = cap_trk / 160
    largeur = LARGEUR_TRK * e
    d_c = consulting(largeur, cap_consulting)
    y_c = y_haut + cap_trk + ecart
    return (f'<g id="nom" fill="{c}"><path transform="translate({x:g} {y_haut - 48 * e:g}) scale({e:g})" fill-rule="evenodd" d="{TRK}"/>'
            f'<path transform="translate({x:g} {y_c:g})" d="{d_c}"/></g>'), largeur


def ecrire(nom, contenu):
    with open(os.path.join(KIT, nom), 'w', encoding='utf-8') as f:
        f.write(contenu)


def main():
    os.makedirs(KIT, exist_ok=True)
    for v, (ce, cc, ct) in VARIANTES.items():
        ecrire(f'trk-symbole-{v}.svg', svg(256, 256, 'TRK Consulting', corps_symbole(SYMBOLE, ce, cc)))
        ecrire(f'trk-symbole-petit-{v}.svg', svg(256, 256, 'TRK Consulting', corps_symbole(SYMBOLE_PETIT, ce, cc)))

        # Horizontal : tuile 16–240 ; texte de 40 à 216, centré sur la tuile.
        texte, l = corps_texte(ct, 288, 40, 120, 30, 26)
        ecrire(f'trk-horizontal-{v}.svg', svg(288 + l + 16, 256, 'TRK Consulting', corps_symbole(SYMBOLE, ce, cc) + texte))

        # Empilé : symbole au-dessus, nom centré dessous.
        larg = 440
        e_trk = 64 / 160
        x_t = (larg - LARGEUR_TRK * e_trk) / 2
        texte, _ = corps_texte(ct, x_t, 280, 64, 16, 16)
        ecrire(f'trk-empile-{v}.svg', svg(larg, 392, 'TRK Consulting', corps_symbole(SYMBOLE, ce, cc, x=(larg - 256) / 2) + texte))
    print('kit écrit dans', os.path.normpath(KIT))


if __name__ == '__main__':
    main()
