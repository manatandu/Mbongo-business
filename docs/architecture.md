# Plan du logiciel Mbongo

Version 0.2, 29 octobre 2026. Plan allégé : Mbongo est un petit logiciel pour accompagner de petits commerçants au SMT. On le garde à cette taille.

Sommaire

1. Ce que fait le logiciel
2. Trois contraintes
3. Vue d'ensemble
4. Organisation du dépôt
5. Le moteur SMT
6. Les données sur le téléphone
7. L'appli du commerçant
8. Le bureau
9. Dollars et taux
10. Fin d'exercice
11. Contrôles automatiques
12. Poids
13. Tests
14. Un serveur, seulement pour un pilote
15. Conventions comptables (D1 à D10)
16. Risques
17. Feuille de route

---

## 1. Ce que fait le logiciel

Le commerçant note sur son téléphone ce qui entre et ce qui sort, à crédit ou payé, avec la photo de la facture. Le logiciel tient ses journaux de trésorerie, suit ce qu'on lui doit et ce qu'il doit, et prépare ses états SMT.

Au bureau, la structure voit ses clients, ce qui cloche dans leurs saisies, et leurs états. L'expert-comptable partenaire arrête les états.

Ce que le logiciel ne fait pas : la comptabilité à la place du commerçant, le Système normal, les déclarations fiscales, la paie.

## 2. Trois contraintes

**Le droit.** Loi n° 15/002, art. 43 et 71 : la tenue de la comptabilité des tiers est réservée à l'expert-comptable inscrit. Le commerçant saisit lui-même. Le bureau ne modifie jamais ses saisies : il n'a aucun bouton pour le faire. Seul l'expert arrête les états. Mention fixe sur les états : « Mbongo prépare, il ne certifie pas. » (`docs/cadre-juridique.md`).

**Le terrain.** Android d'entrée de gamme, data chère, réseau qui va et vient, coupures. L'appli marche sans réseau, pèse peu, ne télécharge rien d'inutile.

**Le projet.** Une personne, une année, une soutenance. Un logiciel qu'on peut finir, expliquer et défendre.

## 3. Vue d'ensemble

```
            ┌──────────────────────────────┐
            │  Moteur SMT (TypeScript pur) │
            │  calculs, contrôles, états   │
            └───────┬──────────────┬───────┘
                    │              │
        ┌───────────▼───┐     ┌────▼──────────────┐
        │ Appli         │     │ Bureau            │
        │ commerçant    │     │ assistant, expert │
        │ téléphone     │     │ navigateur        │
        └───────┬───────┘     └────┬──────────────┘
                │                  │
          ┌─────▼──────────────────▼─────┐
          │ Base locale (IndexedDB)      │
          └──────────────────────────────┘

  Site vitrine : page statique à part, sans lien avec la base.
```

Trois idées tiennent l'ensemble.

1. **Un seul moteur de calcul**, utilisé par l'appli et par le bureau. Une règle SMT n'est écrite qu'une fois.
2. **Des données en ajout seulement.** Une saisie n'est jamais modifiée ni effacée. Une erreur se corrige par une annulation, puis une nouvelle saisie. L'historique est la donnée elle-même.
3. **Pas de serveur pour la soutenance.** Tout tient dans le navigateur. Si le Wi-Fi de la salle tombe, la démonstration continue.

## 4. Organisation du dépôt

Un projet Vite, deux pages. Le téléphone ne télécharge jamais le code du bureau.

```
Mbongo-business/
├── CLAUDE.md
├── docs/                  ce plan, règles SMT, cadre juridique
├── prototype/index.html   référence métier et visuelle
├── index.html             appli du commerçant
├── bureau.html            bureau de la structure
├── src/
│   ├── moteur/            calculs SMT purs
│   ├── donnees/           base locale, saisie validée, démonstration
│   ├── demo/              boutique fictive
│   ├── i18n/              français, lingala
│   ├── ui/                format des montants et des dates, styles de l'appli
│   ├── app/               écrans du commerçant
│   └── bureau/            trois écrans, export Excel
├── tests/                 moteur, données, bureau, format
├── public/                icônes
└── site/                  site vitrine
```

Règle de dépendance, vérifiée par un test : `moteur` n'importe rien d'autre que lui-même. Ni React, ni la base, ni la date du jour.

## 5. Le moteur SMT

### 5.1 Principe

Une entrée : le dossier complet d'un exercice. Des fonctions pures qui en tirent les journaux, les états et les contrôles. La date de référence est un paramètre.

