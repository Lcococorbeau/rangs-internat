#!/usr/bin/env python3
"""Construit le dossier statique `dist/` destiné à Vercel."""
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
LEGAL_FOOTER = ROOT / "_legal-footer.html"
BRAND_SIGNATURE = ROOT / "_brand-signature.html"
BRAND_MARKER = '<a class="brand" href="./">Rangs Internat</a>'

subprocess.run([sys.executable, str(ROOT / "scripts" / "build_data.py")], check=True)

if DIST.exists():
    shutil.rmtree(DIST)
DIST.mkdir(parents=True)

legal_footer = LEGAL_FOOTER.read_text(encoding="utf-8") if LEGAL_FOOTER.exists() else ""
brand_signature = BRAND_SIGNATURE.read_text(encoding="utf-8").strip() if BRAND_SIGNATURE.exists() else ""

# Publie automatiquement toutes les pages HTML à la racine du projet.
# Les fichiers commençant par "_" sont des fragments internes et ne deviennent pas des pages publiques.
for page in ROOT.glob("*.html"):
    if page.name.startswith("_"):
        continue
    html = page.read_text(encoding="utf-8")
    if brand_signature and BRAND_MARKER in html:
        html = html.replace(BRAND_MARKER, brand_signature, 1)
    if legal_footer and "</main>" in html:
        html = html.replace("</main>", f"{legal_footer}\n</main>", 1)
    (DIST / page.name).write_text(html, encoding="utf-8")

# Publie les feuilles de style partagées (ex. theme.css).
for stylesheet in ROOT.glob("*.css"):
    shutil.copy2(stylesheet, DIST / stylesheet.name)

shutil.copytree(ROOT / "data", DIST / "data")
print(f"Site construit dans {DIST.relative_to(ROOT)}/")
