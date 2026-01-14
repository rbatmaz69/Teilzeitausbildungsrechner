"""
Tests für logging_config.py
- Testet die Initialisierung und Konfiguration des Loggers
"""
import pytest
from src.logging_config import configure_logging
import logging

def test_configure_logging_runs_without_error():
    """configure_logging kann ohne Fehler aufgerufen werden."""
    configure_logging()
    logger = logging.getLogger("src.app")
    assert logger is not None
    assert logger.level in (logging.INFO, logging.WARNING, logging.ERROR, logging.DEBUG)
