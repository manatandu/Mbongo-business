# Mbongo · logiciel d'assistance comptable et de gestion

## Contexte

Projet tutoré de Licence 3 (Sciences de gestion, RDC), année 2026-2027.
Sujet : **Création d'une structure d'assistance comptable et de gestion destinée aux micro et petites entreprises** (Kinshasa).

Le logiciel illustre l'offre de la structure. Il sert d'abord à la démonstration devant le jury, ensuite éventuellement à un pilote réel auprès de quelques commerçants de Kinshasa.

Langue du produit et du code commenté : **français**. Interface commerçant bilingue français / lingala.

## Cadre juridique à respecter (non négociable)

Loi n° 15/002 du 12 février 2015 (Ordre national des experts-comptables, ONEC), modifiée par la loi n° 18/017 du 9 juillet 2018.

- **Art. 43** : huit actes de l'expert-comptable, dont 43.1 « tenir, organiser et redresser la comptabilité des tiers », 43.3 conseil comptable, 43.4 certification, 43.6 à 43.8 assistance et déclarations fiscales.
- **Art. 71** (rédaction 2018) : le non-inscrit qui effectue l'une des missions de l'art. 43 est pénalement puni.
- **Art. 42** : interdiction d'un terme créant la confusion avec le titre d'expert-comptable.

Conséquences pour le produit :

1. **Le commerçant saisit lui-même ses opérations.** Le logiciel le guide ; la structure l'assiste (formation, contrôle des saisies et des pièces, aide à l'inventaire). Elle ne tient pas la comptabilité à sa place.
2. Tenue déléguée, conseil comptable, fiscal, arrêté et certification des états passent par un **expert-comptable inscrit, partenaire par convention**. Il a son propre accès dans le logiciel.
3. Aucun écran, texte ou nom ne présente la structure comme un cabinet d'expertise comptable. Les états portent leur statut : « Non arrêtés » ou « Arrêtés le … » par l'expert.
4. Fiscalité : l'IRPP des micro et petites entreprises seulement (rappels d'échéances, jamais de déclaration).

## Référentiel comptable : Système minimal de trésorerie (SMT)

AUDCIF révisé (OHADA, 2017), art. 13 et Titre X. Détail complet dans `docs/regles-smt.md`. À lire avant de coder le moteur de calcul.

En bref : comptabilité de trésorerie (recettes / dépenses), un journal par caisse et par banque, journaux de suivi des créances et des dettes, inventaire extra-comptable en fin d'exercice, états = bilan SMT + compte de résultat SMT + notes 1 à 3. Résultat : **G = C − D + E − F**, avec C = A − B.

Seuils d'éligibilité (CA HT annuel), en francs congolais, valeurs 2026 : négoce < 240 M CDF, artisanat < 160 M, services < 120 M. Le logiciel ne manie que le CDF et l'USD. Au-delà, l'entreprise passe au Système normal chez l'expert-comptable partenaire : le logiciel doit **le détecter et l'alerter**, pas le gérer.

## Utilisateurs et rôles

Mbongo est un petit logiciel. On le garde à cette taille.

| Rôle | Support | Peut faire |
|---|---|---|
| Commerçant | téléphone Android, hors ligne | saisir recettes, dépenses, transferts, ventes et achats à crédit, photo des pièces, inventaire ; voir soldes, tableau de bord, journaux, états |
| Assistant (structure) | navigateur, bureau | voir ses clients, leurs contrôles et leurs états ; **aucune écriture** dans les saisies |
| Expert-comptable partenaire | navigateur, bureau | la même chose, plus la correction du taux du dollar au 31 décembre et l'arrêté des états |

Pas d'administrateur ni de comptes tant qu'il n'y a pas de serveur.

## Modules fonctionnels

