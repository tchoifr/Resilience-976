# Formulaire d'experimentation utilisateurs

## Route

```txt
/experimentation-utilisateurs
```

## Usage

1. Ouvrir le prototype sur le telephone ou l'ordinateur du participant.
2. Faire realiser le parcours: accueil, diagnostic, resultats, checklist ou kit.
3. Renseigner le formulaire avec un code participant non nominatif.
4. Demarrer le serveur analytics pour enregistrer les reponses en BDD.
5. Exporter les reponses en CSV ou JSON.
6. Integrer les chiffres, verbatims anonymises et captures au document de preuve 11.

## Donnees collectees

- code participant non nominatif;
- appareil, navigateur, profil general;
- aide recue;
- duree totale;
- parcours termine ou non;
- notes de comprehension, facilite, score, priorites, actions, sources et recommandation;
- commentaires libres limites a 500 caracteres par champ.

## Donnees exclues

Ne pas saisir:

- nom ou prenom complet;
- adresse precise;
- telephone ou email;
- pathologie, traitement ou detail medical;
- reponse detaillee au diagnostic d'un foyer.

## Stockage

Les retours sont envoyes au serveur via:

```txt
POST /api/feedback
```

Ils sont enregistres dans la base SQLite locale:

```txt
server/data/resilience.sqlite
```

Le formulaire conserve aussi une copie de secours dans le `localStorage` de l'appareil sous la cle:

```txt
resilience976.userExperiment.feedback
```

La base est creee automatiquement au lancement du serveur:

```bash
npm run analytics:server
```

Export depuis la BDD:

```bash
npm run feedback:export
```

Cette commande genere:

- `server/data/feedback-export.csv`;
- `server/data/feedback-export.json`.

Le dossier `server/data/` est ignore par git pour eviter de versionner des donnees de test ou d'exploitation.
