# Logo Mbongo Business · guide d'usage

## L'idée

Le compte au bâton : quatre traits, et le cinquième en travers. C'est la façon la plus simple de compter, celle du cahier et du tableau noir, que tout le monde reconnaît, même sans savoir lire. Le logiciel ne fait rien d'autre : il aide le commerçant à compter son argent. Ni flèche qui monte, ni pièce, ni graphique.

Le bleu nuit et l'or viennent de TRK Consulting, qui détient le logiciel : les deux marques sont de la même famille sans se confondre.

## Construction

- Grille de 256. Quatre traits de 24, arrondis, espacés de 40, hauts de 160. Trait en travers de 24, incliné de 16°.
- Grandes tailles : un joint de 7 de part et d'autre du trait en travers.
- Petite taille (32 px et moins) : sans joint, il se boucherait. Les traits passent à 30 ou 32 et c'est la couleur du trait en travers qui le détache. En une couleur, le joint reste.
- Le nom « Mbongo » est en Archivo, graisse 800, largeur 118 % (licence OFL), converti en tracés. Aucun texte vivant dans les fichiers.
- Tout est produit par `kit.py` (`python3 kit.py c`). Ne pas retoucher les SVG à la main.

## Couleurs

| | HEX | RVB | CMJN (indicatif) |
|---|---|---|---|
| Bleu nuit | #0B2A52 | 11 42 82 | 100 80 30 45 |
| Or (sur fond clair) | #C99A06 | 201 154 6 | 20 40 100 5 |
| Or vif (sur bleu nuit) | #E0B21B | 224 178 27 | 12 30 95 0 |

Les mêmes que TRK Consulting. Valeurs CMJN à valider par l'imprimeur sur épreuve.

## Fichiers (`kit/`)

| Fichier | Usage |
|---|---|
| `mbongo-horizontal-couleur.svg` | Version principale, fond blanc ou clair |
| `mbongo-horizontal-negatif.svg` | Sur bleu nuit |
| `mbongo-empile-*.svg` | Formats hauts : affiche, écran de démarrage, réseaux sociaux |
| `mbongo-symbole-*.svg` | Symbole seul, quand le nom est déjà écrit à côté |
| `mbongo-symbole-petit-*.svg` | 32 px et moins |
| `*-nuit`, `*-noir` | Une seule couleur : tampon, photocopie, gravure |
| `*-blanc` | Une seule couleur sur fond foncé ou sur photo |
| `mbongo-icone-appli.svg`, `png/mbongo-icone-appli-*.png`, `png/apple-touch-icon.png` | Icône de l'appli sur le téléphone |
| `mbongo-icone-petite.svg`, `favicon.ico`, `png/mbongo-icone-petite-*.png` | Onglet du navigateur, petites icônes |

## Règles

- Zone de protection : autour du logo, un espace libre égal à la largeur de deux traits.
- Tailles minimales : symbole 16 px à l'écran (version petite) ; logo horizontal 110 px de large à l'écran, 28 mm à l'impression.
- Fonds : blanc, papier, bleu nuit (version négatif). Sur une photo : la version blanche, sur une zone sombre et calme.

À ne pas faire :
- changer les couleurs, en ajouter, mettre l'or sur les traits droits ;
- ajouter un sixième trait, en retirer, changer l'angle du trait en travers ;
- refermer les joints en grande taille ;
- déformer, incliner, ajouter une ombre ou un contour ;
- récrire « Mbongo » dans une autre police.

## Mouvement

Dans l'appli, le logo se trace une fois à l'ouverture : les quatre traits poussent l'un après l'autre, puis le trait d'or barre le compte. Moins d'une seconde, et rien quand le téléphone demande moins d'animations.

## Reste à faire

- Recherche d'antériorité avant tout dépôt de marque (en RDC : ministère de l'Industrie, service de la propriété industrielle).
- Épreuve d'impression pour fixer CMJN et Pantone.
