# Règles du Système minimal de trésorerie (SMT)

Source : Acte uniforme relatif au droit comptable et à l'information financière (AUDCIF révisé, OHADA, 2017), art. 13 et Titre X (modèles d'états du SMT).

## 1. Éligibilité (art. 13)

Petites entités assujetties au SMT, sauf option pour le Système normal, si le chiffre d'affaires hors taxes annuel est inférieur à :

| Secteur | Seuil |
|---|---|
| Négoce | 60 millions FCFA ou l'équivalent |
| Artisanat et assimilés | 40 millions FCFA ou l'équivalent |
| Services | 30 millions FCFA ou l'équivalent |

Le logiciel stocke le secteur de l'entreprise, convertit le seuil en francs congolais (paramètre `src/donnees/parametres.ts`, 4 FC pour 1 FCFA d'après le cours BCC d'août 2026, soit environ 240 M FC pour le négoce, 160 M FC pour l'artisanat, 120 M FC pour les services) et alerte quand les ventes cumulées s'en approchent (80 %) ou le dépassent.

## 2. Tenue (Titre X, ch. 1)

Comptabilité de trésorerie : fait générateur = encaissement ou décaissement.

Fiabilité fondée sur trois pièces de base :
- un **journal de trésorerie** (note 4) ; NB du modèle : un journal par banque et un journal pour la caisse ;
- un **journal de suivi des créances impayées** (date, n° facture, client, montant, date de paiement) ;
- un **journal de suivi des dettes à payer** (date, n° facture, fournisseur, montant, date de paiement) ;
- plus la conservation des pièces justificatives.

Le logiciel traite chaque compte de monnaie électronique (M-Pesa, Orange Money, Airtel Money) comme un journal distinct, assimilé à la banque.

### Journal de trésorerie (note 4)

Colonnes : Date · Libellés · Recettes · Dépenses · Solde. Ouvre sur un « report à nouveau », se clôt sur un « solde à reporter ».

Ventilation recettes : Ventes · Autres · Matériel et mobilier (cessions).
Ventilation dépenses : Achats marchandises · Achats matières et fournitures · Loyers · Salaires · Impôts et taxes · Autres.
Colonnes complémentaires admises par le NB : compte exploitant (apports, prélèvements).

## 3. Inventaire extra-comptable de fin d'exercice

Le responsable de l'entité relève :
- les créances et dettes d'exploitation non réglées ;
- les stocks et travaux en cours ;
- les immobilisations acquises ou cédées dans l'exercice ;
- les emprunts souscrits ou remboursés.

Les états récapitulatifs sont conservés comme pièces justificatives.

Registre des immobilisations obligatoire (note 1). Amortissement **linéaire, sans prorata temporis** : une annuité entière l'année d'acquisition.

## 4. Compte de résultat SMT

| Rubrique | Note | Lettre |
|---|---|---|
| Recettes sur ventes ou prestations de services | 4 | |
| Autres recettes sur activités | 4 | |
| Total des recettes sur produits | | A |
| Dépenses sur achats | 4 | |
| Dépenses sur loyers | 4 | |
| Dépenses sur salaires | 4 | |
| Dépenses sur impôts et taxes | 4 | |
| Charges d'intérêts | | |
| Autres dépenses sur activités | 4 | |
| Total dépenses sur charges | | B |
| Solde : excédent ou insuffisance de recettes | | C = A − B |
| − Variation des stocks N / N-1 | 2 | |
| − Variation des créances N / N-1 | 3 | |
| + Variation des dettes d'exploitation N / N-1 | 3 | |
| Dotations amortissements | | F |
| Résultat exercice | | G = C − D + E − F |

Le modèle officiel n'attribue pas explicitement D et E. Convention retenue dans le code :
- **D** = (stock initial − stock final) + (créances au 1er janvier − créances au 31 décembre)
- **E** = dettes au 1er janvier − dettes au 31 décembre

Ce qui donne, économiquement, résultat = C + hausse des stocks + hausse des créances − hausse des dettes − amortissements.

Ne vont **pas** dans B : acquisitions de matériel (registre des immobilisations), prélèvements de l'exploitant (compte exploitant), transferts entre comptes.

## 5. Bilan SMT

Actif : Immobilisations (si significatives, note 1) · Stocks (note 2) · Clients et débiteurs divers (note 3) · Caisse · Banque (en + ou en −) · Total.
Passif : Compte exploitant (note 1) · Résultat exercice · Emprunt · Fournisseurs et créditeurs divers (note 3) · Total.

Compte exploitant d'ouverture = trésorerie d'ouverture + stock initial + créances d'ouverture + immobilisations nettes d'ouverture − dettes d'ouverture. Puis + apports − prélèvements de l'exercice.

**Invariant à tester** : total actif = total passif, quelle que soit la suite d'opérations.

## 6. Notes annexes

- Note 1 : suivi du matériel, du mobilier et des cautions (date, désignation, montant, date de sortie, prix de cession).
- Note 2 : état des stocks (référence, désignation, quantité, prix unitaire, montant ; valeur du stock final, valeur du stock initial).
- Note 3 : créances et dettes non échues (montant au 31 décembre, au 1er janvier, variation en %).

