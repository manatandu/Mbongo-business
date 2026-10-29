# Architecture du logiciel Mbongo

Version 0.1, octobre 2026. Document de référence : on le suit étape par étape et on le met à jour à chaque décision.

Sommaire

1. Ce que le logiciel doit tenir
2. Vue d'ensemble
3. Organisation du dépôt
4. Le moteur SMT
5. Modèle de données
6. Hors ligne et synchronisation
7. Back-end Supabase et sécurité
8. Applications et écrans
9. Devises et taux de change
10. Exercice, clôture et arrêté
11. Contrôles automatiques
12. Sorties : états, exports, tableau de bord
13. Performance et poids
14. Tests et qualité
15. Déploiement, environnements et coûts
16. Risques
17. Décisions à prendre
18. Feuille de route détaillée

---

## 1. Ce que le logiciel doit tenir

L'architecture découle de quatre contraintes. Chaque choix technique plus bas renvoie à l'une d'elles.

**C1. Le droit.** La loi n° 15/002 (art. 43 et 71) réserve la tenue de la comptabilité des tiers à l'expert-comptable inscrit. Le commerçant saisit lui-même. L'assistant de la structure contrôle sans écrire. Le logiciel doit rendre cette séparation **techniquement impossible à contourner**, pas seulement absente de l'interface. Devant le jury, c'est un argument fort : la règle est dans la base de données, pas dans la bonne volonté de l'utilisateur.

**C2. Le terrain.** Téléphone Android d'entrée de gamme (2 Go de RAM), data mobile chère, réseau intermittent, coupures d'électricité, téléphone parfois partagé en famille, commerçant peu à l'aise avec l'écrit. Le logiciel marche hors ligne d'abord, pèse peu, consomme peu de data.

**C3. Le référentiel.** SMT de l'AUDCIF révisé (art. 13 et Titre X). Les calculs doivent être exacts, traçables et reproductibles : le même jeu d'opérations donne toujours les mêmes états, et le bilan s'équilibre toujours.

**C4. Le contexte du projet.** Projet tutoré de L3, une personne, une année. Démonstration devant un jury avant tout, pilote réel ensuite. Il faut un logiciel qu'on peut finir, expliquer et défendre. Pas d'outillage lourd, pas de micro-services.

---

## 2. Vue d'ensemble

```
                         ┌───────────────────────────────┐
                         │      Moteur SMT (TypeScript)  │
                         │  calculs purs, sans interface │
                         │  ni base de données           │
                         └──────┬───────────┬────────┬───┘
                                │           │        │
             ┌──────────────────┘           │        └──────────────────┐
             ▼                              ▼                           ▼
┌─────────────────────────┐   ┌─────────────────────────┐   ┌────────────────────────┐
│ Appli commerçant (PWA)  │   │ Bureau (web)            │   │ Fonction « arrêter »   │
│ Android, hors ligne     │   │ assistant, expert,      │   │ (Edge Function)        │
│ React + Dexie           │   │ administrateur          │   │ calcule et fige les    │
│ base locale IndexedDB   │   │ en ligne                │   │ états arrêtés          │
└───────────┬─────────────┘   └───────────┬─────────────┘   └───────────┬────────────┘
            │ synchronisation             │ lecture + écritures         │
            │ (ajouts seulement)          │ autorisées par rôle         │
            ▼                             ▼                             ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Supabase                                                                          │
│ Postgres + Row Level Security · Auth · Storage (photos des pièces) · Edge Functions│
└───────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐
│ Site vitrine (statique)  │   séparé, aucun lien technique avec la base
└──────────────────────────┘
```

Trois idées tiennent l'ensemble.

1. **Un seul moteur de calcul**, utilisé partout : sur le téléphone (états provisoires hors ligne), dans le bureau (contrôles, revue), et côté serveur au moment de l'arrêté. On ne recode jamais une règle SMT deux fois.
2. **Des données en ajout seulement.** Une opération saisie n'est jamais modifiée ni effacée. Une erreur se corrige par une annulation suivie d'une nouvelle saisie. Cela règle à la fois la synchronisation hors ligne (pas de conflit entre deux versions d'une même ligne) et la traçabilité (l'historique est la donnée elle-même).
3. **Les droits sont dans la base.** Les règles de sécurité de Postgres (RLS) décident qui lit et qui écrit quoi. L'interface ne fait qu'en tenir compte.

---

## 3. Organisation du dépôt

Un seul projet Vite avec deux points d'entrée. C'est plus simple qu'un monorepo à plusieurs paquets et suffisant pour une personne. Le découpage en points d'entrée garantit que le téléphone du commerçant ne télécharge jamais le code du bureau.

