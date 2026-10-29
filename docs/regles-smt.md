# Règles du Système minimal de trésorerie (SMT)

Source : Acte uniforme relatif au droit comptable et à l'information financière (AUDCIF révisé, OHADA, 2017), art. 13 et Titre X (modèles d'états du SMT).

## 1. Éligibilité (art. 13)

Petites entités assujetties au SMT, sauf option pour le Système normal, si le chiffre d'affaires hors taxes annuel est inférieur à :

| Secteur | Seuil |
|---|---|
| Négoce | 60 millions FCFA ou l'équivalent |
| Artisanat et assimilés | 40 millions FCFA ou l'équivalent |
| Services | 30 millions FCFA ou l'équivalent |

Le logiciel ne manie pas le FCFA. Il garde les seuils en francs congolais, paramètres revus chaque année (`src/donnees/parametres.ts`, valeurs 2026 : 240 M CDF pour le négoce, 160 M CDF pour l'artisanat, 120 M CDF pour les services), et alerte quand les ventes cumulées s'en approchent (80 %) ou le dépassent.

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

## 9. Livre des recettes et des dépenses, registre des achats

Le logiciel ne gère pas de statut juridique (entreprenant, commerçant immatriculé, société) : ce n'est pas son rôle. Il propose à tout commerçant deux documents tirés de ses saisies, au format de l'AUDCG révisé :

- **Livre des recettes et des dépenses** (format de l'art. 31) : chronologique, l'origine et le montant des recettes en distinguant les espèces des autres modes de paiement, la destination et le montant des dépenses. Les transferts entre ses propres comptes n'y figurent pas. Espèces = une caisse ; autre mode = banque, monnaie électronique, tontine.
- **Registre des achats** (format de l'art. 32) : achats de marchandises et de fournitures, mode de règlement, référence de la pièce (champ « N° de la facture ou du reçu » à la saisie), récapitulation par mois et par année. Un achat à crédit y entre à la date de la facture ; son règlement n'est pas un second achat. Les totaux repris du cahier sont marqués comme tels.

Conservation des pièces : dix ans (AUDCIF, art. 24).

## Vérification sur le texte de l'AUDCIF (octobre 2026)

Relecture du Titre X (Système minimal de trésorerie) et des articles 1 à 34 de l'AUDCIF révisé.

Conforme :
- journal de trésorerie exigé (Titre X, ch. 1 : « journal unique de trésorerie (NOTE 4) »), un par banque et un pour la caisse (NB de la note 4), mensuel, avec report à nouveau et solde à reporter, colonnes Date, Libellés, Recettes, Dépenses, Solde et ventilation ;
- journaux de suivi des créances impayées et des dettes à payer ; conservation des pièces ; inventaire extra-comptable par le responsable de l'entité ;
- bilan, compte de résultat, notes 1 à 3 ; résultat G = C − D + E − F avec C = A − B (D et E : notre convention, le texte ne les nomme pas) ;
- amortissement linéaire sans prorata temporis ; correction par écriture en négatif (art. 20) ; irréversibilité (art. 22) ; conservation dix ans (art. 24) ;
- seuils de l'art. 13 en francs CFA (60 M négoce, 40 M artisanat, 30 M services) ; nos montants en CDF sont des équivalents du projet.

Écarts à traiter :
- colonne de l'exercice précédent (N-1) au bilan et au compte de résultat (modèle du ch. 2 et art. 34) : absente ;
- note 3 : le modèle détaille chaque client et chaque fournisseur ; Mbongo n'en donne que les totaux ;
- arrêté des états dans les quatre mois (art. 23) : pas de rappel du délai ;
- « travaux en cours » à l'inventaire : pas de rubrique distincte.

À trancher avec l'expert-comptable partenaire : l'art. 28 cite un tableau des flux de trésorerie que le Titre X ne prévoit pas ; aucune règle de sortie du SMT (nombre d'exercices de dépassement) dans le texte lu.
