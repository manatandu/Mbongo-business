# Démonstration de soutenance

Guide de la démonstration de Mbongo devant le jury. Durée visée : 9 minutes. On peut la couper à 5 minutes (parties 1 et 2 seulement).

Toutes les données montrées sont fictives : la boutique « Alimentation Maman Nsimba » n'existe pas, et l'écran le dit en permanence.

Le scénario est rejoué automatiquement par `npm run build` puis `npm run scenario`. Le script produit une capture par étape (numérotée comme ci-dessous), le classeur Excel des états et deux vidéos. Le relancer la veille, à la date du jour J : `DATE=2027-07-12 npm run scenario` (remplacer par la vraie date).

---

## Avant le jour J

**Une semaine avant**
- Installer l'appli sur le téléphone Android qui servira : l'ouvrir une fois avec internet, puis Réglages, « Mettre Mbongo sur l'écran d'accueil ».
- Couper les données et le Wi-Fi, rouvrir l'appli depuis l'écran d'accueil. Elle doit s'ouvrir.
- Relancer `npm run scenario` et mettre les captures dans les diapositives.

**La veille**
- `DATE=<jour J> npm run scenario` : le scénario passe-t-il à cette date ? Garder les vidéos sur l'ordinateur et sur une clé USB.
- Charger la batterie du téléphone. Prévoir le câble ou l'outil de projection de l'écran du téléphone.

**Le matin**
- Sur le téléphone : Réglages, « Remettre la démonstration à zéro ». La boutique repart avec des saisies jusqu'à la veille.
- Sur l'ordinateur : ouvrir le bureau dans le navigateur (`npm run apercu`, puis `http://localhost:4173/bureau.html`).

Le téléphone et l'ordinateur ont chacun leur base : sans serveur, le bureau ne voit que les données de l'ordinateur. Pour montrer le bureau, charger aussi la démonstration sur l'ordinateur (`http://localhost:4173/`, « Voir la démonstration »). C'est à dire au jury en une phrase : « En pilote, un serveur relierait les deux. »

---

## Partie 1. Le commerçant (3 min 30)

| N° | Geste | Ce qu'on dit |
|---|---|---|
| 1-2 | Ouvrir l'appli, « Voir la démonstration » | « Maman Nsimba tient une alimentation à Kinshasa. Elle note tout sur son téléphone, même sans internet. » |
| 3-4 | « + Recette », taper 85 000, Enregistrer | « Une vente : le montant, un bouton. C'est elle qui saisit, pas nous. » |
| 5 | Vente à crédit : 240 000, client, n° de facture | « Une vente à crédit ne touche pas la caisse. Elle va dans "On me doit". » |
| 6 | Clients, Encaisser 100 000 | « Le client paie en deux fois. Il reste 140 000. C'est la réalité du marché. » |
| 7 | Journal | « Le journal de trésorerie du mois, compte par compte, comme le modèle SMT. » |
| 8 | Plus, États | « Ses états SMT provisoires, sur son téléphone. Avec la mention : Mbongo prépare, il ne certifie pas. » |
| 9 | Réglages, Lingala, puis Accueil | « Toute l'appli existe en lingala. » Revenir en français. |

Point à faire passer : le commerçant tient ses comptes lui-même, simplement. Le logiciel fait les calculs.

## Partie 2. Le bureau (2 min)

| N° | Geste | Ce qu'on dit |
|---|---|---|
| 10 | Bureau, liste des clients | « La structure suit ses clients. Ici, ce qui demande de l'attention. » |
| 11 | Clic sur la boutique, Contrôles | « Créances de plus de 30 jours, opérations sans pièce. L'assistant appelle la commerçante. Le bureau n'a aucun bouton pour modifier ses saisies : c'est l'article 43 de la loi 15/002. » |
| 12 | États SMT, Exporter en Excel | « Compte de résultat, bilan, notes. Le bilan est équilibré. Export PDF ou Excel. » |
| 13 | « Je suis : Expert-comptable partenaire » | « Seul l'expert-comptable inscrit arrête les états. Pour l'instant, il ne peut pas : l'année n'est pas finie. » |

Point à faire passer : la structure accompagne et contrôle ; l'expert-comptable arrête. La loi est respectée par le logiciel lui-même.

## Partie 3. La fin de l'année (3 min 30)

