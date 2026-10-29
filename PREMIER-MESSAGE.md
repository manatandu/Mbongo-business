# Premier message à envoyer dans Claude Code

Copier-coller le texte ci-dessous une fois le dossier ouvert.

---

Lis CLAUDE.md, puis docs/regles-smt.md et docs/cadre-juridique.md. Ouvre prototype/index.html : c'est le prototype validé, sa logique de calcul SMT est juste et le bilan s'équilibre.

On commence l'étape 1 de la feuille de route, et seulement elle :

1. Initialise le projet (React + TypeScript + Vite, Vitest), sans interface pour l'instant.
2. Crée le moteur de calcul SMT dans `src/moteur/` : journaux de trésorerie par compte, créances et dettes, immobilisations, compte de résultat, bilan, notes 1 à 3. Montants en entiers. Taux de change stocké sur chaque opération.
3. Écris les tests : un jeu de données repris du prototype, l'invariant actif = passif, l'amortissement sans prorata, l'encaissement d'une créance, un transfert entre comptes, une acquisition de matériel, une opération en dollars.
4. Lance les tests et montre-moi le résultat.

Avant de coder, propose-moi en dix lignes la structure des fichiers et les types principaux, et attends mon accord.
