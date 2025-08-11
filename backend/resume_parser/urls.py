from django.urls import path
from . import views

urlpatterns = [
    path('parse/', views.parse_resume, name='parse_resume'),
]
