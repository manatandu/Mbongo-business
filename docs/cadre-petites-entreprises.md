# Cadre juridique et fiscal des micro et petites entreprises au SMT

Analyse des skills disponibles, octobre 2026. Périmètre : les micro et petites entreprises qui relèvent du Système minimal de trésorerie, à Kinshasa. Rien sur le Système normal ni sur les grandes entreprises.

**Méthode.** Une trentaine de skills lus, en cinq familles. Chaque référence ci-dessous vient d'un fichier de skill, pas de mémoire. Les skills sont des compilations : avant de citer un chiffre dans le mémoire ou de le mettre dans le logiciel, le vérifier au Journal officiel. Les points douteux sont signalés.

Sommaire

1. Quatre définitions de la « petite entreprise », qui ne se recoupent pas
2. Comptabilité et statut (OHADA)
3. Fiscalité
4. Employer un vendeur
5. Créances impayées et litiges
6. Profession comptable : ce que la structure peut faire
7. Monnaie, finance, blanchiment
8. Données personnelles et preuve
9. Ce que Mbongo fait déjà
10. Pistes pour le logiciel
11. Pour l'offre de la structure
12. Pour le mémoire
13. Contradictions et points à vérifier
14. Skills lus, et ce qu'ils valent pour ce sujet

---

## 1. Quatre définitions de la « petite entreprise », qui ne se recoupent pas

C'est le premier constat, et un bon sujet de discussion pour le mémoire. Selon le texte, la même boutique est micro, petite ou au-dessus.

| Texte | Catégorie | Critère | En francs congolais (2026) |
|---|---|---|---|
| AUDCIF, art. 13 | SMT | CA HT inférieur à 60 M FCFA (négoce), 40 M (artisanat), 30 M (services) | environ 240 M, 160 M, 120 M FC |
| AUDCG, art. 30 | entreprenant | mêmes seuils que le SMT, appréciés sur deux exercices successifs | idem |
| Loi n° 23/053 du 30 novembre 2023, art. 107 et 109 (en vigueur au 1er janvier 2026) | micro-entreprise fiscale | CA HT au plus 25 000 000 FC | 25 M FC |
| même loi | petite entreprise fiscale | CA HT de 25 000 001 à 300 000 000 FC | 25 M à 300 M FC |
| OL 10/001, art. 14 (modifié par la LF 15/021) | assujetti à la TVA | CA HT d'au moins 80 000 000 FC | 80 M FC |
| AUPCAP, art. 1-3 | petite entreprise (procédures collectives) | au plus 20 travailleurs et CA HT au plus 50 M FCFA sur 12 mois | environ 200 M FC |
| OL n° 22/030 du 8 septembre 2022, art. 12.38 | micro-entreprise (PME) | 1 à 5 emplois, CA au plus 10 000 USD | environ 23 M FC |
| même OL | petite entreprise (PME) | 6 à 50 emplois, CA de 10 001 à 60 000 USD | environ 23 M à 136 M FC |

Conversions : 4 FC pour 1 FCFA et 2 260 FC pour 1 USD, cours de la BCC en 2026 (skill `bcc-banque-centrale-donnees-macro`, séries cours-de-change et marché des changes). Le cours flotte : ces équivalents bougent d'une année à l'autre.

**Exemple : la boutique de la démonstration, environ 100 à 120 M FC de ventes par an.**

- SMT : oui, sous 240 M FC.
- Statut d'entreprenant : possible.
- Fisc : petite entreprise, impôt de 1 % du CA pour la vente (loi 23/053, art. 127), soit 1,0 à 1,2 M FC.
- TVA : au-dessus de 80 M FC, donc assujettie, sauf erreur de lecture. Mbongo doit alerter, pas gérer la TVA.
- OL 22/030 : petite entreprise par son CA, micro par ses emplois (un vendeur). Le texte ne dit pas, dans ce qu'on a lu, comment trancher un critère contre l'autre.

**Deux décalages à retenir.**

- Un négociant entre 240 M et 300 M FC sort du SMT mais reste une petite entreprise pour le fisc.
- Le seuil de l'AUPCAP (environ 200 M FC) est plus bas que celui du SMT pour le négoce : un négociant entre 200 M et 240 M FC est au SMT sans avoir droit aux procédures simplifiées.

---

## 2. Comptabilité et statut (OHADA)

### 2.1 Le SMT lui-même (AUDCIF révisé, skill `audcif-acte-uniforme`)

