#!/usr/bin/env python3
"""Convertit les fichiers XLSX déposés dans sources/<année>/ en data/<année>.json.

Convention recommandée :
  sources/2026/Tour 1.xlsx
  sources/2026/Tour 2.xlsx
  ...
  sources/2026/Tour Def.xlsx

Le script reconstruit uniquement les années qui possèdent un dossier source avec au
moins un .xlsx. Les JSON des autres années déjà présents dans data/ sont conservés.
"""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path
from typing import Any

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "sources"
DATA_DIR = ROOT / "data"

SPECIALTIES = [
    "Allergologie", "Anatomie et cytologie pathologiques", "Anesthésie-réanimation",
    "Biologie médicale", "Chirurgie maxillo-faciale", "Chirurgie orale",
    "Chirurgie orthopédique et traumatologique", "Chirurgie plastique, reconstructrice et esthétique",
    "Chirurgie pédiatrique", "Chirurgie thoracique et cardiovasculaire", "Chirurgie vasculaire",
    "Chirurgie viscérale et digestive", "Dermatologie et vénéréologie",
    "Endocrinologie-diabétologie-nutrition", "Gynécologie médicale", "Gynécologie obstétrique",
    "Génétique médicale", "Gériatrie", "Hématologie", "Hépato-gastro-entérologie",
    "Maladies infectieuses et tropicales", "Médecine cardiovasculaire", "Médecine d’urgence",
    "Médecine et santé au travail", "Médecine générale", "Médecine intensive-réanimation",
    "Médecine interne et immunologie clinique", "Médecine légale et expertises médicales",
    "Médecine nucléaire", "Médecine physique et de réadaptation", "Médecine vasculaire",
    "Neurochirurgie", "Neurologie", "Néphrologie", "Oncologie", "Ophtalmologie",
    "Oto-rhino-laryngologie - chirurgie cervico-faciale", "Pneumologie", "Psychiatrie", "Pédiatrie",
    "Radiologie et imagerie médicale", "Rhumatologie", "Santé publique", "Urologie",
]


def norm(value: Any) -> str:
    s = "" if value is None else str(value)
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", s).strip().lower()


def tour_from_filename(path: Path) -> tuple[str, int]:
    name = norm(path.stem)
    if re.search(r"\b(def|definitif|final)\b", name):
        return "Définitif", 10_000
    m = re.search(r"\btour\s*[-_ ]*(\d+)\b", name)
    if not m:
        raise ValueError(f"Nom de fichier non reconnu : {path.name}. Utilisez par ex. 'Tour 3.xlsx' ou 'Tour Def.xlsx'.")
    n = int(m.group(1))
    return f"Tour {n}", n


def as_int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return int(value)
    s = str(value).strip().replace(" ", "").replace(",", ".")
    try:
        return int(float(s))
    except ValueError as exc:
        raise ValueError(f"Rang max non numérique : {value!r}") from exc


def identify_columns(headers: list[Any], filename: str, sheet: str) -> tuple[int, int | None, int]:
    nh = [norm(h) for h in headers]
    city = next((i for i, h in enumerate(nh) if "ville" in h or "subdivision" in h), None)
    ranks = next((i for i, h in enumerate(nh) if "rangs limites" in h or "rang limite" in h), None)
    rmax = next((i for i, h in enumerate(nh) if h == "rang max" or ("rang" in h and "max" in h)), None)
    if city is None or rmax is None:
        raise ValueError(f"Colonnes attendues introuvables dans {filename} / {sheet}. En-têtes : {headers}")
    return city, ranks, rmax


def parse_workbook(path: Path) -> dict[str, list[dict[str, Any]]]:
    wb = load_workbook(path, read_only=True, data_only=True)
    if len(wb.sheetnames) != len(SPECIALTIES):
        raise ValueError(f"{path.name} contient {len(wb.sheetnames)} onglets ; {len(SPECIALTIES)} attendus.")
    result: dict[str, list[dict[str, Any]]] = {}
    for idx, specialty in enumerate(SPECIALTIES):
        ws = wb[wb.sheetnames[idx]]
        rows = ws.iter_rows(values_only=True)
        headers = list(next(rows))
        city_col, ranks_col, max_col = identify_columns(headers, path.name, ws.title)
        parsed = []
        for row in rows:
            row = list(row)
            city = row[city_col] if city_col < len(row) else None
            if city is None or not str(city).strip():
                continue
            ranks = row[ranks_col] if ranks_col is not None and ranks_col < len(row) else None
            rmax = row[max_col] if max_col < len(row) else None
            parsed.append({
                "city": str(city).strip(),
                "max": as_int(rmax),
                "ranks": "" if ranks is None else str(ranks).strip(),
            })
        result[specialty] = parsed
    wb.close()
    return result


def build_year(year_dir: Path) -> int:
    year = int(year_dir.name)
    xlsx = [p for p in year_dir.glob("*.xlsx") if not p.name.startswith("~$")]
    if not xlsx:
        return 0
    labelled = []
    seen = set()
    for path in xlsx:
        label, order = tour_from_filename(path)
        if label in seen:
            raise ValueError(f"Deux fichiers correspondent à {label} dans {year_dir}.")
        seen.add(label)
        labelled.append((order, label, path))
    labelled.sort(key=lambda x: x[0])

    specialties = {s: {} for s in SPECIALTIES}
    city_set = set()
    tours = []
    for _, label, path in labelled:
        print(f"[{year}] {label} <- {path.name}")
        parsed = parse_workbook(path)
        tours.append(label)
        for specialty in SPECIALTIES:
            specialties[specialty][label] = parsed[specialty]
            city_set.update(r["city"] for r in parsed[specialty])

    payload = {
        "year": year,
        "tours": tours,
        "specialty_order": SPECIALTIES,
        "city_order": sorted(city_set),
        "specialties": specialties,
    }
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    target = DATA_DIR / f"{year}.json"
    target.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Écrit : {target.relative_to(ROOT)} ({len(tours)} étapes)")
    return len(tours)


def update_manifest() -> None:
    years = sorted(int(p.stem) for p in DATA_DIR.glob("*.json") if p.stem.isdigit())
    (DATA_DIR / "manifest.json").write_text(
        json.dumps({"years": years}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print("Années publiées :", ", ".join(map(str, years)))


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if SOURCES.exists():
        for year_dir in sorted((p for p in SOURCES.iterdir() if p.is_dir() and p.name.isdigit()), key=lambda p: int(p.name)):
            build_year(year_dir)
    update_manifest()


if __name__ == "__main__":
    main()
