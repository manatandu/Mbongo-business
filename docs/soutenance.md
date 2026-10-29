# Démonstration de soutenance

Guide de la démonstration de Mbongo Business devant le jury. Durée visée : 10 minutes. On peut la couper à 5 minutes (parties 1 et 2 seulement).

Toutes les données montrées sont fictives : la boutique « Alimentation Maman Nsimba » n'existe pas, et l'écran le dit en permanence.

Le scénario est rejoué automatiquement par `npm run build` puis `npm run scenario` : une capture par étape (numérotée comme ci-dessous), le classeur Excel des états et deux vidéos. Le relancer la veille, à la date du jour J : `DATE=2027-07-12 npm run scenario` (remplacer par la vraie date).

Les diapositives (15, avec les notes de l'orateur) : https://claude.ai/artifact/F4jbqjRWodJjLvtiYnFUuH. Téléchargeables en PowerPoint ou en PDF depuis la page. À compléter : nom de l'étudiant, de l'encadreur, université (couverture).

---

## Les adresses

| Quoi | Adresse |
|---|---|
| Appli du commerçant | https://mbongo-business.web.app |
| Bureau (TRK Consulting, expert-comptable) | https://mbongo-business.web.app/bureau.html |
| Site de TRK Consulting | https://trkconsulting.web.app |
| Présentation du logiciel | https://trkconsulting.web.app/mbongo-business/ |
| Console interne de TRK | https://trkconsole.web.app |

## Avant le jour J

**Une semaine avant**
- Installer l'appli sur le téléphone qui servira : l'ouvrir une fois avec internet, puis Réglages, « Mettre Mbongo sur l'écran d'accueil » (Android) ou, dans Safari, Partager puis « Sur l'écran d'accueil » (iPhone).
- Couper les données et le Wi-Fi, rouvrir l'appli depuis l'écran d'accueil. Elle doit s'ouvrir.
- Relancer `npm run scenario` et vérifier que les captures des diapositives sont à jour.

**La veille**
- `DATE=<jour J> npm run scenario` : le scénario passe-t-il à cette date ? Garder les vidéos sur l'ordinateur et sur une clé USB.
- Charger la batterie du téléphone. Prévoir le câble ou l'outil de projection de l'écran du téléphone.
- Se connecter une fois à la console (trkconsole.web.app) pour vérifier l'accès.

**Le matin**
- Sur le téléphone : Réglages, « Remettre la démonstration à zéro ». La boutique repart avec des saisies jusqu'à la veille.
- Sur l'ordinateur : ouvrir l'appli et le bureau. Hors réseau, `npm run apercu` puis `http://localhost:4173/` et `http://localhost:4173/bureau.html`.

Le téléphone et l'ordinateur ont chacun leur base : les saisies restent sur l'appareil. Pour montrer le bureau, charger aussi la démonstration sur l'ordinateur (« Voir la démonstration »). À dire au jury en une phrase : « L'envoi des saisies au serveur est la prochaine étape ; la base est déjà prête et cloisonnée. »

---

## Partie 1. Le commerçant (3 min 30)

| N° | Geste | Ce qu'on dit |
|---|---|---|
| 1-2 | Ouvrir l'appli, « Voir la démonstration » | « Maman Nsimba tient une alimentation à Kinshasa. Elle note tout sur son téléphone, même sans internet. » |
| 3-4 | « + Recette » : date, libellé, montant 85 000, Enregistrer | « Une vente : les champs dans l'ordre du journal, date, pièce, libellé, montant. C'est elle qui saisit, pas nous. » |
| 5 | Vente à crédit : 240 000, client, n° de facture | « Une vente à crédit ne touche pas la caisse. Elle va dans les créances. » |
| 6 | Clients, Encaisser 100 000 | « Le client paie en deux fois. Il reste 140 000. C'est la réalité du marché. » |
| 7 | Journal | « Le journal de trésorerie du mois, compte par compte, comme le modèle SMT (note 4). Caisse, M-Pesa, Orange Money, banques : autant de comptes qu'il en faut. » |
| 8 | Plus, États | « Ses états SMT provisoires : bilan et compte de résultat avec l'année précédente, notes 1 à 3. Ils restent « Non arrêtés » tant que l'expert-comptable ne les a pas arrêtés. » |
| 9 | Réglages, Lingala, puis Accueil | « Toute l'appli existe en lingala. » Revenir en français. |

Point à faire passer : le commerçant tient ses comptes lui-même, simplement. Le logiciel fait les calculs.

## Partie 2. Le bureau (2 min)

| N° | Geste | Ce qu'on dit |
|---|---|---|
| 10 | Bureau, liste des clients | « TRK Consulting suit ses clients. Ici, ce qui demande de l'attention, et la date limite d'arrêté du 30 avril. » |
| 11 | Clic sur la boutique, Contrôles | « Créances de plus de 30 jours, opérations sans pièce. L'assistant appelle la commerçante. Le bureau n'a aucun bouton pour modifier ses saisies : c'est l'article 43 de la loi 15/002. » |
| 12 | États SMT, Exporter en Excel | « Compte de résultat, bilan avec la colonne N-1, notes. Le bilan est équilibré. Export PDF ou Excel. » |
| 13 | « Je suis : Expert-comptable partenaire » | « Seul l'expert-comptable inscrit arrête les états. Pour l'instant, il ne peut pas : l'année n'est pas finie. » |

Point à faire passer : TRK Consulting accompagne et contrôle ; l'expert-comptable arrête. La loi est respectée par le logiciel lui-même.

## Partie 3. La fin de l'année (3 min 30)

| N° | Geste | Ce qu'on dit |
|---|---|---|
| 14 | Téléphone : Réglages, « Voir la fin d'année » | « Revenons au 31 décembre de l'année passée. L'appli le signale : l'année est finie. » |
| 15 | « Faire l'inventaire » | « L'inventaire extra-comptable du SMT : les stocks et les travaux en cours. Elle compte ses sacs de riz ; un artisan noterait ici une robe en couture pas finie. » |
| 16 | « Valider l'inventaire », retour à l'accueil | « Le prix du dollar au 31 décembre est proposé. L'expert pourra le corriger. » |
| 17 | « Commencer » l'année suivante | « Elle peut noter ses ventes de janvier tout de suite. Elle n'attend pas l'expert-comptable. » |
| 18 | Bureau, liste des clients | « Au bureau, l'année passée attend son arrêté, avec sa date limite. » |
| 19 | Choisir l'exercice passé, États, « Arrêter les états » | « L'expert arrête. Plus aucune saisie possible sur cette année. Et l'année suivante s'ouvre exactement sur la clôture : compte exploitant N plus résultat N. » |

Point à faire passer : le cycle comptable complet du SMT, du cahier de caisse à l'arrêté.

## Partie 4, si le temps le permet (1 min)

- **Stock** (Plus, Stock) : une fiche « Riz 25 kg », un achat, une vente depuis la saisie ; le stock baisse seul, au coût moyen (CUMP). « Facultatif : sans fiche, l'inventaire de fin d'année suffit. »
- **Console de TRK** (trkconsole.web.app) : clients, abonnements, rappels SMS à 10 jours, 3 jours et à l'échéance. « Chaque client ne voit que ses données : c'est écrit dans la base, et testé. »

---

## Questions probables du jury

**Ce n'est pas de l'exercice illégal de la profession ?**
Non. Le commerçant saisit lui-même (il tient sa propre comptabilité). TRK Consulting forme et contrôle, elle n'écrit pas. L'arrêté, le conseil et le fiscal passent par un expert-comptable inscrit à l'ONEC, partenaire par convention (loi n° 15/002, art. 43 et 71). Aucun texte ne présente TRK comme un cabinet d'expertise comptable (art. 42).

**Comment savez-vous que les calculs sont justes ?**
Le moteur de calcul est séparé de l'écran et couvert par 193 tests. L'un d'eux tire au hasard des milliers d'exercices complets et vérifie à chaque fois que le bilan s'équilibre au franc près. On ne montre pas qu'il s'équilibre sur un exemple : on montre qu'il ne peut pas être déséquilibré.

**Avez-vous vérifié le SMT sur le texte ?**
Oui, sur le Titre X de l'AUDCIF révisé : journal de trésorerie par caisse et par banque (note 4), journaux de suivi des créances et des dettes, inventaire extra-comptable des stocks et des travaux en cours, bilan et compte de résultat avec la colonne N-1, notes 1 à 3, arrêté dans les quatre mois (art. 23).

**Le SMT a-t-il un tableau des flux de trésorerie ?**
L'art. 28 de l'AUDCIF le cite, mais le Titre X n'en donne aucun modèle : les états du SMT sont le bilan, le compte de résultat et les notes. Le journal de trésorerie (note 4), qui retrace chaque entrée et chaque sortie, en tient lieu. Point à faire confirmer par l'expert partenaire.

**Et si l'entreprise dépasse les seuils du SMT ?**
Les seuils de l'art. 13 sont fixés en francs CFA : 60 M (négoce), 40 M (artisanat), 30 M (services). Le logiciel les applique en francs congolais, alerte à 80 %, puis au dépassement, et renvoie vers l'expert-comptable pour le passage au Système normal. Il ne gère pas le Système normal.

**Comment le stock diminue-t-il ? Quelle méthode de valorisation ?**
Le SMT n'exige que l'inventaire de fin d'année (intermittent). En plus, le commerçant peut tenir des fiches de stock : chaque vente saisie fait sortir l'article, chaque achat le fait entrer. Valorisation selon l'art. 44 : coût moyen pondéré après chaque entrée par défaut, ou PEPS ; la méthode est écrite en note 2.

**Une dépense qui n'est pas dans la liste ?**
La liste reprend les colonnes du journal de trésorerie de l'OHADA. Le reste va dans « Autres dépenses », avec le libellé ; l'appli propose les plus courants (transport, SNEL, REGIDESO, crédit téléphone…).

**Les dollars ?**
Un compte par devise : la caisse en dollars se tient en dollars, comme dans le tiroir. Chaque opération garde le taux du jour. À la clôture, un seul taux, celui du 31 décembre. L'écart est un gain ou une perte de change. Convention à faire valider par l'expert partenaire.

**Pourquoi pas un cahier ou Excel ?**
Le cahier ne calcule rien et Excel ne connaît pas le SMT. Mbongo produit directement les états du SMT, marche hors ligne sur un téléphone d'entrée de gamme, Android ou iPhone, et parle lingala.

**Sans internet, vraiment ?**
Oui. Après la première ouverture, l'appli ne télécharge plus rien. Essai automatique en mode avion (`npm run essai:hors-ligne`), et essai sur un vrai téléphone.

**Où sont les données ? Qui les voit ?**
Sur le téléphone du commerçant, qui peut en faire une copie. Le serveur de TRK ne contient pour l'instant que les clients et leurs abonnements. Sa base est déjà cloisonnée : un client ne voit que ses propres comptes, l'équipe de TRK ne voit jamais la comptabilité des clients, et personne ne peut modifier une saisie. C'est vérifié par des essais sur le serveur. Le respect du Code du numérique (ordonnance-loi n° 23/010) reste à documenter avant un pilote : consentement, conservation, hébergement hors RDC.

**Comment TRK Consulting gagne-t-elle de l'argent ?**
Par abonnement : mise en place 30 000 CDF, puis 25 000 CDF par mois (Essentiel) ou 50 000 CDF (Suivi). La console suit les abonnements et prépare les rappels SMS avant l'échéance.

**L'appli tient-elle si beaucoup de monde s'y connecte ?**
Les pages sont statiques, servies par Firebase. Un essai de charge (k6, 60 utilisateurs simultanés) n'a relevé aucune erreur sur 38 000 requêtes. Les saisies, elles, ne passent pas par le réseau.

## Limites à reconnaître

- Pas encore de pilote réel : rien n'a été testé par un vrai commerçant.
- Les saisies ne remontent pas encore au serveur : le bureau ne voit que les données de l'ordinateur.
- Les SMS sont en mode test tant qu'aucun fournisseur n'est branché.
- Le lingala est une traduction de travail, à faire relire.
- Les conventions comptables D1 à D10 (cessions, emprunts, dollars, tontines) sont des choix à faire valider par l'expert-comptable partenaire.
- Les seuils en francs congolais sont des équivalents à revoir chaque année.

---

## Plan B

Dans l'ordre, si quelque chose lâche :

1. **Pas de réseau dans la salle** : rien à faire pour l'appli et le bureau, tout est local. Seule la console en a besoin : passer la partie 4 ou montrer sa capture.
2. **Le téléphone ne se projette pas** : faire la partie 1 sur l'ordinateur, dans le navigateur (la version ordinateur a le menu à gauche), à la même adresse.
3. **L'ordinateur refuse de lancer l'appli** : passer les vidéos du scénario (`soutenance/video/telephone.webm` et `bureau.webm`), sur la clé USB.
4. **Plus rien ne marche** : les captures du scénario sont dans les diapositives. On raconte le même scénario image par image.
