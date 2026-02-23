import os

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'adminpanel.settings')

app = Celery('adminpanel')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
