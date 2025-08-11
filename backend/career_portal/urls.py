from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompanyViewSet, JobPostingViewSet, JobApplicationViewSet
from .views.auth_views import RegisterView, LoginView, LogoutView
from .views.csrf_views import get_csrf_token
from .views.user_views import CurrentUserView, UserView

router = DefaultRouter()
router.register(r'companies', CompanyViewSet)
router.register(r'job-postings', JobPostingViewSet, basename='jobposting')
router.register(r'job-applications', JobApplicationViewSet, basename='jobapplication')

# Authentication URLs
auth_patterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('register/', RegisterView.as_view(), name='register'),
    path('user/', CurrentUserView.as_view(), name='current-user'),
    path('user/<int:user_id>/', UserView.as_view(), name='user-detail'),
    path('csrf/', get_csrf_token, name='get-csrf-token'),
]

urlpatterns = [
    # API routes
    path('', include(router.urls)),
    
    # Custom job applicants endpoint
    path('job-applications/job-applicants/<int:job_id>/', 
         JobApplicationViewSet.as_view({'get': 'job_applicants'}), 
         name='job-applicants'),
    
    # Authentication
    path('auth/', include(auth_patterns)),
    
    # Include DRF's auth URLs for browsable API login/logout
    path('api-auth/', include('rest_framework.urls')),
]