- Art. 11 et 13 : deux systèmes seulement. Les petites entités sont au SMT « sauf option ». Seuils en « inférieur » strict.
- Art. 21 : comptabilité de trésorerie.
- Titre X, ch. 1 : un journal de trésorerie (note 4), un journal de suivi des créances impayées, un journal de suivi des dettes à payer, la conservation des pièces. Inventaire extra-comptable de quatre éléments : créances et dettes, stocks, immobilisations acquises ou cédées, emprunts. Amortissement linéaire sans prorata temporis.
- Titre X, ch. 3, note 4 : « un journal par banque et un journal pour la caisse ».
- Art. 17-1 : comptabilité tenue en monnaie ayant cours légal, donc en francs congolais.
- Art. 20 : une erreur se corrige par une inscription en négatif.
- **Art. 22, comptabilité informatisée** : irréversibilité des traitements, validation au plus tard chaque mois, « clôture informatique » au moins trimestrielle, chemin de révision, états numérotés et datés. C'est la base légale du logiciel.
- Art. 23 : arrêté des états dans les quatre mois. Art. 24 : conservation dix ans. Art. 72 : approbation dans les six mois. Art. 111 : sanction pénale si les états ne sont pas établis.
- Titre VII, compte 57 : la caisse est « débitrice ou nulle ».

Rien, dans ce qu'on a lu, ne fixe le délai ni l'exercice de bascule après un dépassement du seuil SMT. Le logiciel alerte ; la décision revient à l'expert-comptable partenaire.

### 2.2 L'entreprenant (AUDCG révisé, art. 30 à 33 et 62 à 65)

Personne physique qui exerce sur simple déclaration d'activité, sans frais, sans RCCM. Il tient un livre des ressources et des emplois (art. 31) et, s'il vend des marchandises, un registre des achats (art. 32). Il perd son statut après deux années de suite au-dessus des seuils du SMT (art. 30). Il porte son numéro et la mention « Entreprenant dispensé d'immatriculation » sur ses factures (art. 62). Prescription de cinq ans entre entreprenants (art. 33).

**C'est fait dans Mbongo** (voir `docs/regles-smt.md`, § 9).

L'AUDCIF (art. 2) vise les entités soumises à l'AUDCG. L'entreprenant doit-il aussi produire les états du SMT ? Les skills ne le disent pas. À trancher avec l'expert.

### 2.3 Le commerçant immatriculé et la petite société

- AUDCG, art. 44 : immatriculation au RCCM dans le premier mois d'activité. Art. 14 et 59 : numéro RCCM sur les livres et les factures.
- AUDCG, art. 9 : le commerce est incompatible avec la qualité d'expert-comptable. L'expert partenaire ne peut donc pas être associé commerçant de la structure.
- AUSCGIE, art. 376 : commissaire aux comptes obligatoire dans une SARL si deux critères sur trois sont dépassés (bilan 125 M FCFA, CA 250 M FCFA, 50 salariés). Une SARL au SMT n'y arrive jamais par le CA : pas de certification légale. Cela confirme « Mbongo prépare, il ne certifie pas ».
- AUSCGIE, art. 140 et 348 : assemblée dans les six mois de la clôture. Art. 269 : dépôt au RCCM dans le mois de l'approbation. Art. 139 : état des cautionnements et sûretés donnés. Art. 346 : réserve légale. Art. 371 : capitaux propres sous la moitié du capital.
- AUSCOOP, art. 204 et 121 : la société coopérative simplifiée (cinq personnes au moins, sans commissaire aux comptes obligatoire) peut grouper des petits commerçants. Pas de besoin pour la version 1.

### 2.4 Les imprimés et le calendrier (support CPCC, novembre 2020)

- Dépôt des états sur les imprimés du CPCC. Pour le SMT : bilan, compte de résultat, trois notes et les journaux. Montants arrondis au franc, « NÉANT » sur les états sans objet.
- Calendrier : DGI fin avril, Ministère de l'Économie mi-juin, CPCC fin juin, RCCM fin du mois qui suit l'approbation. Astreintes par jour de retard (arrêté n° 024/CAB/MIN/FINANCES/2010 ; arrêté interministériel du 26 novembre 2013).
- Le même support rappelle que seuls les experts-comptables inscrits tiennent la comptabilité d'autrui. Il cite « l'encodage externalisé » : la structure doit le refuser.

Source de 2020, à recouper avec les textes en vigueur.

---

## 3. Fiscalité

Source principale : skill `fiscalite-rdc` (compilation DGI à jour au 19 juillet 2026) et `fiscalite-rdc-socle`. Rappel : le conseil fiscal et les déclarations sont des actes de l'expert-comptable (loi 15/002, art. 43.6 à 43.8). Mbongo peut informer et alerter, rien de plus.