## 7. Devises

Opérations en USD fréquentes à Kinshasa. Stocker le montant d'origine, la devise et le taux appliqué à la date de l'opération. États présentés en francs congolais. Le commerçant saisit le taux du jour avec chaque opération en dollars. Un seul taux de fin d'année : celui du 31 décembre, donné par le commerçant en commençant l'année suivante, corrigé si besoin par l'expert-comptable avant l'arrêté.

## 8. Conventions complémentaires retenues (décisions D1 à D10)

Le modèle SMT ne tranche pas ces cas. Conventions du moteur, à confirmer par l'expert-comptable partenaire avant le pilote. Résumé dans `docs/architecture.md`, section 15.

- **Cession de matériel (D1)** : le prix encaissé va dans les autres recettes sur activités (A). La valeur nette du bien sorti s'ajoute à F. Pas de dotation l'année de la sortie. Le remboursement d'une caution suit la même règle (prix = valeur nette, effet nul sur le résultat).
- **Emprunts (D2)** : l'emprunt reçu et le remboursement du capital ne passent ni dans A ni dans B ; ils mouvementent la ligne Emprunt du bilan. Les intérêts vont dans B, ligne Charges d'intérêts. Le compte exploitant d'ouverture déduit l'emprunt restant dû. Un remboursement supérieur au capital restant dû est refusé. Limite de la v1 : un emprunt en dollars reste valorisé au taux de ses opérations, sans réévaluation (point à voir avec l'expert).
- **Devises (D3)** : un compte de trésorerie par devise. Chaque opération en dollars compte en francs au taux figé à la saisie. À la clôture, les soldes en dollars sont convertis au taux de clôture ; l'écart net avec leur valeur historique est un gain (autres recettes) ou une perte (autres dépenses). Les créances et dettes en dollars sont présentées au taux de clôture ; D et E reprennent ces valeurs. Un compte en dollars vide vaut zéro franc à toute date : l'écart laissé par un change est acquis tout de suite.
- **Règlements partiels (D4)** : encours = montant de la facture − règlements effectués à la date considérée.
- **Corrections (D5)** : contre-passation à la date de l'annulation, jamais de modification.
- **Cautions (D6)** : note 1, non amorties.
- **Tontines (D9)** : compte de trésorerie « tontine », présenté sur la ligne Banque, hors résultat.
- **Matériel à crédit (D10)** : refusé ; une dette ne porte qu'une nature d'exploitation.
- **Arrondis** : conversion arrondie au franc le plus proche, une fois par opération. Annuité = montant ÷ durée arrondi à l'entier inférieur ; la dernière annuité prend le reste.
- **Situation en cours d'exercice** : sans inventaire, le stock final est pris égal au stock initial et les états sont marqués provisoires.

## 9. L'entreprenant (AUDCG révisé, art. 30 à 33 et 62 à 65)

Personne physique qui exerce sur simple déclaration d'activité, sans frais, sans immatriculation au RCCM (art. 30, 62). Textes lus dans le skill `audcg-acte-uniforme`.

- **Seuil** (art. 30, al. 2) : il garde son statut si son chiffre d'affaires annuel, pendant deux exercices successifs, n'excède pas les seuils du SMT. Le chiffre d'affaires se compte à part pour la vente et pour les services.
- **Perte du statut** (art. 30, al. 3) : après deux années de suite au-dessus, il se met en règle dès le premier jour de l'année suivante et avant la fin du premier trimestre.
- **Livre** (art. 31) : au jour le jour, chronologique, l'origine et le montant des ressources, en distinguant les espèces des autres modes de règlement ; la destination et le montant des emplois. Conservé cinq ans au moins.
- **Registre des achats** (art. 32) : s'il vend des marchandises, objets, fournitures, denrées ou loge, un registre récapitulé par année, avec le détail des achats, leur mode de règlement et la référence des pièces, qui sont conservées.
- **Mention** (art. 62) : son numéro de déclaration sur ses factures et documents, avec la mention « Entreprenant dispensé d'immatriculation ».

Dans le logiciel :

- le statut se choisit à la création de l'entreprise et se change dans Réglages ;
- le livre et le registre se tirent des saisies (moteur, `entreprenant.ts`) : rien de plus à noter. Les transferts entre ses propres comptes n'entrent pas dans le livre. Un achat à crédit entre au registre à la date de la facture, son règlement n'est pas un second achat ;
- espèces = une caisse ; autre mode = banque, monnaie électronique, tontine ;
- alerte la première année au-dessus du seuil ; perte du statut signalée après deux années de suite (le chiffre d'affaires de l'année passée est gardé à l'ouverture de l'année suivante) ;
- les états SMT restent disponibles. L'AUDCIF (art. 2) vise les entités soumises à l'AUDCG : l'entreprenant doit-il aussi produire les états du SMT ? Question à trancher avec l'expert-comptable partenaire.

Conservation : cinq ans pour le livre (AUDCG, art. 31), dix ans pour les pièces et documents comptables (AUDCIF, art. 24). On retient dix ans.