```ts
calculerEtats(dossier, { auDate }): Etats
journalMensuel(dossier, compteId, mois): JournalTresorerie
controler(dossier, auDate, parametres): Anomalie[]
cloturer(dossier): OuvertureExerciceSuivant
```

### 5.2 Règles de calcul

- **Résultat** : G = C − D + E − F, avec C = A − B. Détail dans `docs/regles-smt.md`.
- **Montants** en entiers : francs congolais, centimes de dollar. Une conversion par opération, arrondie au franc, à un seul endroit (`montants.ts`).
- **Encours à une date** : facture moins les règlements faits jusqu'à cette date. Un client peut payer en plusieurs fois.
- **Amortissement** linéaire sans prorata ; la dernière annuité prend le reste, le cumul égale la valeur d'origine.
- **Natures** : liste fermée. Libellé simple à l'écran (« Argent pour la maison »), terme SMT exact sur les états (« Prélèvement de l'exploitant »).

### 5.3 L'invariant

Total actif = total passif, au franc près, pour n'importe quelle suite d'opérations valides. Deux preuves : des cas écrits à la main (dont le jeu du prototype) et un test de propriété qui tire des milliers d'exercices au hasard. On ne montre pas au jury que le bilan s'équilibre sur un exemple : on montre qu'il ne peut pas être déséquilibré.

## 6. Les données sur le téléphone

- **Base locale** IndexedDB, via Dexie. Le téléphone est la source de vérité. `navigator.storage.persist()` au lancement, pour que Chrome n'efface pas la base.
- **Tables** : entreprises, exercices, comptes, opérations, tiers (créances et dettes), immobilisations, sorties, inventaires, pièces (photos), réglages.
- **Saisie validée par le moteur** avant toute écriture : une saisie qui déséquilibrerait le dossier est refusée avec un message clair.
- **Identifiants** UUID v7, créés sur l'appareil.
- **Photos** compressées avant stockage : 1 280 px, JPEG 0,6, environ 100 Ko. Une facture reste lisible.
- **Copie de sauvegarde** : un fichier à télécharger depuis Réglages, pour ne pas tout perdre avec le téléphone.

## 7. L'appli du commerçant

| Écran | Contenu |
|---|---|
| Accueil | argent disponible, entré et sorti du mois, on me doit, je dois, deux alertes au plus |
| Saisir | recette, dépense, transfert, change de dollars ; payé ou à crédit ; photo ; le reste sous « Plus d'options » |
| Journal | un compte, un mois, en liste lisible : début du mois, entré, sorti, fin du mois |
| Clients et fournisseurs | ce qu'on me doit, ce que je dois, encaisser ou payer en une ou plusieurs fois |
| Plus | matériel, stock (inventaire), états, réglages |

Principes : grands boutons, une action par écran, français ou lingala, chiffres en gros, code à quatre chiffres pour le téléphone partagé (discrétion familiale, pas une sécurité forte). Mode démonstration : la boutique fictive « Alimentation Maman Nsimba », marquée fictive partout.

## 8. Le bureau

### 8.1 Trois écrans

1. **Clients** : un tableau. Entreprise, secteur, dernière saisie, ventes de l'année, résultat provisoire, et ce qu'il y a à faire (à traiter, à revoir, rien à signaler, états arrêtés).
2. **Contrôles d'un client** : la liste de ce qui cloche, à voir avec le commerçant. C'est lui qui corrige, depuis son téléphone.
3. **États d'un client** : compte de résultat, bilan, notes 1 à 3, mention fixe. Imprimer ou enregistrer en PDF, exporter en Excel.

Un sélecteur « Je suis : assistant / expert-comptable partenaire » en haut. Pas de comptes ni de mots de passe tant qu'il n'y a pas de serveur.

### 8.2 L'arrêté

Un bouton, réservé à l'expert : « Arrêter les états ». Il s'ouvre quand trois conditions sont remplies : l'exercice est terminé, le commerçant a validé son inventaire, le taux du dollar au 31 décembre est saisi (s'il y a des comptes en dollars). L'exercice passe alors « arrêté le … ». Un bouton « Annuler l'arrêté » permet de revenir en arrière.

### 8.3 Exports

- **PDF** : la page des états est prévue pour l'impression A4 ; « Enregistrer en PDF » du navigateur. Aucune bibliothèque.
- **Excel** : un classeur de trois feuilles (compte de résultat, bilan, notes), montants en vrais nombres, mention fixe en pied de chaque feuille. Bibliothèque `write-excel-file`, chargée au clic seulement (environ 20 Ko compressés). Le téléphone ne la télécharge jamais.

