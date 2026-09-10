#!/usr/bin/env python3
"""Point d'entrée robuste pour les imports EDN.

Accepte deux onglets d'un même classeur qui se normalisent vers la même
spécialité uniquement lorsque leur contenu de cellules est strictement identique.
Les doublons contradictoires restent des erreurs de build.
"""
from __future__ import annotations

from collections import OrderedDict
from typing import Any

from openpyxl import load_workbook

import build_data as core


def normalized_matrix(rows: list[list[Any]]) -> tuple[tuple[str, ...], ...]:
    """Signature stable des valeurs d'une feuille, hors lignes/colonnes vides finales."""
    normalized: list[list[str]] = []
    max_nonempty = -1
    for row in rows:
        current = ["" if value is None else str(value).strip() for value in row]
        while current and current[-1] == "":
            current.pop()
        if current:
            max_nonempty = max(max_nonempty, len(current) - 1)
            normalized.append(current)
    if max_nonempty < 0:
        return tuple()
    width = max_nonempty + 1
    return tuple(tuple(row + [""] * (width - len(row))) for row in normalized)


def parse_xlsx_compat(path):
    wb = load_workbook(path, read_only=True, data_only=True)
    result: "OrderedDict[str, list[dict[str, Any]]]" = OrderedDict()
    sheet_signatures: dict[str, tuple[tuple[str, ...], ...]] = {}
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
            signature = normalized_matrix(raw_rows)

            for parsed_specialty, rows in parsed.items():
                if parsed_specialty in result:
                    if sheet_signatures[parsed_specialty] == signature:
                        print(
                            f"[{path.name}] doublon d'onglet strictement identique ignoré : "
                            f"{sheet_names[parsed_specialty]!r} / {sheet_name!r} -> {parsed_specialty}"
                        )
                        continue
                    raise ValueError(
                        f"{path.name} : deux onglets différents correspondent à la spécialité "
                        f"{parsed_specialty!r} ({sheet_names[parsed_specialty]!r} et {sheet_name!r})."
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
