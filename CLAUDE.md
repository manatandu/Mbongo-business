# Mbongo · logiciel d'assistance comptable et de gestion

## Contexte

Projet tutoré de Licence 3 (Sciences de gestion, RDC), année 2026-2027.
Sujet : **Création d'une structure d'assistance comptable et de gestion destinée aux micro et petites entreprises de la commune de Lingwala** (Kinshasa).

Le logiciel illustre l'offre de la structure. Il sert d'abord à la démonstration devant le jury, ensuite éventuellement à un pilote réel auprès de quelques commerçants de Lingwala.

Langue du produit et du code commenté : **français**. Interface commerçant bilingue français / lingala.

## Cadre juridique à respecter (non négociable)

Loi n° 15/002 du 12 février 2015 (Ordre national des experts-comptables, ONEC), modifiée par la loi n° 18/017 du 9 juillet 2018.

- **Art. 43** : huit actes de l'expert-comptable, dont 43.1 « tenir, organiser et redresser la comptabilité des tiers », 43.3 conseil comptable, 43.4 certification, 43.6 à 43.8 assistance et déclarations fiscales.
- **Art. 71** (rédaction 2018) : le non-inscrit qui effectue l'une des missions de l'art. 43 est pénalement puni.
- **Art. 42** : interdiction d'un terme créant la confusion avec le titre d'expert-comptable.

Conséquences pour le produit :

1. **Le commerçant saisit lui-même ses opérations.** Le logiciel le guide ; la structure l'assiste (formation, contrôle des saisies et des pièces, préparation de l'inventaire). Elle ne tient pas la comptabilité à sa place.
2. Tenue déléguée, conseil comptable, fiscal, arrêté et certification des états passent par un **expert-comptable inscrit, partenaire par convention**. Il a son propre accès dans le logiciel.
3. Aucun écran, texte ou nom ne présente la structure comme un cabinet d'expertise comptable. Mention fixe sur les états : « Mbongo prépare, il ne certifie pas. »

## Référentiel comptable : Système minimal de trésorerie (SMT)

AUDCIF révisé (OHADA, 2017), art. 13 et Titre X. Détail complet dans `docs/regles-smt.md`. À lire avant de coder le moteur de calcul.

En bref : comptabilité de trésorerie (recettes / dépenses), un journal par caisse et par banque, journaux de suivi des créances et des dettes, inventaire extra-comptable en fin d'exercice, états = bilan SMT + compte de résultat SMT + notes 1 à 3. Résultat : **G = C − D + E − F**, avec C = A − B.

Seuils d'éligibilité (CA HT annuel) : négoce < 60 M FCFA, artisanat < 40 M, services < 30 M, ou l'équivalent en francs congolais. Au-delà, l'entreprise passe au Système normal chez l'expert-comptable partenaire : le logiciel doit **le détecter et l'alerter**, pas le gérer.

## Utilisateurs et rôles

| Rôle | Support | Peut faire |
|---|---|---|
| Commerçant | téléphone Android, hors ligne d'abord | saisir recettes, dépenses, transferts, ventes et achats à crédit, photo des pièces ; voir soldes, tableau de bord, journaux, états |
| Assistant (structure) | navigateur web | voir tous ses clients, contrôles automatiques, relances, taux de change, préparation de l'inventaire ; **lecture seule** sur les saisies, commentaires possibles |
| Expert-comptable partenaire | navigateur web | lecture de tous les clients sous convention, arrêté des états, journal de ses interventions |
| Administrateur | web | comptes, abonnements, conventions |

## Modules fonctionnels

1. **Caisse et banque** : comptes de trésorerie (caisse, M-Pesa, Orange Money, Airtel Money, banques) ; opérations recette / dépense / transfert ; ventilation SMT ; double devise CDF / USD avec taux saisi par l'assistant et historisé ; photo de la pièce.
2. **Tiers et stocks** : créances impayées, dettes à payer, encaissement ou règlement qui génère l'écriture de trésorerie ; état des stocks (inventaire) ; registre du matériel avec amortissement linéaire sans prorata temporis.
3. **Contrôle** : opérations sans pièce, jours ouvrés sans vente saisie, solde de caisse négatif, créances de plus de 30 jours, dépassement des seuils SMT, opérations en dollars à confirmer.
4. **Sorties** : journal de trésorerie mensuel par compte (modèle note 4), compte de résultat, bilan, notes 1 à 3, tableau de bord du commerçant ; export PDF et Excel.
5. **Site vitrine** de la structure (offre, formules, démonstration, contact WhatsApp affiché en clair).

## Architecture technique retenue

- **Front** : React + TypeScript + Vite, application web installable (PWA), conçue pour Android d'entrée de gamme et connexion intermittente.
- **Hors ligne** : IndexedDB (Dexie) côté client, file d'attente de synchronisation, résolution de conflits simple (les opérations sont des ajouts, jamais des écrasements).
- **Back** : Supabase (Postgres, Auth par numéro de téléphone, Storage pour les photos de pièces, Row Level Security par rôle et par entreprise).
- **Moteur de calcul SMT** : module TypeScript pur, sans dépendance à l'interface, couvert par des tests unitaires (Vitest). C'est la pièce critique.
- **Site vitrine** : page statique séparée dans `site/`.
- Montants stockés en **entiers** (francs congolais ; centimes de dollar pour l'USD). Jamais de flottants pour l'argent.

## Modèle de données (première version)

- `entreprises` (nom, activité, secteur SMT négoce / artisanat / services, commune, identifiant fiscal, exercice)
- `comptes_tresorerie` (entreprise, type, libellé, solde d'ouverture)
- `operations` (entreprise, date, type, compte, compte_destination, nature SMT, libellé, montant, devise, taux appliqué, pièce, auteur, créé hors ligne le)
- `tiers_creances`, `tiers_dettes` (date, n° facture, nom, montant, date de règlement, opération liée)
- `immobilisations` (date, désignation, montant, durée, date de sortie, prix de cession, opération liée)
- `inventaires` (exercice, stock initial, stock final, détail des lignes)
- `taux_change` (date, valeur, saisi par)
- `arretes` (exercice, expert, date, statut)
- `utilisateurs`, `affectations` (qui suit quelle entreprise, à quel titre)

## Règles de travail dans ce dépôt

- Avancer par étapes courtes ; à la fin de chaque étape, état de ce qui marche et de ce qui reste.
- Tout calcul comptable a son test ; le bilan doit toujours s'équilibrer (test d'invariant actif = passif).
- Pas de dépendance lourde sans raison. Penser au poids sur un téléphone à 2 Go de RAM et à la data mobile.
- Libellés de l'interface simples, sans jargon pour le commerçant ; vocabulaire SMT exact sur les états.
- Données de démonstration toujours marquées comme fictives.

## Feuille de route

1. Moteur SMT en TypeScript + tests (repris et durci depuis `prototype/index.html`).
2. Appli commerçant hors ligne (saisie, journaux, tiers, états), sans back.
3. Supabase : schéma, RLS, authentification, synchronisation.
4. Espace assistant, puis espace expert.
5. Exports PDF / Excel des états.
6. Site vitrine.
7. Préparation de la démonstration de soutenance (jeu de données fictif, scénario).

## Références

- `prototype/index.html` : prototype fonctionnel validé (un seul fichier, logique de calcul déjà juste, sert de référence visuelle et métier).
- `docs/regles-smt.md` : règles comptables détaillées.
- `docs/cadre-juridique.md` : partage des rôles structure / expert-comptable.