### 8.4 Habillage

Sobre : bandeau bleu de Mbongo avec un filet jaune, tableaux blancs à en-tête bleu, police du système, 14 px. Rien à télécharger. Contrastes mesurés (WCAG 2.1, AA : 4,5:1 pour le texte, 3:1 pour un bord de champ ou un trait).

| Couple | Rapport |
|---|---|
| texte sur blanc | 17,52:1 |
| texte secondaire sur blanc | 6,23:1 |
| texte secondaire sur le fond | 5,34:1 |
| bleu des liens sur blanc | 6,28:1 |
| blanc sur bouton principal | 6,28:1 |
| blanc sur en-tête de tableau | 8,35:1 |
| texte du bandeau | 12,57:1 |
| « Je suis » sur le bandeau | 7,67:1 |
| ligne de total | 12,91:1 |
| pastilles vert, ocre, rouge sur leur fond | 5,32:1 au moins |
| bord des champs et boutons sur blanc | 3,47:1 |
| filet jaune sur le bandeau | 8,51:1 |

## 9. Dollars et taux

- Un compte par devise : « Caisse » et « Caisse dollars ». Le journal d'un compte en dollars se tient en dollars ; le comptage physique se compare directement.
- Chaque opération en dollars porte le taux saisi par le commerçant ce jour-là. L'appli propose le dernier taux utilisé.
- Changer des dollars chez le cambiste = un transfert entre les deux caisses, avec les deux montants réels.
- **Un seul taux décidé au bureau** : le taux du 31 décembre, saisi par l'expert avant l'arrêté. Les soldes en dollars y sont convertis ; l'écart est un gain ou une perte de change (D3).

## 10. Fin d'exercice

- **Exercice** : année civile. Statuts : ouvert, puis arrêté.
- **Entrée en cours d'année** : soldes d'ouverture au 1er janvier, puis un total par mois manquant, repris du cahier de caisse.
- **Inventaire** : fait par le commerçant sur son téléphone (écran Stock), ligne par ligne, puis validé. Le stock final validé entre dans les états. L'assistant l'aide sur place s'il le faut ; il ne saisit pas à sa place.
- **Clôture** : `cloturer()` ouvre l'exercice suivant. Soldes de clôture, stock final devenu initial, créances et dettes reportées, matériel à sa valeur nette, compte exploitant N+1 = compte exploitant N + résultat N.

## 11. Contrôles automatiques

| Contrôle | Règle | Niveau |
|---|---|---|
| sans pièce | opération sans photo ni pièce | à revoir |
| jours sans vente | cinq jours ouvrés d'affilée sans vente saisie | à revoir |
| mois sans saisie | mois écoulé sans aucune opération | à revoir |
| solde négatif | une caisse ou un compte mobile passe sous zéro, à n'importe quelle date | à traiter |
| découvert bancaire | un compte en banque passe sous zéro | à revoir |
| créances anciennes | encours de plus de 30 jours | à traiter |
| seuil SMT | ventes estimées à 80 % puis 100 % du seuil du secteur | à revoir, puis à traiter |
| stock non inventorié | exercice terminé sans inventaire validé | à traiter |
| taux de clôture manquant | exercice terminé, comptes en dollars, pas de taux du 31 décembre | à traiter |

Le seuil SMT est fixé en FCFA. L'équivalent en francs congolais est un paramètre (`src/donnees/parametres.ts`, 5 FC pour 1 FCFA en 2026, à revoir chaque année). Le logiciel alerte ; le passage au Système normal se fait chez l'expert-comptable partenaire.

## 12. Poids

Mesuré à la construction, compressé :

| Élément | Poids |
|---|---|
| appli du commerçant (React, Dexie, moteur, écrans, deux langues) | environ 142 Ko |
| bureau, en plus du code partagé | environ 7 Ko |
| export Excel, au clic seulement | environ 20 Ko |

Une micro-entreprise saisit 1 000 à 5 000 opérations par an. Le moteur recalcule tout l'exercice en quelques millisecondes.

## 13. Tests

| Niveau | Outil | Ce qu'on vérifie |
|---|---|---|
| moteur | Vitest | chaque règle, chaque nature, chaque cas limite |
| invariant | Vitest + fast-check | actif = passif sur des milliers d'exercices tirés au hasard |
| non-régression | Vitest | le jeu du prototype redonne ses montants |
| données | Vitest + fake-indexeddb | saisie validée, annulations, démonstration valide chaque jour de 2026 à 2028, arrêté |
| bureau | Vitest | le classeur Excel reprend les montants des états et porte la mention |
| parcours | Playwright | scénario de la soutenance, de bout en bout (à faire) |

