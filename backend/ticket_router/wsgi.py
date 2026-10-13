"""
WSGI config for ticket_router project.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ticket_router.settings')
application = get_wsgi_application()
