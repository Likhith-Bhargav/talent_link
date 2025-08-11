"""
URL configuration for core project.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.contrib.staticfiles.views import serve
from django.views.decorators.cache import never_cache

# Serve React Frontend
index_view = never_cache(TemplateView.as_view(template_name='index.html'))

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # API Endpoints
    path('api/', include('career_portal.urls')),
    path('api/resume/', include('resume_parser.urls')),  # Resume parsing endpoints
    path('api/auth/', include(('rest_framework.urls', 'rest_framework'), namespace='rest_framework')),  # For browsable API login/logout
    path('api/auth/', include('dj_rest_auth.urls')),    # For JWT authentication
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),
    
    # Serve static files in development
    *static(settings.STATIC_URL, document_root=settings.STATIC_ROOT),
    
    # Serve media files in development
    *static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT),
    
    # Catch-all route for React Router (exclude API routes)
    re_path(r'^(?!api/).*', index_view, name='home'),
]