`npm run verifier` avant chaque commit. Règle du dépôt : tout calcul comptable a son test.

## 14. Un serveur, seulement pour un pilote

Pas de serveur pour la soutenance. Si des commerçants de Kinshasa utilisent Mbongo pour de vrai, il en faudra un pour que le bureau voie les dossiers depuis un autre ordinateur. Ce qu'il apporterait alors :

- Supabase : base Postgres, connexion par numéro de téléphone, stockage des photos ;
- règles de sécurité dans la base (RLS) : l'assistant lit, il n'écrit jamais dans les saisies du commerçant ;
- envoi des saisies quand le réseau revient. La file d'envoi existe déjà dans la base locale, et comme les données sont en ajout seulement, il n'y a pas de conflit à arbitrer.

Points à régler avant : coût (offre gratuite mise en pause après une semaine sans activité, environ 1 Go de photos), SMS de connexion vers la RDC, données personnelles (Code du numérique, ordonnance-loi n° 23/010 du 13 mars 2023 : consentement, hébergement hors RDC, durée de conservation).

## 15. Conventions comptables (D1 à D10)

Le modèle SMT ne tranche pas ces cas. Retenues le 29 octobre 2026, à faire confirmer par l'expert-comptable partenaire avant un pilote. Détail dans `docs/regles-smt.md`, § 8.

| N° | Cas | Convention |
|---|---|---|
| D1 | vente de matériel | prix en autres recettes (A), valeur nette sortie ajoutée à F |
| D2 | emprunts | hors A et B, ligne Emprunt du bilan ; intérêts dans B |
| D3 | dollars | un compte par devise ; soldes au taux de clôture, écart en gain ou perte de change |
| D4 | paiements partiels | plusieurs règlements par facture, jamais au-delà de l'encours |
| D5 | corrections | annulation à sa propre date, puis nouvelle saisie |
| D6 | cautions | note 1, non amorties |
| D7 | connexion | aucune pour la soutenance ; téléphone et code par SMS ou WhatsApp pour un pilote |
| D8 | organisation du code | un projet, deux pages |
| D9 | tontine (likelemba) | compte de type tontine, présenté sur la ligne Banque, hors résultat |
| D10 | matériel à crédit | refusé : le matériel se saisit à la date du paiement |

Allègements décidés le 29 octobre 2026 : bureau réduit à trois écrans ; arrêté réduit à un bouton ; un seul taux décidé au bureau (le taux de clôture), plus de confirmation opération par opération ; inventaire fait par le commerçant seul ; pas de serveur avant un pilote. L'export Excel est gardé.

## 16. Risques

| Risque | Parade |
|---|---|
| erreur de calcul devant le jury | moteur isolé, test de propriété, non-régression |
| réseau absent le jour de la soutenance | tout est local |
| bureau qui écrit à la place du commerçant (art. 71) | aucun écran du bureau n'écrit dans les saisies |
| confusion avec un cabinet (art. 42) | vocabulaire surveillé, mention fixe sur les états |
| téléphone perdu ou base effacée | `storage.persist()`, appli installée, copie de sauvegarde |
| commerçant qui ne saisit pas | contrôles des jours sans vente, saisie en deux gestes |
| périmètre qui gonfle | ce plan ; une étape à la fois |

## 17. Feuille de route

Chaque étape se termine par un état de ce qui marche et de ce qui reste.

**1. Moteur SMT et tests** · fait. Invariant vérifié sur des centaines de milliers d'exercices tirés au hasard.

**2. Appli du commerçant** · presque fait. Saisie, journaux, clients et fournisseurs, matériel, stock, états, deux langues, démonstration.
Reste : l'installation sur l'écran d'accueil qui marche sans réseau (service worker, `vite-plugin-pwa` déjà installé, icônes prêtes) et un essai complet en mode avion.

**3. Bureau et exports** · fait. Trois écrans, arrêté, PDF, Excel.

**4. Site vitrine** · maquette faite (`site/index.html`).
Reste : numéro WhatsApp, formules et tarifs, mentions légales, adresse de l'appli.

**5. Soutenance**
Livrable : scénario minuté sur la boutique fictive, parcours Playwright qui le rejoue, plan B sans réseau, captures pour le mémoire.

**Plus tard, seulement s'il y a un pilote** : le serveur de la section 14.