| N° | Geste | Ce qu'on dit |
|---|---|---|
| 14 | Téléphone : Réglages, « Voir la fin d'année » | « Revenons au 31 décembre de l'année passée. L'appli le signale : l'année est finie. » |
| 15 | « Faire l'inventaire » | « L'inventaire extra-comptable du SMT. La commerçante compte ses sacs de riz, ses bidons d'huile. » |
| 16 | « Valider l'inventaire », retour à l'accueil | « Le prix du dollar au 31 décembre est proposé. L'expert pourra le corriger. » |
| 17 | « Commencer » l'année suivante | « Elle peut noter ses ventes de janvier tout de suite. Elle n'attend pas l'expert-comptable. » |
| 18 | Bureau, liste des clients | « Au bureau, l'année passée attend son arrêté. » |
| 19 | Choisir l'exercice passé, États, « Arrêter les états » | « L'expert arrête. Plus aucune saisie possible sur cette année. Et l'année suivante s'ouvre exactement sur la clôture : compte exploitant N plus résultat N. » |

Point à faire passer : le cycle comptable complet du SMT, du cahier de caisse à l'arrêté.

---

## Questions probables du jury

**Ce n'est pas de l'exercice illégal de la profession ?**
Non. Le commerçant saisit lui-même (il tient sa propre comptabilité). La structure forme et contrôle, elle n'écrit pas. L'arrêté, le conseil et le fiscal passent par un expert-comptable inscrit à l'ONEC, partenaire par convention (loi n° 15/002, art. 43 et 71). Aucun texte ne présente la structure comme un cabinet (art. 42).

**Comment savez-vous que les calculs sont justes ?**
Le moteur de calcul est séparé de l'écran et couvert par 149 tests. L'un d'eux tire au hasard des milliers d'exercices complets et vérifie à chaque fois que le bilan s'équilibre au franc près. On ne montre pas qu'il s'équilibre sur un exemple : on montre qu'il ne peut pas être déséquilibré. Le jeu de données du prototype validé redonne exactement ses montants.

**Et si l'entreprise dépasse les seuils du SMT ?**
Le logiciel compare les ventes au seuil du secteur (240 millions CDF pour le négoce en 2026). Il alerte à 80 %, puis au dépassement, et renvoie vers l'expert-comptable pour le passage au Système normal. Il ne gère pas le Système normal.

**Les dollars ?**
Un compte par devise : la caisse en dollars se tient en dollars, comme dans le tiroir. Chaque opération garde le taux du jour. À la clôture, un seul taux, celui du 31 décembre. L'écart est un gain ou une perte de change. Cette convention est à faire valider par l'expert partenaire.

**Pourquoi pas un cahier ou Excel ?**
Le cahier ne calcule rien et Excel ne connaît pas le SMT. Mbongo produit directement les états du SMT, marche hors ligne sur un téléphone d'entrée de gamme et parle lingala.

**Sans internet, vraiment ?**
Oui. Après la première ouverture, l'appli ne télécharge plus rien. Essai automatique en mode avion (`npm run essai:hors-ligne`), et essai sur un vrai téléphone avant la soutenance.

**Où sont les données ?**
Sur le téléphone du commerçant. Pas de serveur pour l'instant. Le commerçant peut faire une copie de sauvegarde. Un pilote demanderait un serveur, et le respect du Code du numérique (ordonnance-loi n° 23/010 du 13 mars 2023).

**Pourquoi le bureau ne voit-il que les données de l'ordinateur ?**
Choix assumé pour la soutenance : pas de serveur, donc pas de panne réseau possible. La synchronisation est prévue dans le plan (section 14) : les données sont en ajout seulement, il n'y aura pas de conflit à arbitrer.

## Limites à reconnaître

- Pas encore de pilote réel : rien n'a été testé par un vrai commerçant.
- Le lingala est une traduction de travail, à faire relire.
- Les conventions comptables D1 à D10 (cessions, emprunts, dollars, tontines) sont des choix à faire valider par l'expert-comptable partenaire.
- Les seuils en francs congolais sont des équivalents à revoir chaque année.

---

## Plan B

Dans l'ordre, si quelque chose lâche :

1. **Pas de réseau dans la salle** : rien à faire. Tout est local, sur le téléphone comme sur l'ordinateur.
2. **Le téléphone ne se projette pas** : faire la partie 1 sur l'ordinateur, dans le navigateur en vue téléphone (outils de développement, mode appareil), avec la même adresse `http://localhost:4173/`.
3. **L'ordinateur refuse de lancer l'appli** : passer les vidéos du scénario (`soutenance/video/telephone.webm` et `bureau.webm`), sur la clé USB.
4. **Plus rien ne marche** : les captures du scénario sont dans les diapositives. On raconte le même scénario image par image.
