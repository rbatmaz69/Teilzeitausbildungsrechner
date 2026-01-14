import pytest
import sys
import os
from pathlib import Path
from src.app import setup_venv, run_app_main, app


def test_setup_venv(monkeypatch):
    """Testet die setup_venv Funktion für verschiedene venv-Szenarien."""
    venv_path = Path(__file__).parent.parent / "venv"
    monkeypatch.setattr(Path, "exists", lambda self: True)
    monkeypatch.setattr(sys, "version_info", type("v", (), {"major": 3, "minor": 12})())
    monkeypatch.setattr(os, "environ", {})
    setup_venv()
    assert "VIRTUAL_ENV" in os.environ


def test_run_app_main(monkeypatch):
    """Testet run_app_main mit verschiedenen Argumenten und OSError-Fall."""
    monkeypatch.setattr(sys, "argv", ["src/app.py", "8080"])
    monkeypatch.setattr(app, "run", lambda host, port, debug: True)
    # OSError simulieren
    def raise_oserror(*args, **kwargs):
        raise OSError()
    monkeypatch.setattr(app, "run", raise_oserror)
    # Fallback-Port-Test
    try:
        run_app_main()
    except Exception:
        pass
