"""
WSGI-Entry-Point für Production-Server

Diese Datei ist Teil von User Story 31 und ermöglicht das Deployment
der Flask-App mit WSGI-Servern wie Gunicorn, uWSGI oder mod_wsgi.

WSGI (Web Server Gateway Interface) ist der Standard für Python-Web-Apps.

Verwendung:
    gunicorn 'wsgi:app' --bind 0.0.0.0:8000 --workers 2
    
Oder in Docker:
    CMD ["gunicorn", "wsgi:app", "--bind", "0.0.0.0:8000", "--workers", "2"]
"""

from src.app import create_app

# App-Instanz erstellen - wird vom WSGI-Server importiert
# Der WSGI-Server sucht nach einer Variable namens "app"
app = create_app()

# Für WSGI-Server wie gunicorn:
# gunicorn 'wsgi:app'