```
Mbongo-business/
├── CLAUDE.md
├── docs/
│   ├── regles-smt.md
│   ├── cadre-juridique.md
│   └── architecture.md          ce document
├── prototype/index.html         référence métier et visuelle
├── index.html                   entrée de l'appli commerçant
├── bureau.html                  entrée du bureau (assistant, expert, admin)
├── src/
│   ├── moteur/                  calculs SMT purs (étape 1)
│   ├── donnees/                 base locale Dexie, dépôts, schémas de validation
│   ├── synchro/                 file d'envoi, réception, envoi des photos
│   ├── back/                    client Supabase, chargé à la demande
│   ├── i18n/                    fr.ts, ln.ts
│   ├── ui/                      composants et styles communs
│   ├── app/                     écrans du commerçant
│   ├── bureau/                  écrans assistant, expert, admin
│   └── demo/                    jeu de données fictif et mode démonstration
├── tests/
│   ├── moteur/                  tests unitaires et tests de propriété
│   ├── donnees/                 tests de la base locale (fake-indexeddb)
│   └── e2e/                     parcours complets (Playwright)
├── supabase/
│   ├── migrations/              schéma SQL versionné
│   ├── functions/arreter-etats/ fonction serveur de l'arrêté
│   └── tests/                   tests des règles RLS
└── site/                        site vitrine statique
```

Règle de dépendance, vérifiée par un test automatique :

```
moteur  ←  donnees  ←  synchro  ←  app / bureau
   ↑                                   ↑
   └──────────── ui, i18n ─────────────┘
```

`moteur/` n'importe rien d'autre que lui-même. Ni React, ni Dexie, ni Supabase, ni la date du jour. C'est ce qui le rend testable et réutilisable côté serveur.

---

## 4. Le moteur SMT

### 4.1 Principe

Une seule entrée, un objet complet décrivant l'exercice d'une entreprise. Des fonctions pures qui en tirent les journaux, les états et les contrôles. Aucun effet de bord. La date de référence est un paramètre, jamais `new Date()`.

```ts
calculerEtats(dossier: DossierExercice, options?: { auDate?: DateISO }): Etats
journalMensuel(dossier, compteId, mois): JournalTresorerie
controler(dossier, auDate): Anomalie[]
cloturer(dossier, tauxCloture): OuvertureExerciceSuivant
```

### 4.2 Modules

| Fichier | Rôle |
|---|---|
| `types.ts` | types du domaine (voir 4.3) |
| `montants.ts` | entiers, conversion USD → CDF, règle d'arrondi unique |
| `dates.ts` | dates AAAA-MM-JJ en UTC, sans lecture de l'horloge |
| `contexte.ts` | index interne d'un dossier (comptes, annulations, taux effectifs) |
| `validation.ts` | refuse un dossier incohérent avant tout calcul |
| `natures.ts` | liste fermée des natures SMT et leur place dans les états |
| `tresorerie.ts` | soldes par compte à une date, journal mensuel (note 4), ventilation |
| `tiers.ts` | encours des créances et dettes à une date, règlements partiels |
| `immobilisations.ts` | dotation linéaire sans prorata, valeur nette, sorties |
| `devises.ts` | réévaluation des comptes en dollars à la clôture |
| `etats.ts` | compte de résultat (A à G), bilan, notes 1 à 3 |
| `controles.ts` | anomalies (section 11) |
| `seuils.ts` | éligibilité SMT, alerte à 80 % et 100 % |
| `cloture.ts` | passage de l'exercice N à l'ouverture N+1 |
| `version.ts` | numéro de version du moteur, inscrit dans chaque arrêté |

### 4.3 Types principaux

```ts
type DateISO = string;                       // "2026-10-29"
type Devise = 'CDF' | 'USD';
type Montant = number;                       // entier : FC, ou centimes de dollar

interface CompteTresorerie {
  id: string;
  type: 'caisse' | 'banque' | 'mobile' | 'tontine'; // mobile = M-Pesa, Orange, Airtel
  libelle: string;
  devise: Devise;                            // décision D3
}                                            // ligne du bilan : Caisse pour une caisse, Banque sinon

interface Operation {
  id: string;                                // UUID créé sur le téléphone
  date: DateISO;
  type: 'recette' | 'depense' | 'transfert';
  compte: string;
  compteDestination?: string;                // transfert
  montantDestination?: Montant;              // transfert entre devises (change)
  nature: Nature;
  libelle: string;
  montant: Montant;                          // dans la devise du compte
  devise: Devise;
  taux: number | null;                       // FC pour 1 $, figé à la saisie
  piece: boolean;
  annule?: string;                           // id de l'opération annulée
  reprise?: boolean;                         // report d'un cahier de caisse
  reglementDe?: { genre: 'creance' | 'dette'; ligne: string };
}

interface PieceTiers {                       // une créance ou une dette
  id: string; date: DateISO; facture: string; nom: string;
  nature: Nature; montant: Montant; devise: Devise; taux: number | null;
  regleAvant?: Montant;                      // part réglée avant l'ouverture
}

interface Immobilisation { id: string; date: DateISO; designation: string;
  categorie: 'materiel' | 'mobilier' | 'caution'; montant: Montant; // en FC
  duree: number; amortissable: boolean; operation?: string;
  sortie?: { date: DateISO; prixCession: Montant; operation?: string }; }

interface DossierExercice {
  entreprise: { nom: string; secteur: 'negoce' | 'artisanat' | 'services'; nif: string };
  exercice: { annee: number; debut: DateISO; fin: DateISO };
  comptes: CompteTresorerie[];
  soldesOuverture: Record<string, Montant>;
  operations: Operation[];
  creances: PieceTiers[]; dettes: PieceTiers[];
  immobilisations: Immobilisation[];
  stockInitial: Montant; stockFinal: Montant | null;
  tauxOuverture: number | null; empruntOuverture: Montant;
  confirmationsTaux: { operation: string; taux: number }[];
  tauxCloture: number | null;
}
```

