# Logo TRK Consulting · guide d'usage

## L'idée

Une tuile coupée en trois pavés : l'en-tête et les deux colonnes d'un compte en T, la page du journal. L'en-tête est en or, les colonnes en bleu nuit. Pas de flèche, pas de graphique, pas de balance, et aucun code d'un ordre professionnel : TRK Consulting n'est pas un cabinet d'expertise comptable (loi n° 15/002, art. 42).

## Construction

- Grille de 256. Tuile de 224 × 224, coins de rayon 48.
- Deux joints de 22 : un horizontal sous l'en-tête (hauteur 52), un vertical au milieu.
- Version petite taille (`trk-symbole-petit-*`), pour 32 px et moins : joints de 32, rayon 40, en-tête de 56. Les joints restent ouverts jusqu'à 16 px.
- Lettres TRK dessinées (fût 36 pour une capitale de 160). « CONSULTING » en IBM Plex Sans 600 (licence OFL, la police de Mbongo), converti en tracés et justifié sur la largeur de TRK.
- Tout est régénéré par `outils/construire_kit.py`. Ne pas retoucher les SVG à la main.

## Couleurs

| | HEX | RVB | CMJN (indicatif) |
|---|---|---|---|
| Bleu nuit | #0B2A52 | 11 42 82 | 100 80 30 45 |
| Or (fond clair) | #C99A06 | 201 154 6 | 20 40 100 5 |
| Or vif (sur bleu nuit) | #E0B21B | 224 178 27 | 12 30 95 0 |

Les valeurs CMJN et un équivalent Pantone sont à faire valider par l'imprimeur sur épreuve.

## Versions

| Fichier | Usage |
|---|---|
| `trk-horizontal-couleur.svg` | Version principale, sur fond blanc ou clair |
| `trk-horizontal-negatif.svg` | Sur bleu nuit (en-tête or vif, reste en blanc) |
| `trk-empile-*.svg` | Formats hauts : enseigne carrée, couverture, réseaux sociaux |
| `trk-symbole-*.svg` | Symbole seul, quand le nom figure déjà à côté |
| `trk-symbole-petit-*.svg` | 32 px et moins : favicon, petite icône |
| `*-nuit`, `*-noir` | Une seule couleur : tampon, gravure, photocopie |
| `*-blanc` | Une seule couleur sur fond foncé ou sur photo |
| `trk-icone-appli.svg`, `png/icone-*.png`, `png/apple-touch-icon.png`, `favicon.ico` | Icônes web et d'appli |

## Règles

- **Zone de protection** : autour du logo, un espace libre égal à la hauteur de l'en-tête or.
- **Tailles minimales** : symbole 16 px à l'écran (version petite) ; logo horizontal 120 px de large à l'écran, 30 mm à l'impression.
- **Fonds** : blanc, crème, bleu nuit (version négatif). Sur une photo, la version blanche sur une zone sombre et calme.

À ne pas faire :
- changer les couleurs ou en ajouter une ;
- déformer, incliner, ajouter une ombre ou un contour ;
- refermer les joints ou changer les proportions des pavés ;
- poser la version couleur sur le bleu nuit (l'en-tête or y perd son contraste) ;
- récrire « CONSULTING » dans une autre police.

## Reste à faire

- Recherche d'antériorité avant tout dépôt de marque (OAPI ne couvre pas la RDC : dépôt auprès du ministère de l'Industrie, service de la propriété industrielle).
- Épreuve d'impression pour fixer CMJN et Pantone.
