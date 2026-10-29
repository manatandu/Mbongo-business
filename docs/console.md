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
| Administrateur TRK | clients, abonnements, paiements, suivi, SMS, équipe | tout cela ; jamais les saisies comptables |
| Assistant TRK | clients, abonnements, paiements, suivi, SMS | le suivi seulement (visites, appels, formations, contrôles) |
| Membre d'un client (commerçant, assistant, expert) | sa fiche, ses abonnements, ses paiements, ses saisies | rien, sauf le commerçant |
| Commerçant | idem | ajoute ses saisies, pour son entreprise seulement ; personne ne les modifie ni ne les efface |

## Équipe

Onglet « Équipe » (administrateurs) : ajouter un membre avec un mot de passe provisoire, changer son rôle, lui donner un nouveau mot de passe, le retirer. Les comptes sont créés directement en base (`creer_membre_equipe`), sans e-mail. Essai : `supabase/tests/role_assistant.sql`.

## Rappels SMS

Chaque jour à 8 h (Kinshasa), `prive.planifier_rappels()` prépare un rappel pour le dernier abonnement de chaque client actif qui a accepté les SMS : 10 jours avant la fin (fenêtre 4 à 10 jours), 3 jours avant (1 à 3), le jour même, puis une fois en retard (1 à 30 jours). Jamais deux fois le même rappel. Texte en français ou en lingala selon la fiche.

Mode test (`reglages_console.sms_mode = 'test'`) : les SMS sont préparés et visibles dans la console, rien ne part. Pour l'envoi réel : créer un compte chez un fournisseur (Africa's Talking ou Twilio), ajouter la clé dans les secrets du projet Supabase, brancher une fonction d'envoi des SMS « a_envoyer », puis passer `sms_mode` à `reel`.

## Reste à faire

- Envoi réel des SMS (fournisseur à choisir).
- Envoi des saisies du téléphone vers `saisies` (connexion du commerçant, file d'envoi déjà prête dans l'appli).
- Données personnelles : consentement aux SMS déjà demandé sur la fiche ; registre, durée de conservation et hébergement hors RDC à documenter (Code du numérique, ordonnance-loi n° 23/010).
