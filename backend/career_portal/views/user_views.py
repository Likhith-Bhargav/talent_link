from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.generics import RetrieveAPIView
from django.shortcuts import get_object_or_404

User = get_user_model()

class CurrentUserView(APIView):
    """
    View to return the currently authenticated user's data
    """
    authentication_classes = [SessionAuthentication, TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'user_type': getattr(user, 'user_type', 'candidate'),
            'is_employer': getattr(user, 'user_type', '') == 'employer',
            'is_candidate': getattr(user, 'user_type', 'candidate') in ['candidate', 'job_seeker'],
            'is_superuser': user.is_superuser,
        })


class UserView(RetrieveAPIView):
    """
    View to retrieve user data by ID (for public profiles)
    """
    permission_classes = [AllowAny]
    queryset = User.objects.all()
    lookup_field = 'id'
    lookup_url_kwarg = 'user_id'
    
    def get_serializer_class(self):
        from .serializers import UserSerializer
        return UserSerializer
    
    def get_object(self):
        user_id = self.kwargs.get('user_id')
        if user_id == 'me':
            if self.request.user.is_authenticated:
                return self.request.user
            raise User.DoesNotExist("User is not authenticated")
        return get_object_or_404(User, id=user_id)
    
    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found or not authenticated'}, 
                status=status.HTTP_404_NOT_FOUND
            )
