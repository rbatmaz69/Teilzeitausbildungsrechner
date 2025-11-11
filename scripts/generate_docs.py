#!/usr/bin/env python3
"""
Hilfsskript zum Erzeugen einer Markdown-Dokumentation aus den Docstrings.

Das Skript wird aus dem Projektwurzelverzeichnis ausgeführt und erzeugt
standardmäßig `docs/api_reference.md`. Die Ausgabe basiert auf den Docstrings
der wichtigsten Python-Module (`src/calculation_logic.py`,
`src/api/calculation_service.py`, `src/app.py`).
"""

from __future__ import annotations

import argparse
import importlib
import inspect
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Sequence


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"


MODULES = (
    ("Berechnungslogik", "src.calculation_logic"),
    ("Service Layer", "src.api.calculation_service"),
    ("Flask App", "src.app"),
)


@dataclass
class Documentable:
    """Repräsentiert ein Element mit Docstring (Modul, Klasse, Funktion)."""

    name: str
    signature: str | None
    docstring: str | None
    kind: str


def ensure_src_on_path() -> None:
    """Stellt sicher, dass `src/` für Importlib erreichbar ist."""
    if str(PROJECT_ROOT) not in sys.path:
        sys.path.insert(0, str(PROJECT_ROOT))


def load_module(module_path: str):
    """Importiert ein Modul dynamisch und gibt es zurück."""
    return importlib.import_module(module_path)


def iter_public_symbols(module) -> Iterable[Documentable]:
    """Erzeugt Documentable-Objekte für alle öffentlichen Symbole eines Moduls."""
    module_name = module.__name__

    yield Documentable(
        name=module_name,
        signature=None,
        docstring=inspect.getdoc(module),
        kind="module",
    )

    def is_public(name: str) -> bool:
        return not name.startswith("_")

    for name, cls in inspect.getmembers(module, inspect.isclass):
        if cls.__module__ != module_name or not is_public(name):
            continue
        yield Documentable(
            name=name,
            signature=None,
            docstring=inspect.getdoc(cls),
            kind="class",
        )

    for name, func in inspect.getmembers(module, inspect.isfunction):
        if func.__module__ != module_name or not is_public(name):
            continue
        try:
            signature = str(inspect.signature(func))
        except ValueError:
            signature = "()"
        yield Documentable(
            name=name,
            signature=signature,
            docstring=inspect.getdoc(func),
            kind="function",
        )


def render_section(title: str, module) -> str:
    """Erstellt den Markdown-Abschnitt zu einem Modul."""
    parts: List[str] = []
    parts.append(f"## {title}")

    for documentable in iter_public_symbols(module):
        if documentable.kind == "module":
            if documentable.docstring:
                parts.append(documentable.docstring)
            continue

        heading = (
            f"### {documentable.name}{documentable.signature or ''}"
            if documentable.kind == "function"
            else f"### {documentable.name}"
        )
        parts.append(heading)
        parts.append("")
        if documentable.docstring:
            parts.append(documentable.docstring)
        else:
            parts.append("_Keine Dokumentation verfügbar._")
        parts.append("")

    return "\n".join(parts).rstrip()


def render_document(module_defs: Sequence[tuple[str, str]]) -> str:
    """Rendert die komplette Markdown-Dokumentation."""
    ensure_src_on_path()
    sections: List[str] = [
        "# API-Referenz",
        "",
        "Automatisch generiert aus den Docstrings der Python-Module.",
        "",
    ]

    for title, import_path in module_defs:
        module = load_module(import_path)
        sections.append(render_section(title, module))
        sections.append("")

    return "\n".join(sections).rstrip() + "\n"


def write_output(content: str, output_path: Path) -> None:
    """Schreibt den Markdown-Inhalt in die angegebene Datei."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(content, encoding="utf-8")


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generiert Markdown-Dokumentation aus Docstrings.",
    )
    parser.add_argument(
        "-o",
        "--output",
        default=str(PROJECT_ROOT / "docs" / "api_reference.md"),
        help="Pfad zur Ausgabedatei (Standard: docs/api_reference.md)",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> None:
    args = parse_args(argv)
    output_path = Path(args.output).resolve()
    content = render_document(MODULES)
    write_output(content, output_path)
    print(f"📄 Dokumentation gespeichert unter: {output_path}")


if __name__ == "__main__":
    main()

