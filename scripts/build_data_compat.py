#!/usr/bin/env python3
"""Point d'entrée robuste pour les imports EDN.

Gère les collisions de noms d'onglets sans masquer les erreurs de données :
- doublons publiés strictement identiques -> un seul est conservé ;
- si une variante typographique entre en conflit avec le nom canonique exact,
  le nom canonique exact est prioritaire ;
- toute autre collision contradictoire reste une erreur de build.
"""
from __future__ import annotations

from collections import OrderedDict
from typing import Any

from openpyxl import load_workbook

import build_data as core


def published_signature(rows: list[dict[str, Any]]) -> tuple[tuple[str, int | None, str], ...]:
    return tuple(
        (
            core.norm(row.get("city")),
            row.get("max"),
            str(row.get("ranks") or "").strip(),
        )
        for row in rows
    )


def parse_xlsx_compat(path):
    wb = load_workbook(path, read_only=True, data_only=True)
    result: "OrderedDict[str, list[dict[str, Any]]]" = OrderedDict()
    sheet_signatures: dict[str, tuple[tuple[str, int | None, str], ...]] = {}
    sheet_names: dict[str, str] = {}
    try:
        if not wb.sheetnames:
            raise ValueError(f"{path.name} : classeur sans onglet.")

        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            raw_rows = core.sheet_rows(ws)
            specialty = core.canonical_specialty(sheet_name)
            parsed = core.parse_rows(
                raw_rows,
                source=f"{path.name} / {sheet_name}",
                specialty_from_source=specialty,
            )

            for parsed_specialty, rows in parsed.items():
                signature = published_signature(rows)
                if parsed_specialty in result:
                    previous_name = sheet_names[parsed_specialty]
                    previous_signature = sheet_signatures[parsed_specialty]

                    if previous_signature == signature:
                        print(
                            f"[{path.name}] doublon d'onglet équivalent ignoré : "
                            f"{previous_name!r} / {sheet_name!r} -> {parsed_specialty}"
                        )
                        continue

                    previous_is_canonical = previous_name == parsed_specialty
                    current_is_canonical = sheet_name == parsed_specialty

                    if previous_is_canonical and not current_is_canonical:
                        print(
                            f"[{path.name}] variante contradictoire ignorée au profit du nom canonique : "
                            f"{sheet_name!r} -> {parsed_specialty}"
                        )
                        continue

                    if current_is_canonical and not previous_is_canonical:
                        print(
                            f"[{path.name}] nom canonique prioritaire : "
                            f"{sheet_name!r} remplace {previous_name!r} -> {parsed_specialty}"
                        )
                        result[parsed_specialty] = rows
                        sheet_signatures[parsed_specialty] = signature
                        sheet_names[parsed_specialty] = sheet_name
                        continue

                    raise ValueError(
                        f"{path.name} : deux onglets contradictoires correspondent à la spécialité "
                        f"{parsed_specialty!r} ({previous_name!r} et {sheet_name!r})."
                    )

                result[parsed_specialty] = rows
                sheet_signatures[parsed_specialty] = signature
                sheet_names[parsed_specialty] = sheet_name

        if not result:
            raise ValueError(f"{path.name} : aucune donnée exploitable.")
        return result
    finally:
        wb.close()


core.parse_xlsx = parse_xlsx_compat
core.main()
