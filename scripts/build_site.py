#!/usr/bin/env python3
"""Construit le dossier statique `dist/` destiné à Vercel."""
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"

subprocess.run([sys.executable, str(ROOT / "scripts" / "build_data.py")], check=True)

if DIST.exists():
    shutil.rmtree(DIST)
DIST.mkdir(parents=True)

# Publie automatiquement toutes les pages HTML à la racine du projet.
for page in ROOT.glob("*.html"):
    shutil.copy2(page, DIST / page.name)

# Publie les feuilles de style partagées (ex. theme.css).
for stylesheet in ROOT.glob("*.css"):
    shutil.copy2(stylesheet, DIST / stylesheet.name)

shutil.copytree(ROOT / "data", DIST / "data")
print(f"Site construit dans {DIST.relative_to(ROOT)}/")
