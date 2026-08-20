# EDN — évolution des rangs limites

Site statique multi-années pour visualiser l'évolution des rangs limites par spécialité et subdivision.

## Ce qui est déjà prêt

- 2024 : Tours 1 à 12 + définitif.
- 2025 : Tours 1 à 8 + définitif.
- Le sélecteur d'année est automatique.
- Le nombre de tours affichés est lu dans les données : rien n'est codé en dur pour 2026.

## Structure

- `index.html` : interface et graphique ; il ne contient plus toutes les données en dur.
- `data/2024.json`, `data/2025.json` : données historiques déjà converties.
- `data/manifest.json` : années visibles dans le sélecteur.
- `sources/<année>/*.xlsx` : nouveaux fichiers Excel à convertir.
- `scripts/build_data.py` : convertisseur XLSX -> JSON.
- `scripts/build_site.py` : construit le dossier `dist/` servi par Vercel.
- `vercel.json` : demande à Vercel d'exécuter automatiquement le convertisseur à chaque déploiement.

## Ajouter un tour 2026

1. Dans GitHub, ouvrir `sources/2026/`.
2. Cliquer sur `Add file` -> `Upload files`.
3. Déposer par exemple `Tour 1.xlsx`.
4. Faire `Commit changes` sur la branche de production (`main` dans la plupart des dépôts).
5. Vercel détecte le nouveau commit et lance le build.
6. Pendant le build, `scripts/build_data.py` lit tous les `.xlsx` de `sources/2026/`, crée `data/2026.json` dans le build et ajoute 2026 au manifeste.
7. Le même lien Vercel affiche alors 2026 et tous les tours actuellement présents.

Pour le tour suivant, ajouter simplement `Tour 2.xlsx` dans le même dossier. Aucune modification du HTML n'est nécessaire.

## Noms de fichiers acceptés

- `Tour 1.xlsx`
- `Tour 2.xlsx`
- `Tour 12.xlsx`
- `Tour Def.xlsx`
- `Tour Définitif.xlsx`
- `Tour 3 2026.xlsx` fonctionne également ; l'année est déterminée par le dossier `sources/2026/`.

## Test local facultatif

```bash
python3 -m pip install -r requirements.txt
python3 scripts/build_site.py
python3 -m http.server 8000 -d dist
```

Puis ouvrir `http://localhost:8000`.
