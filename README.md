# EDN — évolution des rangs limites

Site statique multi-années pour visualiser l'évolution des rangs limites par spécialité et subdivision.

## Données déjà intégrées

- **2024** : Tours 1 à 12 + définitif.
- **2025** : Tours 1 à 8 + définitif.
- Le sélecteur d'année et le nombre de tours sont automatiques.
- Les années futures ne nécessitent aucune modification du HTML.

## Ajouter une nouvelle année ou un nouveau tour

Les fichiers bruts sont déposés dans `sources/<année>/`.

Exemples :

```text
sources/2026/Tour 1.xlsx
sources/2026/Tour 2.xlsx
sources/2026/Tour 3.csv
sources/2027/Tour 1.xlsx
```

Chaque nouveau commit déclenche un nouveau build Vercel. Le build lit tous les fichiers présents dans `sources/`, régénère les JSON nécessaires, puis publie le site.

### Noms de fichiers acceptés

- `Tour 1.xlsx`
- `Tour 2.csv`
- `Tour 12 2027.xlsx`
- `T3.xlsx`
- `Tour Def.xlsx`
- `Tour Définitif.csv`
- `Final.xlsx`

Un seul fichier doit correspondre à un tour donné dans un dossier annuel.

## Format XLSX

Un fichier XLSX représente **un tour** et contient **un onglet par spécialité**.

Le convertisseur :

- ne dépend pas de l'ordre des onglets ;
- n'impose pas exactement 44 spécialités ;
- accepte une nouvelle spécialité apparaissant une année future ;
- reconnaît les noms d'onglets Excel tronqués à 31 caractères pour les spécialités déjà connues ;
- recherche les en-têtes dans les 12 premières lignes ;
- attend au minimum une colonne de ville/subdivision et une colonne de rang maximum.

En-têtes reconnus notamment : `Ville`, `Subdivision`, `Ville / Subdivision`, `Rang max`, `Rang maximal`, `Rang maximum`.

## Format CSV

Un CSV ne possède pas d'onglets : il doit donc contenir une colonne **Spécialité** en plus de la ville/subdivision et du rang max.

Exemple :

```csv
Spécialité;Ville / Subdivision;Rang min;Rang max;Rangs limites
Allergologie;Nancy;100;500;100 - 500
Oncologie;Amiens;200;700;200 - 700
```

Le séparateur peut être `;`, `,`, tabulation ou `|`. Les encodages UTF-8 et Windows-1252 usuels sont acceptés.

## Validation

Le build échoue volontairement plutôt que de publier des données ambiguës lorsque :

- le nom du tour n'est pas identifiable ;
- deux fichiers représentent le même tour ;
- les colonnes indispensables sont absentes ;
- un rang n'est pas numérique ;
- un rang min est supérieur au rang max ;
- un doublon spécialité/ville est détecté dans un même tour ;
- deux onglets XLSX correspondent à la même spécialité après normalisation.

Si un nouveau fichier est invalide, le déploiement Vercel échoue et la dernière version valide du site reste en ligne.

## Structure du dépôt

- `index.html` : interface et graphiques.
- `data/*.json` : données déjà converties utilisées par le site.
- `data/manifest.json` : liste des années publiées.
- `sources/<année>/*.(xlsx|csv)` : fichiers bruts des nouveaux tours.
- `scripts/build_data.py` : validation + conversion XLSX/CSV → JSON.
- `scripts/build_site.py` : génère le dossier `dist/` servi par Vercel.
- `vercel.json` : configuration du build Vercel.

## Déploiement Vercel

Importer ce dépôt dans Vercel. Le fichier `vercel.json` fournit déjà :

- la commande de build ;
- le dossier de sortie `dist`.

Une fois Vercel relié au dépôt, un commit sur `main` déclenche automatiquement un nouveau déploiement.

## Test local facultatif

```bash
python3 -m pip install -r requirements.txt
python3 scripts/build_site.py
python3 -m http.server 8000 -d dist
```

Puis ouvrir `http://localhost:8000`.
