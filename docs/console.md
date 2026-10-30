# Console de TRK Consulting

Outil interne, à part du logiciel : https://trkconsole.web.app. Code dans `src/console/`, construction par `npm run build:console` (dossier `dist-console`).

## Serveur

Projet Supabase « mbongo » (organisation Orbit ONG, région eu-central-1, offre gratuite). Schéma : `supabase/migrations/`. Essai du cloisonnement : `supabase/tests/cloisonnement.sql` (tout est annulé à la fin, le message final dit « ESSAI RÉUSSI » ou liste les échecs).

L'offre gratuite met le projet en pause après une semaine sans activité. Le rappel quotidien des SMS suffit en principe à le garder actif ; sinon, le relancer depuis supabase.com.

## Accès

- Administrateur : adresse inscrite dans `invitations_admin`. Le compte créé avec cette adresse devient administrateur à l'inscription. Ajouter une adresse : `insert into public.invitations_admin values ('adresse@exemple.cd');` dans l'éditeur SQL de Supabase.
- L'envoi d'e-mails par défaut de Supabase ne sert que les membres de l'équipe du projet : une inscription depuis la console peut échouer. Le compte de manyblck@gmail.com a été créé directement en base, confirmé, avec un mot de passe provisoire à changer dans « Mon compte » (clic sur l'adresse, en haut). Pour d'autres administrateurs : brancher un SMTP (Authentication, SMTP Settings) ou créer le compte depuis le tableau de bord Supabase (Authentication, Users, « Add user », case « Auto confirm »), après l'avoir mis dans `invitations_admin`.
- Lien de confirmation d'e-mail : il confirme l'adresse même si la page d'arrivée ne s'affiche pas. Pour une page d'arrivée correcte, régler dans Supabase « Authentication », « URL Configuration », Site URL : `https://trkconsole.web.app`.

## Cloisonnement (règles RLS)

| Qui | Voit | Écrit |
|---|---|---|
| Administrateur TRK | clients, abonnements, paiements, suivi, SMS, équipe (la console ne montre pas les saisies comptables) | tout cela ; jamais les saisies comptables |
| Assistant TRK | clients, abonnements, paiements, suivi, SMS | le suivi seulement (visites, appels, formations, contrôles) |
| Membre d'un client (commerçant, assistant, expert) | sa fiche, ses abonnements, ses paiements, ses saisies | rien, sauf le commerçant |
| Commerçant | idem | ajoute ses saisies, pour son entreprise seulement ; personne ne les modifie ni ne les efface |

## Équipe

Onglet « Équipe » (administrateurs) : ajouter un membre avec un mot de passe provisoire, changer son rôle, lui donner un nouveau mot de passe, le retirer. Les comptes sont créés directement en base (`creer_membre_equipe`), sans e-mail. Essai : `supabase/tests/role_assistant.sql`.

## Code client et envoi des saisies

Chaque client a un code de huit caractères (ex. KX7P-29QD), visible sur sa fiche (« Téléphone du commerçant »). Le commerçant le tape une fois dans Mbongo, Réglages, TRK Consulting. Le serveur rend au téléphone un jeton secret et n'en garde que l'empreinte. Ensuite l'appli envoie seule, à l'ouverture, au retour du réseau et toutes les cinq minutes, ce qui n'est pas encore parti. Les photos ne partent pas.

- Fonctions : `lier_appareil(code, nom)` et `envoyer_saisies(jeton, lignes)`, appelables sans compte (elles vérifient le code ou le jeton) ; `nouveau_code_client` et `delier_appareil`, pour l'équipe.
- Les saisies comptables ne sont jamais modifiées ; les fiches (entreprise, exercice, compte, inventaire) sont remplacées par leur dernière version.
- La console montre les téléphones reliés, la date du dernier envoi et le nombre de lignes reçues, pas les saisies. Le tableau de bord Supabase, lui, montre toutes les tables : son accès est réservé à l'administrateur technique.
- Les noms et adresses des clients et fournisseurs du commerçant ne partent pas : dans les lignes `tiers`, le nom devient un identifiant « tiers-… » (empreinte salée du nom normalisé, le sel reste sur le téléphone) et l'adresse est retirée ; le nom repris dans le libellé d'un encaissement ou d'un règlement est remplacé de même. Un nom tapé dans un libellé libre part tel quel.
- Nouveau code : l'ancien ne relie plus de téléphone ; ceux déjà reliés continuent. Délier : le téléphone n'envoie plus.
- Essai : `supabase/tests/code_client.sql`. Migration : `20261031_code_client.sql`.

## Formules

Essentiel et Suivi seulement. La formule « Avec l'expert-comptable » n'est plus vendue : l'expert partenaire facture et encaisse lui-même ses missions (loi n° 15/002, art. 50). La base refuse toute nouvelle ligne « expert » ; les anciennes restent lisibles (« Ancienne formule (plus vendue) »), sans tarif. Migration : `20261101_sans_formule_expert.sql` ; essai : `supabase/tests/sans_formule_expert.sql`.

## Rappels SMS

Chaque jour à 8 h (Kinshasa), `prive.planifier_rappels()` prépare un rappel pour le dernier abonnement de chaque client actif qui a accepté les SMS : 10 jours avant la fin (fenêtre 4 à 10 jours), 3 jours avant (1 à 3), le jour même, puis une fois en retard (1 à 30 jours). Jamais deux fois le même rappel. Texte en français ou en lingala selon la fiche ; il se termine par « Répondez STOP pour ne plus recevoir ces messages. » (« Soki olingi lisusu te kozwa bansango oyo, zongisa STOP. »). Avec la mention, un rappel dépasse 160 signes et part en deux SMS.

Accord du client (Code du numérique, art. 196) : cocher la case demande la date et la forme de l'accord (de vive voix, par écrit, par WhatsApp), gardées dans `sms_consentement_le` et `sms_consentement_forme`. La base les exige quand l'accord est donné et les efface quand il est retiré. Garder la preuve (papier signé, message). À un STOP, décocher la case. Les fiches cochées avant la migration restent valables ; la console les signale « accord à dater ». Migration : `20261102_consentement_sms.sql` ; essai : `supabase/tests/consentement_sms.sql` (et `cloisonnement.sql`, mis à jour).

Mode test (`reglages_console.sms_mode = 'test'`) : les SMS sont préparés et visibles dans la console, rien ne part. Pour l'envoi réel : créer un compte chez un fournisseur (Africa's Talking ou Twilio), ajouter la clé dans les secrets du projet Supabase, brancher une fonction d'envoi des SMS « a_envoyer », puis passer `sms_mode` à `reel`.

## Reste à faire

- Envoi réel des SMS (fournisseur à choisir).
- Lecture des saisies reçues au bureau (pour l'instant, le bureau lit les données de l'ordinateur).
- Données personnelles, avant un pilote (détail : `docs/architecture.md`, § 14.1) : hébergement hors RDC (Code du numérique, art. 201 : « Les données personnelles sont stockées et/ou hébergées en République Démocratique du Congo », sauf constat de l'Autorité de protection des données) ; projet Supabase rattaché à l'organisation « Orbit ONG », à passer à TRK ; déclaration à l'Autorité et autorisation pour les numéros de téléphone ; contrat de sous-traitance ; registre des traitements ; durée de conservation à fixer et à appliquer.