### 4.4 Natures et place dans les états

| Nature | Saisie | Compte de résultat | Bilan |
|---|---|---|---|
| ventes | recette | A, ventes | |
| autres recettes | recette | A, autres | |
| cession de matériel | recette | voir D1 | sortie du registre |
| apport de l'exploitant | recette | non | compte exploitant + |
| emprunt reçu | recette | non | Emprunt + (D2) |
| achats marchandises, fournitures | dépense | B, achats | |
| loyers, salaires, impôts et taxes, autres | dépense | B | |
| intérêts d'emprunt | dépense | B, charges d'intérêts (D2) | |
| remboursement d'emprunt | dépense | non | Emprunt − (D2) |
| matériel et mobilier | dépense | non, dotation F | Immobilisations |
| caution versée | dépense | non | Immobilisations, non amortie (D6) |
| prélèvement de l'exploitant | dépense | non | compte exploitant − |
| transfert, change | transfert | non | non |

La liste est fermée. Le commerçant ne crée pas de nature. Un libellé simple s'affiche à l'écran (« Argent pour la maison » pour un prélèvement), le terme SMT exact sur les états.

### 4.5 Règles de calcul

- **Résultat** : G = C − D + E − F, avec C = A − B, D = (stock initial − stock final) + (créances au 1er janvier − créances au 31 décembre), E = dettes au 1er janvier − dettes au 31 décembre.
- **Encours à une date** : montant de la facture moins les règlements effectués jusqu'à cette date. Une facture datée après la date n'existe pas encore. Le prototype prenait « non réglé aujourd'hui » ; c'est faux dès qu'on consulte un exercice passé.
- **Amortissement** : annuité entière l'année d'acquisition, aucune l'année qui suit la fin de la durée. Pour rester en entiers, annuité = montant ÷ durée arrondi à l'entier inférieur, et la dernière annuité prend le reste. Le cumul égale exactement la valeur d'origine.
- **Compte exploitant d'ouverture** = trésorerie + stock initial + créances + immobilisations nettes − dettes − emprunts, le tout à l'ouverture. Puis + apports − prélèvements.
- **Arrondi** : un seul endroit, `montants.ts`. Conversion arrondie au franc le plus proche, une fois par opération. Aucun calcul intermédiaire en flottant sur des montants.

### 4.6 L'invariant

Total actif = total passif, au franc près, pour **n'importe quelle** suite d'opérations valides. On le prouve de deux façons :

1. des cas écrits à la main (jeu du prototype, chaque nature, chaque cas limite) ;
2. un test de propriété (bibliothèque `fast-check`, en développement seulement) qui génère des milliers d'exercices aléatoires et vérifie l'égalité à chaque fois.

Le deuxième point est rare dans un projet de licence et convaincant devant un jury : on ne montre pas que le bilan s'équilibre sur un exemple, on montre qu'il ne peut pas être déséquilibré.

---

## 5. Modèle de données

Même modèle côté téléphone (Dexie) et côté serveur (Postgres). Les noms suivent le français du projet. Toutes les lignes ont un `id` UUID v7, créé sur l'appareil : ordonné dans le temps, unique sans passer par le serveur.

### 5.1 Tables métier

| Table | Colonnes principales | Écrite par |
|---|---|---|
| `entreprises` | nom, activité, secteur SMT, commune, NIF, RCCM, responsable, téléphone | admin |
| `exercices` | entreprise, année, début, fin, statut, stock initial, stock final | commerçant, puis expert pour le statut |
| `comptes_tresorerie` | entreprise, type, opérateur, libellé, devise, actif | commerçant |
| `soldes_ouverture` | exercice, compte, montant | commerçant (premier exercice), clôture ensuite |
| `operations` | voir `Operation` + auteur, créé sur l'appareil le, reçu le, `seq` | commerçant seul |
| `creances`, `dettes` | voir `PieceTiers` + auteur | commerçant seul |
| `immobilisations` | voir `Immobilisation` | commerçant (créée aussi par une dépense « matériel ») |
| `sorties_immobilisations` | immobilisation, date, prix de cession, opération | commerçant |
| `inventaires` | exercice, date, statut (brouillon, validé), préparé par, validé par | assistant prépare, commerçant valide |
| `lignes_inventaire` | inventaire, référence, désignation, quantité, prix unitaire, montant | assistant ou commerçant |
| `pieces` | opération, chemin dans Storage, taille, empreinte, statut d'envoi | commerçant |

### 5.2 Tables de suivi et de contrôle

