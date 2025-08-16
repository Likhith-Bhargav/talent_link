from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, JSONParser
from django.shortcuts import get_object_or_404
from ..models import Company, JobPosting, User
from ..serializers import CompanySerializer, JobPostingSerializer

class CompanyViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows companies to be viewed or edited.
    """
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, JSONParser]

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        elif self.action == 'create':
            # Allow any authenticated user to create a company
            permission_classes = [permissions.IsAuthenticated]
        else:
            # Only admin users can update/delete companies
            permission_classes = [permissions.IsAdminUser]
        return [permission() for permission in permission_classes]
    
    def get_serializer_context(self):
        """
        Extra context provided to the serializer class.
        """
        context = super().get_serializer_context()
        context.update({
            'request': self.request
        })
        return context
    
    def create(self, request, *args, **kwargs):
        """
        Handle company creation with file upload.
        """
        try:
            # Get the request data
            data = request.data.dict() if hasattr(request.data, 'dict') else request.data.copy()
            
            # If logo is being uploaded as a file, it will be in request.FILES
            if 'logo' in request.FILES:
                data['logo'] = request.FILES['logo']
            
            # Log the incoming data for debugging
            print("Incoming data:", data)
            
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            company = serializer.save()
            
            # Add the current user to the company's users
            if request.user.is_authenticated:
                company.users.add(request.user)
            
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
            
        except Exception as e:
            print(f"Error in company creation: {str(e)}")
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
    def perform_create(self, serializer):
        """
        Save the company and associate it with the current user.
        """
        company = serializer.save()
        
        # Add the current user to the company's users
        if self.request.user.is_authenticated:
            company.users.add(self.request.user)
            
        return company

    @action(detail=True, methods=['get'])
    def job_postings(self, request, pk=None):
        """
        Returns all job postings for a specific company.
        """
        company = self.get_object()
        job_postings = company.job_postings.all()
        serializer = JobPostingSerializer(job_postings, many=True, context={'request': request})
        return Response(serializer.data)