### 3.1 Le régime en vigueur depuis le 1er janvier 2026

La loi n° 23/053 du 30 novembre 2023 abroge l'impôt sur les bénéfices et profits (IBP) et l'ordonnance-loi 13/006 sur les entreprises de petite taille (art. 152 et 153).

- **Le régime forfaitaire ne vise que les entreprises individuelles** soumises à l'IRPP (art. 105). Une SARL relève de l'impôt sur les sociétés : 30 % du bénéfice, minimum 1 % du CA (art. 56 et 57).
- **Micro-entreprise** (CA au plus 25 M FC, art. 107) : forfait annuel égal à l'équivalent de 30 USD, payé au plus tard le 30 avril de l'année suivante (AM n° 015/CAB/MIN/FINANCES/2025 du 19 février 2025). Pas de minimum de 1 % (art. 122).
- **Petite entreprise** (25 M à 300 M FC, art. 109) : 1 % du CA pour la vente, 2 % pour les services, selon l'activité principale (art. 127). Paiement en deux fois : 60 % avec la déclaration au plus tard le 31 janvier, 40 % au plus tard le 30 avril (LPF, art. 57 quater).
- Hors régime et exemptés : marchands ambulants, cireurs, petits vendeurs à domicile dispensés de patente (art. 108 et 64.3).
- **Changement de régime** : option pour le réel par écrit avant le 1er février, irrévocable trois ans (art. 110). Le surclassement est immédiat ; le déclassement exige deux exercices sous le seuil (art. 113).
- **Obligation comptable** : tenir une comptabilité selon l'AUDCIF révisé (art. 139). Le SMT y répond. La déclaration indique le nom et la qualification du comptable (art. 141) : jamais la structure comme teneur de comptes.
- **Facture normalisée** pour chaque transaction, « sous réserve des dispositions particulières applicables aux entreprises de petite taille » (LPF, art. 23, modifié par la LF 25/060). Mentions à fixer par voie réglementaire.
- **Rappel d'impôt** possible sur l'exercice en cours et les quatre années précédentes (LPF, art. 43).

### 3.2 TVA

Assujettissement à partir de 80 M FC de CA annuel HT (OL 10/001, art. 14). Une entreprise existante se juge sur le CA de l'année précédente (décret 011/42, art. 43). La LF 2026 crée un taux réduit de 1 % pour 24 positions, dont le riz, le sucre, le sel iodé et les savons.

### 3.3 Retenues que le commerçant doit faire

- **Salariés d'une micro-entreprise** : retenue forfaitaire, équivalent de 36 USD par an et par salarié, reversée par quart (9 USD) au plus tard le 15 du mois qui suit chaque trimestre (AM n° 019/2025 ; loi 23/053, art. 70 et 121). Le skill `mes-cours-droit-fiscalite` numérote cet arrêté 012 : à vérifier.
- **Salariés d'une petite entreprise** : retenue IRPP reversée le 15 du mois suivant (LPF, art. 18), déclaration annuelle des salaires au plus tard le 31 mars (LPF, art. 22 ter). Le taux n'est dans aucun des skills lus.
- **Loyer de la boutique, à Kinshasa** : le locataire retient 20 % du loyer (1er rang) ou 15 % (2e à 4e rang) et reverse à la DGRK au plus tard le 10 du mois suivant (arrêté provincial n° 015/CAB/MIN.PROV/FIN.ECO/2023 du 7 décembre 2023).

### 3.4 Taxes locales