| Table | Rôle | Écrite par |
|---|---|---|
| `taux_change` | date, valeur, saisi par, confirmé par, confirmé le | assistant saisit, expert confirme |
| `revisions_taux` | opération, nouveau taux, motif | expert |
| `commentaires` | cible (opération, créance…), auteur, texte | assistant, expert, commerçant |
| `propositions_correction` | opération visée, motif, contenu proposé, statut | assistant propose, commerçant décide |
| `relances` | entreprise, canal, texte, date | assistant |
| `arretes` | exercice, expert, date, instantané des états, empreinte, version du moteur, `seq` max | fonction serveur |
| `journal_interventions` | expert, entreprise, action, détail, date | fonction serveur |

### 5.3 Tables d'administration

`utilisateurs` (profil lié au compte Auth : nom, téléphone, langue), `affectations` (utilisateur, entreprise, rôle, début, fin), `conventions` (expert, n° d'inscription ONEC, date, objet, document), `abonnements` (entreprise, formule, période, statut), `parametres` (seuils SMT, taux FCFA → CDF, jours fériés).

### 5.4 Règlements partiels

Le prototype marque une créance « payée » d'un coup. Au marché, un client paie souvent en deux ou trois fois. Chaque règlement est une opération de trésorerie qui porte la référence de la créance ou de la dette (`reglementDe`). On en saisit autant qu'il faut, sans jamais modifier la ligne de créance (règle d'ajout seulement). L'encours à une date = montant de la facture − règlements effectués jusqu'à cette date. Pour une facture reportée d'un exercice précédent, la part déjà réglée est portée sur la ligne (`regleAvant`). Voir D4.

### 5.5 Corrections

Une opération fausse n'est jamais modifiée. Le commerçant, ou l'assistant via une proposition acceptée par le commerçant, produit :

1. une opération d'annulation (`annule = id de l'opération fausse`, même montant, effet inverse) ;
2. une nouvelle opération juste.

L'annulation produit son effet à sa propre date, comme une contre-passation : elle apparaît dans le journal du mois où elle est saisie, en négatif dans la même colonne que l'opération d'origine. Un exercice arrêté n'est donc jamais modifié après coup. L'appli pourra masquer au commerçant une paire saisie et annulée le même mois ; le journal complet garde tout. Une cession de matériel ne s'annule pas en v1. Voir D5.

---

## 6. Hors ligne et synchronisation

### 6.1 Sur le téléphone

- **Base locale** : IndexedDB via Dexie. Le téléphone est la source de vérité pour le commerçant. Il saisit, consulte, voit ses états sans réseau.
- **Persistance** : appel à `navigator.storage.persist()` au premier lancement pour éviter que Chrome efface la base quand la mémoire manque. Une appli installée sur l'écran d'accueil l'obtient en général.
- **Application installable** : service worker (vite-plugin-pwa) qui met en cache l'appli. Après la première visite, elle s'ouvre sans réseau.

### 6.2 Envoi

Chaque ajout local écrit aussi une ligne dans une file d'envoi (`file_envoi` dans Dexie). Quand le réseau revient (événement `online`, ouverture de l'appli, toutes les quelques minutes si l'appli est ouverte), la file part par lots.

- L'envoi est **idempotent** : insertion avec « ignorer si l'id existe déjà ». Un lot envoyé deux fois après une coupure ne crée pas de doublon.
- Une ligne refusée par le serveur (règle RLS, exercice arrêté) reste dans la file avec son motif, et l'appli le signale au commerçant au lieu d'échouer en silence.

### 6.3 Réception

Le serveur numérote chaque ligne reçue (`seq`, compteur Postgres). Le téléphone demande « tout ce qui a un `seq` supérieur au dernier que j'ai vu » pour son entreprise. On n'utilise pas les horloges : celle d'un téléphone peut avoir des jours d'écart.

Ce que le téléphone reçoit : commentaires, propositions de correction, taux de change, statut de l'exercice, lignes d'inventaire préparées par l'assistant. Et ses propres lignes saisies depuis un autre appareil.

### 6.4 Conflits

Presque aucun, par construction :

- opérations, créances, dettes, règlements : ajouts seulement, aucun conflit possible ;
- statut d'un exercice ou d'un inventaire : le serveur gagne ;
- saisie sur un exercice arrêté pendant que le téléphone était hors ligne : refusée au serveur, signalée au commerçant, à reprendre sur l'exercice suivant ou après réouverture par l'expert.

### 6.5 Photos des pièces

- Compression sur le téléphone avant tout stockage : 1 280 px sur le grand côté, JPEG qualité 0,6, soit environ 100 Ko par pièce. Une facture reste lisible.
- Stockées localement comme fichier binaire jusqu'à l'envoi.
- File d'envoi séparée de celle des opérations. Option « envoyer les photos seulement en Wi-Fi », activée par défaut, pour la facture de data.
- Rangées dans Storage sous `entreprise/exercice/operation.jpg`, compartiment privé.

### 6.6 Ce que voit le commerçant

Un indicateur discret : « 3 saisies pas encore envoyées ». Jamais de blocage. Le risque réel est le téléphone perdu avant envoi ; l'indicateur pousse à se connecter de temps en temps.

---

## 7. Back-end Supabase et sécurité

### 7.1 Composants

- **Postgres** : tables de la section 5, contraintes (montants entiers positifs, natures fermées, dates dans l'exercice), déclencheurs qui interdisent `UPDATE` et `DELETE` sur les tables d'ajout.
- **Auth** : compte par numéro de téléphone. Voir D7 pour la démonstration.
- **Storage** : photos des pièces, accès réglé comme les tables.
- **Edge Functions** : arrêté des états, actions d'administration. Le code qui exige des droits élevés ne tourne jamais dans le navigateur.

### 7.2 Matrice des droits

| Table | Commerçant | Assistant | Expert | Admin |
|---|---|---|---|---|
| opérations, créances, dettes, règlements | lire, ajouter | lire | lire | lire |
| immobilisations, comptes | lire, ajouter | lire | lire | lire |
| inventaires | lire, valider | lire, préparer | lire | lire |
| commentaires | lire, ajouter | lire, ajouter | lire, ajouter | lire |
| propositions de correction | lire, accepter, refuser | lire, proposer | lire | lire |
| taux de change | lire | lire, saisir | lire, confirmer | lire |
| révisions de taux | lire | lire | ajouter | lire |
| arrêtés, journal des interventions | lire | lire | via la fonction serveur | lire |
| entreprises, affectations, conventions | lire les siennes | lire les siennes | lire les siennes | tout |

Toutes les règles passent par `affectations` : un utilisateur ne voit une entreprise que s'il lui est affecté, avec un rôle, à une date donnée. L'expert ne voit que les entreprises couvertes par une convention en cours.

Aucune ligne de la colonne Assistant ne contient « ajouter » sur les opérations. C'est la traduction directe de l'art. 43.1 et de l'art. 71 : la structure ne tient pas la comptabilité. Un test automatique (section 14) tente l'écriture avec un compte assistant et vérifie le refus.

### 7.3 Données personnelles

Les données touchent des personnes physiques (commerçants, clients nommés dans les créances). Le Code du numérique de la RDC (ordonnance-loi n° 23/010 du 13 mars 2023) encadre leur traitement. Points à vérifier avant le pilote, pas avant la démonstration : consentement du commerçant, information des clients nommés, lieu d'hébergement (Supabase héberge hors de la RDC), durée de conservation. La conservation des pièces suit de son côté l'obligation comptable de l'AUDCIF.

---

## 8. Applications et écrans

### 8.1 Appli commerçant (téléphone)

| Écran | Contenu |
|---|---|
| Accueil | argent disponible par compte, entré et sorti du mois, on me doit, je dois, dernières saisies |
| Saisir | recette, dépense, transfert, change de dollars ; à crédit ou payé ; photo de la pièce |
| Journal | un journal par compte et par mois, modèle note 4 |
| Clients et fournisseurs | créances, dettes, encaisser ou payer en tout ou en partie |
| Stock | inventaire de fin d'exercice, préparé avec l'assistant |
| Matériel | registre des immobilisations |
| États | compte de résultat, bilan, notes, avec la mention fixe |
| Messages | commentaires et propositions de l'assistant, à accepter ou refuser |
| Réglages | langue, code d'accès local, état de l'envoi |

Principes : grands boutons, une action par écran, bilingue français / lingala, chiffres en gros. Code à quatre chiffres à l'ouverture, pour le téléphone partagé. Ce n'est pas une sécurité forte, c'est une discrétion familiale.

### 8.2 Bureau (navigateur)

- **Assistant** : portefeuille de clients avec état (à jour, à revoir, à traiter), fiche client (contrôles, journaux, commentaires, propositions), saisie des taux, préparation de l'inventaire, relance WhatsApp.
- **Expert** : dossiers sous convention, revue des états, confirmation des taux, arrêté, journal de ses interventions.
- **Administrateur** : utilisateurs, entreprises, affectations, conventions, abonnements, paramètres.

La relance WhatsApp ouvre un lien `wa.me` avec le message pré-rempli. Pas d'API WhatsApp payante : l'assistant envoie lui-même.

### 8.3 Mode démonstration

Un bouton « Démonstration » charge le jeu fictif de la boutique Maman Nsimba dans la base locale, sans compte ni réseau. Bandeau permanent « Données fictives ». Devant le jury, si le Wi-Fi de la salle tombe, la démonstration continue. C'est une sécurité qu'on livre dès l'étape 2.

### 8.4 Bibliothèques retenues

| Besoin | Choix | Raison |
|---|---|---|
| interface | React 19 | demandé, version stable actuelle |
| routage | wouter (2 Ko) | react-router pèse dix fois plus |
| base locale | Dexie + dexie-react-hooks | l'écran se met à jour seul quand la base change |
| validation | aucune bibliothèque au départ, fonctions de garde dans `donnees/` | zod ajoute environ 15 Ko ; à revoir si les formulaires se multiplient |
| traduction | dictionnaires `fr.ts` et `ln.ts` | i18next est trop lourd pour deux langues |
| graphiques | barres en CSS, comme le prototype | aucune bibliothèque |
| dates | chaînes ISO et quelques fonctions maison | pas de moment ni de date-fns |
| Supabase | `@supabase/supabase-js`, chargé à la demande | pas téléchargé en mode démo |

---

## 9. Devises et taux de change

### 9.1 Le problème

À Kinshasa, une même caisse contient des francs et des dollars. Le prototype convertit chaque opération en dollars au taux du jour et l'ajoute à une caisse en francs. Conséquence : le solde affiché ne correspond jamais au comptage physique. Le commerçant compte 400 000 FC et 120 $, l'appli lui affiche un seul nombre. Pour un outil dont la raison d'être est la fiabilité de la caisse, c'est gênant. Pour un comptage d'inventaire, c'est bloquant.

### 9.2 Proposition (D3)

- Chaque compte a une devise. On crée « Caisse FC » et « Caisse $ » si le commerçant manie les deux.
- Le journal d'un compte en dollars se tient en dollars. Le comptage physique se compare directement.
- Changer des dollars chez le cambiste = un transfert entre la caisse $ et la caisse FC, avec les deux montants réels. Le taux est celui du cambiste.
- Dans les états, chaque opération en dollars compte en francs au taux figé à sa saisie (ou révisé par l'expert).
- À la clôture, les soldes en dollars sont convertis au taux de clôture. L'écart avec leur valeur historique est un gain ou une perte de change, porté en autres recettes ou autres dépenses, et détaillé en note. Le modèle SMT n'a pas de ligne dédiée ; cette convention est à faire valider par l'expert-comptable partenaire.

Créances et dettes en dollars : converties au taux de clôture au bilan. Le calcul de D et E reprend ces mêmes valeurs, donc le résultat reste cohérent sans écriture supplémentaire.

### 9.3 Cycle du taux

1. L'assistant saisit le taux du jour (source indiquée : BCC, marché).
2. Le téléphone reçoit le dernier taux à la synchronisation. Hors ligne, il propose le dernier connu ; le commerçant peut saisir le taux réellement pratiqué.
3. Le taux est figé sur l'opération.
4. Avant l'arrêté, l'expert confirme les taux. S'il en corrige un, il crée une révision ; l'opération d'origine ne change pas.
5. Contrôle « opérations en dollars à confirmer » tant qu'un taux n'est pas confirmé.

---

## 10. Exercice, clôture et arrêté

### 10.1 L'exercice

Année civile, douze mois, du 1er janvier au 31 décembre (AUDCIF, art. 7). Statuts :

```
ouvert → inventaire → préparé → arrêté → clos
                         ↑          │
                         └ réouverture par l'expert, tracée
```

### 10.2 Entrée en cours d'année

Un commerçant qui rejoint Mbongo en mars a déjà deux mois d'activité, souvent dans un cahier. On saisit des **opérations de reprise** : un total mensuel des ventes et des achats par mois manquant, marquées `reprise`, pièce = le cahier. Le prototype le fait déjà (« Report du cahier de caisse »). Les soldes d'ouverture sont ceux du 1er janvier, reconstitués avec l'assistant.

### 10.3 Inventaire de fin d'exercice

L'assistant prépare avec le commerçant : liste des stocks, créances et dettes non réglées, matériel acheté ou vendu, emprunts. Le commerçant valide. Le stock final validé entre dans les états.

### 10.4 Arrêté

L'expert clique « Arrêter ». La fonction serveur :

1. charge le dossier complet de l'exercice ;
2. calcule les états avec le moteur ;
3. vérifie l'invariant ;
4. enregistre un instantané (états au format JSON), son empreinte SHA-256, la version du moteur et le dernier `seq` pris en compte ;
5. passe l'exercice en « arrêté » et inscrit l'acte au journal des interventions.

Après l'arrêté, le serveur refuse toute nouvelle opération datée dans l'exercice. Si le moteur évolue plus tard, l'instantané reste celui qui a été arrêté : on sait toujours ce que l'expert a vu.

### 10.5 Passage à l'exercice suivant

`cloturer()` produit l'ouverture N+1 : soldes de clôture par compte, stock final → stock initial, créances et dettes non réglées reportées telles quelles, immobilisations à leur valeur nette, compte exploitant N+1 = compte exploitant N + résultat N.

---

## 11. Contrôles automatiques

Fonctions pures du moteur, affichées en détail au bureau et en version simple au commerçant.

| Contrôle | Règle | Niveau |
|---|---|---|
| sans pièce | opération sans photo ni mention de pièce | à revoir |
| jours sans vente | jours ouvrés (lundi à samedi, hors fériés paramétrés) sans recette de ventes | à revoir |
| solde négatif | un compte passe sous zéro **à une date quelconque**, pas seulement à la fin | à traiter |
| créances anciennes | encours de plus de 30 jours | à traiter |
| seuil SMT | ventes cumulées ≥ 80 % puis ≥ 100 % du seuil du secteur, converti en FC | alerte, puis renvoi vers l'expert pour le Système normal |
| dollars à confirmer | opération en USD dont le taux n'est pas confirmé | information |
| reprise incomplète | mois de l'exercice sans aucune opération | à revoir |
| stock non inventorié | exercice clos sans stock final validé | à traiter |

Le seuil se calcule sur les ventes encaissées plus la hausse des créances clients, pour approcher le chiffre d'affaires. Le taux FCFA → CDF est un paramètre daté, saisi par l'administrateur. Le logiciel alerte. Il ne gère pas la bascule au Système normal.

---

## 12. Sorties : états, exports, tableau de bord

- **États** : le moteur renvoie une structure de données (lignes, montants, notes). L'interface la met en page. Le texte « Mbongo prépare, il ne certifie pas » fait partie de la structure renvoyée par le moteur : aucun écran ne peut l'oublier. Après arrêté, il est complété par le nom et le numéro d'inscription de l'expert.
- **PDF** : page HTML prévue pour l'impression A4, puis « Enregistrer en PDF » du navigateur. Aucune bibliothèque, fonctionne sur Android.
- **Excel** : au bureau seulement, bibliothèque SheetJS chargée à la demande. Le téléphone ne la télécharge jamais.
- **Tableau de bord du commerçant** : argent disponible, mois en cours, on me doit, je dois, où part l'argent. Pas de jargon.

---

## 13. Performance et poids

Budget de l'appli commerçant, compressé :

| Élément | Budget |
|---|---|
| React + ReactDOM | ~60 Ko |
| Dexie + hooks | ~30 Ko |
| moteur + écrans + i18n | ~60 Ko |
| **premier chargement** | **< 160 Ko**, puis zéro octet de réseau à l'ouverture suivante |
| Supabase (chargé après connexion) | ~50 Ko |

Volume : une micro-entreprise saisit de 1 000 à 5 000 opérations par an. Le moteur recalcule tout l'exercice en quelques millisecondes ; pas besoin de cache compliqué. La base locale d'un exercice pèse moins d'un mégaoctet hors photos.

Un test de construction échoue si le budget est dépassé. Sans garde-fou, le poids dérive toujours.

---

## 14. Tests et qualité

| Niveau | Outil | Ce qu'on vérifie |
|---|---|---|
| moteur | Vitest | chaque règle SMT, chaque nature, chaque cas limite |
| invariant | Vitest + fast-check | actif = passif sur des milliers d'exercices aléatoires |
| non-régression | Vitest | le jeu du prototype donne exactement les montants validés |
| base locale | Vitest + fake-indexeddb | file d'envoi, idempotence, annulations |
| droits | tests SQL sur Supabase | chaque case de la matrice 7.2, dont le refus d'écriture de l'assistant |
| parcours | Playwright, écran de téléphone | scénario de démonstration de bout en bout |
| intégration continue | GitHub Actions | typage, linter, tests à chaque envoi sur le dépôt |

Règle du dépôt maintenue : tout calcul comptable a son test.

---

## 15. Déploiement, environnements et coûts

| Environnement | Données | Usage |
|---|---|---|
| local | jeu fictif | développement |
| démo | projet Supabase dédié, données fictives | soutenance |
| pilote | projet Supabase séparé, vraies données | quelques commerçants de Lingwala |

- Appli et bureau : hébergement statique (Cloudflare Pages, Netlify ou GitHub Pages), gratuit à ce volume.
- Site vitrine : même type d'hébergement, projet séparé.

**Coûts à surveiller pour le pilote**, chiffres à revérifier sur les pages tarifaires au moment de lancer :

- L'offre gratuite de Supabase met le projet en pause après une semaine sans activité. Acceptable pour la démo si on le réveille la veille. Pas pour un pilote.
- Stockage gratuit d'environ 1 Go. À 100 Ko par photo et 1 500 pièces par commerçant et par an, cela fait 150 Mo par commerçant : six ou sept commerçants sur un an remplissent l'offre gratuite. Le pilote demandera l'offre payante (de l'ordre de 25 $ par mois).
- SMS de connexion vers la RDC : coût par message non négligeable et distribution parfois irrégulière. À chiffrer avant de choisir la méthode de connexion du pilote.

---

## 16. Risques

| Risque | Effet | Parade |
|---|---|---|
| téléphone perdu ou volé avant envoi | saisies perdues | indicateur d'envoi, envoi dès qu'il y a du réseau |
| Chrome efface la base locale | perte de données | `storage.persist()`, appli installée, envoi régulier |
| erreur de calcul SMT | états faux devant le jury | moteur isolé, tests de propriété, non-régression |
| assistant qui écrit à la place du commerçant | infraction à l'art. 71 | interdiction dans la base, testée |
| confusion avec un cabinet | infraction à l'art. 42 | vocabulaire contrôlé, mention fixe sur les états |
| taux de change contesté | résultat contestable | taux figé par opération, révisions tracées, confirmation par l'expert |
| réseau absent le jour de la soutenance | démonstration ratée | mode démo entièrement local |
| commerçant qui ne saisit pas | données vides | contrôle des jours sans vente, relances, saisie en deux gestes |
| périmètre qui gonfle | projet pas fini | feuille de route stricte, une étape à la fois |

---

## 17. Décisions à prendre

Chaque décision validée est reportée ici avec sa date, puis appliquée.

Toutes retenues le 29 octobre 2026. Les conventions comptables (D1, D2, D3, D6, D9) restent à faire confirmer par l'expert-comptable partenaire avant le pilote ; le moteur les isole pour qu'un changement reste local.

| N° | Question | Décision | Statut |
|---|---|---|---|
| D1 | Cessions de matériel | prix de cession en autres recettes (A), valeur nette du bien sorti ajoutée à F ; pas de dotation l'année de la sortie. Le remboursement d'une caution suit la même règle | retenue |
| D2 | Emprunts | natures « emprunt reçu » et « remboursement » (hors A et B, ligne Emprunt du bilan), « intérêts » (dans B, ligne Charges d'intérêts) ; remboursement au-delà du capital restant dû refusé ; emprunt en dollars non réévalué en v1 | retenue |
| D3 | Devises | un compte par devise, journal tenu dans la devise du compte, change = transfert entre deux comptes avec les deux montants réels ; à la clôture, soldes en dollars au taux de clôture, écart net en autres recettes (gain) ou autres dépenses (perte) | retenue |
| D4 | Paiements partiels | un règlement est une opération qui porte la référence de la créance ou de la dette ; plusieurs règlements possibles, jamais au-delà de l'encours | retenue |
| D5 | Corrections | annulation par contre-passation à sa propre date (même contenu, effet inverse), puis nouvelle saisie ; jamais de modification | retenue |
| D6 | Cautions | catégorie « caution » de la note 1, nature « caution versée », non amortie | retenue |
| D7 | Connexion | démo : téléphone + mot de passe ; pilote : SMS ou WhatsApp, selon le coût | retenue |
| D8 | Organisation du code | un projet Vite, deux points d'entrée (section 3) | retenue |
| D9 | Tontines (likelemba) | un compte de trésorerie de type « tontine » ; cotisation = transfert vers ce compte, main reçue = transfert depuis ce compte. Solde présenté sur la ligne Banque (en + ou en −), hors résultat | retenue |
| D10 | Matériel acheté à crédit | refusé en v1 : le matériel se saisit à la date du paiement. Une dette ne peut porter qu'une nature d'exploitation | retenue |

---

## 18. Feuille de route détaillée

Chaque étape se termine par un état de ce qui marche et de ce qui reste. On ne commence pas la suivante avant.

**Étape 1. Moteur SMT et tests** · faite le 29 octobre 2026 (116 tests, invariant vérifié sur des centaines de milliers d'exercices aléatoires)
Livrable : `src/moteur/` complet (sections 4, 9.2, 10.5, 11), jeu du prototype en non-régression, test de propriété sur l'invariant.
Fini quand : tous les tests passent, le jeu du prototype redonne ses montants, aucune dépendance hors moteur.
Prérequis : décisions D1 à D6, D9 et D10 (retenues).

**Étape 2. Appli commerçant hors ligne** · en cours : base locale, saisie et écrans faits ; restent l'installation hors ligne (service worker) et le parcours testé en mode avion.
Livrable : PWA installable, base Dexie, saisie, journaux, clients et fournisseurs, matériel, stock, états, français et lingala, mode démonstration.
Fini quand : l'appli tourne en mode avion sur un Android d'entrée de gamme et respecte le budget de poids.

**Étape 3. Supabase**
Livrable : migrations SQL, RLS selon la matrice 7.2, Auth, Storage, synchronisation et envoi des photos.
Fini quand : les tests de droits passent, une saisie hors ligne arrive au serveur une seule fois après reconnexion.

**Étape 4. Bureau**
Livrable : espace assistant (portefeuille, contrôles, commentaires, propositions, taux, inventaire, relances), puis espace expert (revue, confirmation des taux, arrêté par la fonction serveur, journal), puis administration minimale.
Fini quand : un exercice complet passe d'« ouvert » à « arrêté » avec les trois rôles.

**Étape 5. Exports**
Livrable : états imprimables en PDF, export Excel au bureau.

**Étape 6. Site vitrine** · maquette faite le 29 octobre 2026 (`site/index.html`, organisation reprise de la maquette validée d'OmegaX, `docs/site-vitrine/maquette-v2.html` du dépôt `manatandu/om-ga-x`). Reste avant mise en ligne : numéro WhatsApp, contenu et tarifs des formules, mentions légales et confidentialité, adresse de l'appli.
Livrable : page statique, offre, formules, démonstration, contact WhatsApp affiché en clair. Aucun terme pouvant faire croire à un cabinet d'expertise comptable.

**Étape 7. Soutenance**
Livrable : jeu de données fictif complet, scénario minuté, parcours Playwright qui rejoue le scénario, plan B hors ligne.