1. **Caisse et banque** : comptes de trésorerie (caisse, M-Pesa, Orange Money, Airtel Money, banques, tontine) ; opérations recette / dépense / transfert ; ventilation SMT ; un compte par devise (CDF, USD), taux du jour saisi par le commerçant ; photo de la pièce.
2. **Tiers et stocks** : créances et dettes, règlements en une ou plusieurs fois ; client particulier ou commerçant (délai d'un an pour réclamer à un particulier), dossier de créance imprimable avec reconnaissance de dette ; inventaire fait par le commerçant ; registre du matériel avec amortissement linéaire sans prorata temporis.
3. **Contrôle** : opérations sans pièce, jours ouvrés sans vente, mois sans saisie, solde négatif, créances de plus de 30 jours, créances sur un particulier proches d'un an, seuils SMT, inventaire et taux de clôture manquants. **Échéancier** fiscal et social (rappels sans montant).
4. **Sorties** : journal de trésorerie mensuel par compte, compte de résultat, bilan, notes 1 à 3, tableau de bord du commerçant ; au bureau, impression PDF et export Excel.
5. **Livres** : livre des recettes et des dépenses, registre des achats (format de l'AUDCG, art. 31 et 32), tirés des saisies, pour tout commerçant. Le logiciel ne gère pas de statut juridique.
6. **Bureau** : trois écrans (clients, contrôles d'un client, ses états) ; arrêté par un bouton réservé à l'expert.
7. **Site vitrine** de la structure (offre, formules, démonstration, contact WhatsApp affiché en clair).

## Architecture technique retenue

- **Front** : React + TypeScript + Vite, deux pages (appli, bureau), application installable (PWA) pour Android d'entrée de gamme.
- **Données** : IndexedDB (Dexie) dans le navigateur, en ajout seulement. Pas de serveur pour la soutenance.
- **Serveur** : seulement pour un éventuel pilote réel (Supabase, RLS, envoi des saisies). Voir `docs/architecture.md`, § 14.
- **Moteur de calcul SMT** : module TypeScript pur, sans dépendance à l'interface, couvert par des tests (Vitest, fast-check). C'est la pièce critique.
- **Site vitrine** : page statique séparée dans `site/`.
- Montants stockés en **entiers** (francs congolais ; centimes de dollar pour l'USD). Jamais de flottants pour l'argent.

## Modèle de données (base locale)

- `entreprises` (nom, activité, secteur SMT négoce / artisanat / services, commune, identifiant fiscal)
- `exercices` (année, soldes d'ouverture, stock initial, stock final, taux de clôture, statut, arrêté le)
- `comptes` (entreprise, type, libellé, devise)
- `operations` (date, type, compte, compte de destination, nature SMT, libellé, montant, devise, taux, pièce, annulation, règlement de)
- `tiers` (créance ou dette : date, n° facture, nom, nature, montant, devise, taux ; pour une créance, client particulier ou commerçant et adresse)
- `immobilisations`, `sorties` (registre du matériel, cessions)
- `inventaires` (lignes du stock, validé ou non)
- `pieces` (photos), `reglages`, `fileEnvoi` (prête pour un serveur)

## Règles de travail dans ce dépôt

- Avancer par étapes courtes ; à la fin de chaque étape, état de ce qui marche et de ce qui reste.
- Tout calcul comptable a son test ; le bilan doit toujours s'équilibrer (test d'invariant actif = passif).
- Pas de dépendance lourde sans raison. Penser au poids sur un téléphone à 2 Go de RAM et à la data mobile.
- Libellés de l'interface simples, sans jargon pour le commerçant ; vocabulaire SMT exact sur les états.
- Données de démonstration toujours marquées comme fictives.

## Commandes

- `npm test` : tous les tests (moteur, invariant, pureté). `TIRAGES=10000 npm test` pour un invariant plus poussé.
- `npm run typage` : vérification TypeScript.
- `npm run verifier` : les deux, à lancer avant chaque commit.
- `npm run build` puis `npm run essai:hors-ligne` : essai de l'appli en mode avion (Playwright).
- `npm run build` puis `npm run scenario [dossier]` : scénario de soutenance rejoué (captures, Excel, vidéos). `DATE=2027-07-12` pour le rejouer à une autre date.
- `firebase deploy --only hosting` : mise en ligne sur Firebase Hosting (voir `docs/deploiement.md`).

## Feuille de route

1. Moteur SMT et tests : fait.
2. Appli du commerçant : faite, installable, marche sans réseau (essai en mode avion automatisé).
3. Bureau et exports PDF / Excel : faits.
4. Site vitrine : maquette faite ; restent les informations réelles.
5. Soutenance : préparée (`docs/soutenance.md`, `npm run scenario`) ; restent l'essai sur un vrai téléphone et les diapositives.
Plus tard, seulement s'il y a un pilote : serveur.

## Références

- `prototype/index.html` : prototype fonctionnel validé (un seul fichier, logique de calcul déjà juste, sert de référence visuelle et métier).
- `docs/regles-smt.md` : règles comptables détaillées.
- `docs/cadre-juridique.md` : partage des rôles structure / expert-comptable.
- `docs/architecture.md` : plan du logiciel, conventions D1 à D10, feuille de route.
- `docs/soutenance.md` : scénario de démonstration, questions du jury, plan B.
- `docs/cadre-petites-entreprises.md` : textes OHADA, fiscaux, sociaux et professionnels qui touchent les micro et petites entreprises au SMT, et pistes pour le logiciel.