- **Patente** : le petit commerce n'exige qu'une patente annuelle, par dérogation au registre de commerce, sans obligation de tenir tous les livres de commerce (OL 90-046, art. 1er, modifié par l'OL 13/009 du 23 février 2013).
- **Commune** : taxe journalière d'étalage aux marchés, location des échoppes, taxe unique d'établissement de l'activité commerciale, impôt personnel minimum (nomenclature, skill `recettes-non-fiscales-rdc`).
- Les montants relèvent des édits et arrêtés de la ville de Kinshasa, absents des skills.

### 3.5 Le commerçant qui importe

Toute marchandise importée se déclare, même exonérée (code des douanes, art. 112), dans les trois jours francs de l'arrivée (art. 113), par le propriétaire ou un commissionnaire agréé, personne morale (art. 115 à 117). Prescription de trois ans avec déclaration, six ans sans (art. 369 et 370). La structure ne peut pas agir comme commissionnaire.

### 3.6 Échéancier annuel du petit commerçant (à afficher, sans calcul engageant)

| Date | Quoi | Texte |
|---|---|---|
| le 10 de chaque mois | retenue sur loyer (DGRK) ; déclaration ONEM | arrêté provincial 015/2023 ; AM 028/2025 |
| le 15 de chaque mois | cotisations CNSS ; paiement ONEM ; retenue IRPP des salariés | AM 146 ; AM 028/2025 ; LPF art. 18 |
| le 15 après chaque trimestre | retenue forfaitaire des salariés d'une micro-entreprise | AM 019/2025 |
| 31 janvier | 1re quotité de l'impôt (60 %) ; situation annuelle de la main-d'œuvre | LPF art. 57 quater ; arrêté 087/2023 |
| 1er février | option pour le régime réel | loi 23/053, art. 110 |
| 31 mars | déclaration annuelle des salaires | LPF art. 22 ter |
| 30 avril | 2e quotité (40 %) ; forfait de la micro-entreprise ; INPP du 1er trimestre | LPF art. 57 quater ; AM 015/2025 ; ord. 84/186 |
| 31 juillet, 31 octobre, 31 janvier | INPP des trimestres suivants | ord. 84/186, art. 3 |
| fin avril à fin juin | dépôt des états (DGI, Économie, CPCC) | support CPCC 2020 |

---

## 4. Employer un vendeur

Source : skills `droit-travail-congolais`, `cnss-cotisations-sociales-rdc`, `onem-rdc`. **Un seul vendeur suffit à tout déclencher.** Aucun allègement ne dispense un petit employeur de la CNSS, de l'INPP ni de l'ONEM.

- **Contrat** : écrit exigé (Code du travail, art. 44) ; sans écrit, présumé à durée indéterminée. Le contrat écrit est visé par l'ONEM (art. 47). Exception : l'engagement au jour le jour.
- **Salaire minimum** : 21 500 FC par jour pour le manœuvre ordinaire, payé depuis la paie de janvier 2026 (décret n° 25/22 du 30 mai 2025, art. 2 et 3), soit 559 000 FC pour un mois de 26 jours. Paie au plus tard six jours après la période (art. 99).
- **Livre de paie** obligatoire (art. 213), modèle simplifié admis sous 25 travailleurs (art. 215), fichier informatisé admis (arrêté 042/2008). Bulletin à chaque paie, décompte écrit à la rupture (art. 103 : sans décompte, les dires de l'employeur sont rejetés).
- **Déclarations** : embauche et départ dans les quinze jours (art. 217) ; situation annuelle au 31 janvier (arrêté 087/2023).
- **CNSS** (décret n° 18/041 du 24 novembre 2018) : 13 % à la charge de l'employeur (6,5 % famille, 5 % pension, 1,5 % risques professionnels), 5 % retenus au salarié. Affiliation dans les huit jours du premier embauchage, déclaration et paiement le 15 du mois suivant. Majoration de 0,5 % par jour à partir du 21. Une retenue oubliée ne se récupère pas sur le salarié (loi 16/009, art. 19).
- **INPP** : 3,5 % des rémunérations pour un employeur de 1 à 50 travailleurs, depuis le 24 septembre 2025, payé par trimestre.
- **ONEM** : 0,5 % (arrêté n° 028/CAB/MIN.ET/FMM/RK/09/2025), déclaration le 10, paiement le 15.
- **Total** : environ 17 % de charges patronales sur le brut, plus 5 % de retenue salariale et l'impôt du salarié.
- **Sanctions** : jusqu'à 20 000 FC constants par infraction et par travailleur au Code du travail (art. 321 et 328) ; CNSS : amende de 500 000 à 5 000 000 FC, et prison pour défaut de versement des retenues (loi 16/009, art. 128 et 129).

**Où le SMT range-t-il ces sommes ?** Les modèles n'ont que « Dépenses sur salaires » et « Dépenses sur impôts et taxes ». Proposition : salaire net et retenues en Salaires ; cotisations patronales CNSS, INPP et ONEM en Salaires aussi (ce sont des charges de personnel). À valider par l'expert partenaire.

La structure peut former, fournir des modèles de contrat et de décompte, contrôler. Elle ne dépose pas les déclarations à la place du commerçant sans l'agrément de secrétariat social (Code du travail, art. 220 et 221).

---

## 5. Créances impayées et litiges

Le cœur du métier d'un petit commerçant qui vend à crédit. Skills `aupsrve-acte-uniforme`, `code-civil-livre-iii-rdc`, `droit-judiciaire-rdc`, `aus-acte-uniforme`, `aupcap-acte-uniforme`, `aum-acte-uniforme`, `code-famille-rdc`.

### 5.1 Prouver et ne pas laisser prescrire

- **Client particulier : un an.** L'action des marchands contre des particuliers non marchands se prescrit par un an (Code civil, livre III, art. 653), même si les livraisons continuent (art. 654). Entre commerçants : cinq ans (AUDCG, art. 16).
- La citation, le commandement, la saisie ou la **reconnaissance de dette** par le client interrompent la prescription (CC, art. 638 et 640 ; AUDCG, art. 23).
- Les registres du marchand ne font pas preuve contre un non-commerçant (CC, art. 211). L'écrit signé par le client compte plus que le journal.
- Une quittance qui précise la facture payée lie le débiteur (CC, art. 153).

### 5.2 Recouvrer

- **Injonction de payer** (AUPSRVE, JO OHADA du 15 novembre 2023) : créance certaine, liquide et exigible (art. 2). Requête au domicile du débiteur avec, à peine d'irrecevabilité, noms, domiciles, montant détaillé, justificatifs (art. 4). Ordonnance non avenue sans signification dans les trois mois (art. 7) ou sans formule exécutoire demandée dans les deux mois (art. 17).
- La **saisie-attribution** touche aussi la monnaie électronique : M-Pesa, Orange Money, Airtel Money (art. 153, 157, 161).
- **Juridiction** : le tribunal de commerce juge entre commerçants (loi 002-2001, art. 17) ; contre un particulier, le tribunal de paix jusqu'à 2 500 000 FC (LO 13/011-B, art. 110). Saisine verbale possible au tribunal de commerce (art. 19).
- **Médiation** (AUM, 2017) : l'invitation suspend la prescription (art. 4) ; l'accord homologué devient exécutoire (art. 16). La structure ne peut pas être médiatrice entre son client et le débiteur de ce client, faute d'impartialité.
- L'arbitrage (AUA) n'est pas réaliste pour de petites ventes à crédit.

### 5.3 Garanties

- **Réserve de propriété** : convenue par écrit au plus tard à la livraison, à peine de nullité (AUS, art. 72 et 73). Utile pour un vendeur d'appareils ou de meubles à crédit.
- Cautionnement : écrit, somme en lettres et en chiffres de la main de la caution, ou deux témoins si elle ne sait pas écrire (AUS, art. 14).

### 5.4 L'entreprise en difficulté

L'AUPCAP prévoit pour la petite entreprise (au plus 20 travailleurs, CA au plus 50 M FCFA, art. 1-3) des procédures simplifiées : règlement préventif (art. 24 à 24-5), redressement (art. 145 à 145-8), liquidation (art. 179-1 à 179-8). Des documents de substitution suffisent à la place des états financiers (art. 6-1). Déclaration de cessation des paiements dans les 30 jours (art. 25). Les états du SMT et le suivi des créances et dettes sont exactement les pièces demandées.

### 5.5 Les commerçantes mariées

L'autorisation maritale est supprimée (loi n° 16/008 du 15 juillet 2016). Mais l'accord des deux époux reste requis pour un emprunt de plus de 150 000 FC ou un cautionnement de plus de 650 000 FC engageant les biens communs (Code de la famille, art. 499). Utile à savoir avant un microcrédit. Seuils de 2016, très bas aujourd'hui.

---

## 6. Profession comptable : ce que la structure peut faire

Skills `onec-rdc`, `iaasb-assurance-services-connexes`, `code-ethique-iesba`, `guides-ifac-pme-audit-qualite`.

- **Loi 15/002** : titre interdit dans la dénomination, l'objet et la publicité, et tout terme « susceptible de créer la confusion » (art. 41 et 42). Huit actes réservés (art. 43). Peines de l'art. 71 : 3 mois à 5 ans et 5 à 10 M FC (personne physique), 10 à 50 M FC (personne morale).
- **Pas de commission** : les honoraires de l'expert excluent « toute autre rémunération, même indirecte, d'un tiers » (art. 50) ; le règlement intérieur interdit le démarchage et les contreparties sur honoraires (art. 225). L'expert facture le commerçant directement. Mbongo ne touche rien de l'expert et ne lui verse rien.
- **Corriger, c'est redresser** (art. 43.1) : l'assistant signale, il ne corrige jamais. C'est déjà la règle du logiciel.
- **La mission naturelle de l'expert est une compilation** (ISRS 4410) : sans assurance, la direction reste responsable de ses données (§7), lettre de mission écrite (§24), rapport qui dit que l'expert ne vérifie pas (§40). La comptabilité de caisse figure parmi les exemples de référentiel (A18). Des procédures convenues (ISRS 4400) peuvent s'ajouter, par exemple sur la caisse ou les créances. L'« arrêté » de Mbongo est en pratique une compilation.
- **IESBA, R320.11** : avant d'utiliser un outil, l'expert évalue s'il a été testé et si les données sont fiables. Les tests du moteur et l'invariant actif = passif sont un argument à lui remettre.
- Un « sticker » holographique ONEC est exigé sur les rapports et attestations de l'expert (communiqué de février 2026, skill `onec-rdc`).

---

## 7. Monnaie, finance, blanchiment

- **Cours de la BCC** : série quotidienne du cours indicatif CDF/USD depuis 2001 (2 181,39 FC le 30 décembre 2025 ; autour de 2 260 FC en août 2026) et cours croisés dont le FCFA (100 FCFA = 397,30 FC en moyenne d'août 2026). Bonne source pour le taux de clôture et pour l'équivalent des seuils.
- **Monnaie électronique** : plafonds de porte-monnaie fixés par instruction de la BCC (instruction 24 de 2011, puis 43 de 2020). Vigueur incertaine selon le skill : ne pas les coder en dur.
- **Microfinance** (loi 11/020 ; instruction 38) : le TEG figure obligatoirement dans l'offre de crédit (art. 5) ; pénalité de remboursement anticipé plafonnée (art. 14). Rien sur les tontines : le likelemba reste une convention de Mbongo (D9), à valider.
- **Blanchiment** (loi 22/068, art. 23) : aucun paiement en espèces de 10 000 USD ou plus. Un article voisin impose de payer salaires et impôts par virement ou chèque, quel que soit le montant (numéro illisible dans l'OCR du skill : à vérifier). Pour un petit commerce de Kinshasa qui paie son vendeur en espèces, la règle est lourde : point à creuser pour le mémoire.

---

## 8. Données personnelles et preuve

Code du numérique (ordonnance-loi n° 23/010 du 13 mars 2023), skill `droit-numerique-ua-rdc-corpus`.

- Noms de clients, photos de factures, numéros de téléphone sont des données personnelles (art. 183).
- Déclaration préalable à l'autorité de protection (art. 186). **Autorisation préalable** pour un traitement fondé sur les numéros de téléphone (art. 187.3) et pour un transfert hors RDC (art. 187.6).
- Dispense pour « la tenue de leur comptabilité générale » (art. 189.5) : à faire préciser, elle couvre peut-être le cœur du logiciel.
- **Hébergement en RDC** (art. 201), sauf protection adéquate et autorisation. Un serveur Supabase hors RDC, pour un pilote, se heurte à cet article.
- L'écrit électronique fait preuve s'il est intègre et si son auteur est identifiable (art. 89, 95, 97). Aucun article lu ne donne valeur d'original à la photo d'une facture papier : **garder le papier**.

Rien de tout cela ne bloque la soutenance (pas de serveur, données fictives). Tout bloque un pilote réel tant que ce n'est pas réglé.

---

## 9. Ce que Mbongo fait déjà

| Exigence | Texte | Dans Mbongo |
|---|---|---|
| un journal par caisse et par banque | AUDCIF, Titre X, note 4 | oui, un journal par compte |
| correction par inscription en négatif, irréversibilité | AUDCIF, art. 20 et 22 | oui, ajout seulement, contre-passation |
| caisse jamais créditrice | AUDCIF, compte 57 | contrôle « solde négatif », à traiter |
| inventaire extra-comptable, amortissement sans prorata | AUDCIF, Titre X | oui |
| alerte de dépassement du seuil | AUDCIF, art. 13 | oui (paramètre BCC) |
| livre et registre des achats de l'entreprenant, perte du statut sur deux ans | AUDCG, art. 30 à 32 | oui, depuis cette analyse |
| mention de l'entreprenant sur les factures | AUDCG, art. 62 | rappelée dans Réglages |
| tenue en francs congolais | AUDCIF, art. 17-1 | états en FC, dollars convertis |
| la structure ne redresse pas | loi 15/002, art. 43.1 | le bureau n'a aucun bouton d'écriture |
| pas de confusion avec un cabinet | loi 15/002, art. 42 | mention fixe, vocabulaire surveillé |

---

## 10. Pistes pour le logiciel

Classées par rapport entre l'utilité et le travail. Rien de cela n'est fait ; à décider étape par étape.

**Utiles et légères**

1. **Échéancier** fiscal et social (§ 3.6) sur l'accueil : rappels sans montant engageant.
2. **Créances : client particulier ou commerçant.** Pour un particulier, alertes à 6, 9 et 11 mois, et créance « en danger » à un an (CC, art. 653). Aujourd'hui l'alerte est à 30 jours seulement.
3. **Fiche créance complète** : adresse du client, détail vendu, chaque paiement, et un « dossier de créance » imprimable avec le décompte (AUPSRVE, art. 4).
4. **Ventilation d'un salaire** : à partir du brut, part CNSS du salarié (5 %), charges patronales (13 % + 3,5 % + 0,5 %), et alerte si le salaire est sous le minimum. Indicatif, sans faire la paie.
5. **Seuils fiscaux** : alertes à 25 M FC, 80 M FC (TVA) et 300 M FC, avec une estimation de l'impôt (1 % ou 2 %) marquée « estimation, pas une déclaration ».
6. **Deux contrôles de blanchiment** : espèces d'au moins 10 000 USD, salaire ou impôt payé en caisse.

**Plus lourdes**

7. **Validation mensuelle** des saisies (AUDCIF, art. 22) : un mois validé ne reçoit plus de saisie datée dedans.
8. Export au **format des imprimés du CPCC**.
9. Pour une SARL : état des sûretés (AUSCGIE, art. 139), contrôle des capitaux propres (art. 371), modèle de procès-verbal.
10. Taux de référence tiré de la série BCC, avec alerte quand le taux saisi s'en écarte.
11. Empreinte et horodatage de chaque photo de pièce (Code du numérique, art. 91 et 95).

**Seulement pour un pilote** : déclaration et autorisations auprès de l'autorité de protection des données, hébergement en RDC ou autorisation, contrat de sous-traitance avec chaque client.

---

## 11. Pour l'offre de la structure

**Ce qu'elle peut faire**

- Former le commerçant, fournir l'outil, contrôler les saisies et réclamer les pièces.
- Fournir des modèles : contrat de travail, décompte, reconnaissance de dette, clause de réserve de propriété, invitation à la médiation. Les faire relire par un avocat.
- Aider à la déclaration d'activité de l'entreprenant et à la patente (formalités administratives, pas des actes de l'art. 43).
- Préparer le dossier d'une créance impayée. Le commerçant ou son avocat le dépose.
- Se présenter comme une structure d'appui aux micro et petites entreprises. L'OL n° 22/030 définit un « accélérateur des PME » (art. 12.1) : le terme peut servir dans le mémoire, après vérification de son régime.

**Ce qu'elle ne fait pas**

- Saisir à la place du commerçant, même « encodage externalisé ».
- Donner un conseil fiscal, remplir une déclaration fiscale, choisir un régime d'imposition.
- Déposer les déclarations sociales comme mandataire sans agrément de secrétariat social.
- Toucher une commission de l'expert-comptable ou lui en verser une.
- Être médiatrice entre son client et le débiteur de ce client.
- Agir comme commissionnaire en douane ; manier l'argent des clients ou d'une tontine.

**La convention avec l'expert-comptable partenaire**

Inscrit en section A ou B de l'ONEC (attestation à jour). Mission de compilation ISRS 4410 sur les états SMT, procédures convenues en option. Lettre de mission entre l'expert et le commerçant. Honoraires facturés par l'expert au commerçant, sans rétrocession. Dossier technique du logiciel remis à l'expert (IESBA, R320.11).

---

## 12. Pour le mémoire

- **L'idée n'est pas neuve, l'outil l'est.** Kinzonzi (1984) jugeait déjà la « comptabilité simple » des petits commerçants insuffisante, sauf à la compléter par une récapitulation des recettes et des dépenses et un inventaire : c'est la logique du SMT (skill `kinzonzi-normalisation-comptable`).
- **Les définitions se contredisent** (§ 1) : bon point de discussion théorique et pratique.
- **Civisme fiscal** : les séries de la DGI (2016 à 2024) donnent le nombre de déclarations des petites et micro-entreprises sous l'ancien régime (skill `dgi-donnees-fiscales-rdc`). Utile pour l'étude de marché, en précisant que le régime a changé en 2026.
- **La réforme fiscale de 2023** réserve le forfait aux entreprises individuelles, alors que l'OL 13/006 visait toute forme juridique (Kalonji, 2014). Argument pour le statut d'entreprenant.
- Les sources à citer sont les textes eux-mêmes ; les skills ne sont que le chemin pour les trouver.

---

## 13. Contradictions et points à vérifier

1. Le SMT exclut le tableau des flux (Titre X), mais l'AUDCIF, art. 28, en parle. Suivre les modèles du Titre X.
2. « Banque en + ou en − » à l'actif du bilan SMT contre l'art. 34 (non-compensation). Le modèle SMT l'emporte pour le SMT.
3. Conservation : cinq ans pour le livre de l'entreprenant (AUDCG, art. 31), dix ans pour les documents comptables (AUDCIF, art. 24). Retenir dix ans.
4. Preuve électronique : le support CPCC (2020) dit qu'elle n'est pas admise ; l'AUDCIF (art. 67), l'AUDCG (art. 5) et le Code du numérique (art. 89 et suivants) l'admettent sous conditions.
5. Prescription contre un particulier : un an (CC, art. 653) ou cinq ans (AUDCG, art. 16) ? L'AUDCG réserve les « prescriptions plus courtes ». À trancher avec un juriste.
6. Allocations familiales : 8 100 FC par mois (arrêté 137/2018) contre 796,30 FC par jour et par enfant (décret 25/22). Le skill n'arbitre pas.
7. Numéros d'arrêtés fiscaux (019/2025 ou 012) et articles de la LF 2026 tirés du projet de loi.
8. Norme ONEC 2024/001 : elle renvoie au régime de l'OL 13/006, abrogée depuis.
9. L'entreprenant doit-il produire les états du SMT en plus de son livre ? (AUDCIF, art. 2.)
10. Taux de l'impôt retenu sur les salaires d'une petite entreprise : absent des skills.
11. Le seuil de 25 M FC et celui de 300 M FC peuvent être réajustés par arrêté (loi 23/053, art. 107 et 109).

---

## 14. Skills lus, et ce qu'ils valent pour ce sujet

| Skill | Pertinence | Apport principal |
|---|---|---|
| audcif-acte-uniforme | forte | le SMT, art. 22 sur la comptabilité informatisée |
| audcg-acte-uniforme | forte | l'entreprenant, le commerçant, la prescription de cinq ans |
| organisation-comptable-cpcc | forte | imprimés, calendrier de dépôt (2020) |
| fiscalite-rdc, fiscalite-rdc-socle | forte | régime micro et petite entreprise de 2026, TVA, retenues |
| droit-travail-congolais | forte | contrat, SMIG, livre de paie, déclarations, INPP |
| cnss-cotisations-sociales-rdc | forte | taux, échéances, pénalités |
| aupsrve-acte-uniforme | forte | injonction de payer, saisie de la monnaie électronique |
| code-civil-livre-iii-rdc | forte | prescription d'un an, preuve |
| droit-judiciaire-rdc | forte | tribunal de commerce, tribunal de paix |
| aupcap-acte-uniforme | forte | procédures simplifiées de la petite entreprise |
| code-famille-rdc | forte | commerçante mariée, accord du conjoint |
| onec-rdc | forte | frontière légale de la structure |
| iaasb-assurance-services-connexes | forte | compilation ISRS 4410, procédures convenues |
| droit-numerique-ua-rdc-corpus | forte | données personnelles, hébergement, preuve |
| droit-economique-investissement-rdc | forte | définition légale des MPME (OL 22/030) |
| auscgie-acte-uniforme | moyenne | la SARL au SMT |
| syscohada | moyenne | outil de contrôle croisé, pas une norme |
| onem-rdc | moyenne | contribution de 0,5 % |
| recettes-non-fiscales-rdc | moyenne | patente, taxes communales (sans montants) |
| code-douanes-rdc | moyenne | le petit importateur |
| aus-acte-uniforme | moyenne | réserve de propriété, cautionnement |
| aum-acte-uniforme | moyenne | médiation |
| instructions-bcc-rdc | moyenne | monnaie électronique, cours indicatif |
| bcc-banque-centrale-donnees-macro | moyenne | séries de cours, taux de clôture |
| reglementation-microfinance-rdc | moyenne | crédit des IMF, TEG |
| cenaref-blanchiment-capitaux-rdc | moyenne | plafond d'espèces, salaires par virement |
| code-ethique-iesba | moyenne | évaluation de l'outil, commissions |
| mes-cours-droit-fiscalite | moyenne | module IRPP 2025 de la DGI |
| auscoop-acte-uniforme | faible | société coopérative simplifiée |
| kinzonzi-normalisation-comptable | faible | histoire, argument de mémoire |
| precis-droit-fiscal-congolais-kalonji | faible | régime de 2013, abrogé |
| dgi-donnees-fiscales-rdc | faible | statistiques seulement |
| guides-ifac-pme-audit-qualite | faible | guides d'audit |
| gafi-lbc-ft-normes | faible | normes générales |
| aua-acte-uniforme | faible | arbitrage, irréaliste ici |
| droit-foncier-rdc | faible | ne traite pas le bail commercial |
| telecommunications-rdc | nulle | exclut la monnaie électronique |

Non lus, hors périmètre : comptabilité publique, IPSAS, ISSAI, IFRS et IFRS PME, consolidation, mines, hydrocarbures, forêts, environnement, ASBL, assurances, rapports macroéconomiques détaillés.
