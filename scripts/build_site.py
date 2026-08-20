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
shutil.copy2(ROOT / "index.html", DIST / "index.html")
shutil.copytree(ROOT / "data", DIST / "data")
print(f"Site construit dans {DIST.relative_to(ROOT)}/")
