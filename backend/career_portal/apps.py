from django.apps import AppConfig


class CareerPortalConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'career_portal'
    
    def ready(self):
        # Import models to ensure they're registered with Django
        from .models import User  # noqa
