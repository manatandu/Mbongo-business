# Mettre Mbongo en ligne avec Firebase

Trois sites dans le même projet Firebase (`mbongo-8a748`), réglés dans `firebase.json` :

- l'appli et le bureau : `https://mbongo-8a748.web.app` (dossier `dist`) ;
- le logiciel présenté : `https://mbongo-business.web.app` (dossier `sites/mbongo-business`) ;
- TRK Consulting : `https://trk-consulting.web.app` (dossier `sites/trk-consulting`).

La mise en ligne automatique (plus bas) crée les deux derniers sites s'ils n'existent pas. À la main : `firebase hosting:sites:create mbongo-business` et `firebase hosting:sites:create trk-consulting`.

Tout se fait depuis un ordinateur. Une seule fois pour les étapes 1 à 5, ensuite seule l'étape 6 revient.

## 1. Avoir Node.js

Dans un terminal (sous Windows : « Invite de commandes » ou « PowerShell ») :

```
node -v
```

Si une version s'affiche (v20 ou plus), passer à l'étape 2. Sinon, installer la version « LTS » depuis nodejs.org, puis rouvrir le terminal.

## 2. Récupérer le dépôt

```
git clone https://github.com/manatandu/mbongo-business.git
cd mbongo-business
git checkout claude/new-session-e7uycb
npm install
```

Si le dossier existe déjà : `cd mbongo-business`, puis `git pull`, puis `npm install`.

## 3. Installer l'outil Firebase et se connecter

```
npm install -g firebase-tools
firebase login
```

Le navigateur s'ouvre : choisir le compte Google habituel.

## 4. Créer le projet dans la console

Sur console.firebase.google.com :
- « Ajouter un projet », le nommer par exemple `mbongo` ;
- Google Analytics : non (inutile ici) ;
- dans le menu de gauche, « Hosting », puis « Commencer ». On peut sauter les écrans d'explication : le dépôt est déjà prêt.

Noter l'identifiant du projet (ex. `mbongo-1a2b3`), affiché dans les paramètres du projet.

## 5. Relier le dossier au projet

Dans le dossier `mbongo-business` :

```
firebase use --add
```

Choisir le projet créé, puis donner l'alias `default`. Cela crée un fichier `.firebaserc`.

Ne pas lancer `firebase init` : le fichier `firebase.json` existe déjà et il serait écrasé.

## 6. Publier

```
firebase deploy --only hosting
```

La commande construit le logiciel (`npm run build`) puis l'envoie. À la fin, elle affiche l'adresse :

- l'appli : `https://<identifiant>.web.app`
- le bureau : `https://<identifiant>.web.app/bureau.html`

Pour une mise à jour : `git pull`, puis la même commande.

## 7. Vérifier sur le téléphone

1. Ouvrir l'adresse de l'appli dans Chrome, avec internet.
2. Réglages, « Mettre Mbongo sur l'écran d'accueil ».
3. Couper les données et le Wi-Fi, rouvrir depuis l'icône. L'appli doit s'ouvrir.

## À savoir

- Chaque appareil garde ses données. Le bureau en ligne ne voit pas les saisies faites sur un téléphone. Les relier demandera un serveur, prévu seulement pour un pilote.
- `firebase.json` dit au navigateur de toujours revérifier les pages et le service worker. Sans ça, un téléphone pourrait garder une vieille version.
- Le plan gratuit de Firebase (Spark) suffit largement.

## Mise en ligne automatique (GitHub)

Le fichier `.github/workflows/mise-en-ligne.yml` refait l'étape 6 tout seul à chaque push sur `main` ou `claude/new-session-e7uycb`. Il lance d'abord les tests ; s'ils échouent, rien n'est publié.

Il lui faut une clé, à créer une seule fois :

1. Console Firebase, projet mbongo, roue dentée, « Paramètres du projet », onglet « Comptes de service ».
2. « Générer une nouvelle clé privée ». Un fichier `.json` se télécharge.
3. Sur GitHub, dépôt `mbongo-business`, « Settings », « Secrets and variables », « Actions », « New repository secret ».
4. Nom : `FIREBASE_SERVICE_ACCOUNT`. Valeur : tout le contenu du fichier `.json` (l'ouvrir avec le Bloc-notes, tout copier).
5. Enregistrer, puis supprimer le fichier `.json` de l'ordinateur.
6. Donner à ce compte le droit de publier : console.cloud.google.com/iam-admin/iam?project=mbongo-8a748, crayon sur la ligne `firebase-adminsdk-…@mbongo-8a748.iam.gserviceaccount.com`, ajouter les rôles « Administrateur Firebase Hosting » et « Consommateur Service Usage », enregistrer. Sans eux, la publication échoue avec « Permission denied … firebasehosting.googleapis.com ».

Cette clé ouvre le projet Firebase : ne la donner à personne, ne pas la mettre dans le dépôt.

Suivi des mises en ligne : onglet « Actions » du dépôt sur GitHub. Une coche verte : c'est en ligne.
