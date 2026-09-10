#!/usr/bin/env python3
"""Point d'entrée robuste pour les imports EDN.

Accepte deux onglets d'un même classeur qui se normalisent vers la même
spécialité uniquement lorsque les données réellement publiées par le site sont
strictement identiques. Les doublons contradictoires restent des erreurs de build.
"""
from __future__ import annotations

from collections import OrderedDict
from typing import Any

from openpyxl import load_workbook

import build_data as core


def published_signature(rows: list[dict[str, Any]]) -> tuple[tuple[str, int | None, str], ...]:
    """Signature des seules valeurs effectivement utilisées par le site."""
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
                    if sheet_signatures[parsed_specialty] == signature:
                        print(
                            f"[{path.name}] doublon d'onglet équivalent ignoré : "
                            f"{sheet_names[parsed_specialty]!r} / {sheet_name!r} -> {parsed_specialty}"
                        )
                        continue
                    raise ValueError(
                        f"{path.name} : deux onglets contradictoires correspondent à la spécialité "
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
