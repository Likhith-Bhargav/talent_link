from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from django.contrib.auth import get_user_model, authenticate, login as auth_login, logout as auth_logout
from django.db import IntegrityError
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
import json

User = get_user_model()

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password1')
        password2 = request.data.get('password2')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        user_type = request.data.get('user_type', 'candidate')

        errors = {}
        # Basic validation
        if not username:
            errors['username'] = 'Username is required.'
        if not email:
            errors['email'] = 'Email is required.'
        if not password:
            errors['password1'] = 'Password is required.'
        if not password2:
            errors['password2'] = 'Password confirmation is required.'
        if password and password2 and password != password2:
            errors['password2'] = 'Passwords do not match.'
        if password and len(password) < 8:
            errors['password1'] = 'Password must be at least 8 characters long.'
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.create_user(
                email=email,
                username=username,
                password=password,
                first_name=first_name,
                last_name=last_name,
                user_type=user_type
            )
            return Response(
                {'success': 'User created successfully'},
                status=status.HTTP_201_CREATED
            )
        except IntegrityError:
            return Response(
                {'username': 'A user with that username or email already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [SessionAuthentication, TokenAuthentication]
    
    @method_decorator(ensure_csrf_cookie)
    def get(self, request, *args, **kwargs):
        # This endpoint is used to get CSRF token
        return Response({'detail': 'CSRF cookie set'})

    def post(self, request):
        import logging
        logger = logging.getLogger(__name__)
        
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        
        logger.info(f"Login attempt for username: {username} or email: {email}")
        
        if not (username or email) or not password:
            logger.warning("Missing username/email or password in request")
            return Response(
                {'error': 'Please provide username/email and password'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find user by username or email
        user = None
        if username:
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                pass
        if not user and email:
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                pass
        
        if user is not None and user.check_password(password):
            if user.is_active:
                # Log the user in (creates session)
                auth_login(request, user)
                
                # Get or create token
                token, created = Token.objects.get_or_create(user=user)
                
                # Get user data
                user_data = {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'user_type': getattr(user, 'user_type', 'candidate'),
                }
                
                # Create response
                response = Response({
                    'user': user_data,
                    'token': token.key
                })
                
                # Set CSRF token in cookie (accessible to JavaScript)
                response.set_cookie(
                    'csrftoken',
                    get_token(request),
                    httponly=False,
                    samesite='Lax',
                    secure=request.is_secure()
                )
                
                # Set session cookie (HTTP-only for security)
                response.set_cookie(
                    'sessionid',
                    request.session.session_key,
                    httponly=True,
                    samesite='Lax',
                    secure=request.is_secure()
                )
                
                return response
            else:
                return Response(
                    {'non_field_errors': ['This account is disabled']},
                    status=status.HTTP_403_FORBIDDEN
                )
        else:
            return Response(
                {'non_field_errors': ['Invalid username/email or password']},
                status=status.HTTP_401_UNAUTHORIZED
            )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionAuthentication, TokenAuthentication]
    
    def post(self, request):
        try:
            # Delete the token if it exists
            try:
                if hasattr(request.user, 'auth_token'):
                    request.user.auth_token.delete()
            except (AttributeError, Token.DoesNotExist):
                pass
            
            # Log the user out (clears the session)
            auth_logout(request)
            
            # Create response
            response = Response(
                {'detail': 'Successfully logged out'},
                status=status.HTTP_200_OK
            )
            
            # Clear cookies
            response.delete_cookie('sessionid')
            response.delete_cookie('csrftoken')
            
            return response
            
        except Exception as e:
            # Even if there's an error, we want to clear the auth state
            response = Response(
                {'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            response.delete_cookie('sessionid')
            response.delete_cookie('csrftoken')
            return response
