from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from ..models import RecruiterCompany, User, Company
from ..serializers import RecruiterCompanySerializer

class RecruiterCompanyView(APIView):
    """
    API View for creating and listing recruiter-company mappings.
    - GET: Any authenticated user can view their own mappings
    - POST: Only admin users can create new mappings
    """
    # Default permission for all methods
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.request.method == 'POST':
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    def post(self, request, *args, **kwargs):
        """
        Create a new recruiter-company mapping.
        Required fields: recruiter_id, company_id
        """
        print("Received request data:", request.data)  # Debug log
        
        serializer = RecruiterCompanySerializer(data=request.data)
        if not serializer.is_valid():
            print("Serializer errors:", serializer.errors)  # Debug log
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        # Check if the user exists and is of type 'employer'
        user_id = request.data.get('user')
        company_id = request.data.get('company')
        
        if not user_id:
            error_msg = "User ID is required"
            print(error_msg)
            return Response(
                {"error": error_msg}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        print(f"Looking for user with id={user_id} and user_type='employer'")
        try:
            user = User.objects.get(id=user_id, user_type='employer')
            print(f"Found user: {user}")
        except User.DoesNotExist:
            error_msg = f"User with id={user_id} not found or is not an employer"
            print(error_msg)
            return Response(
                {"error": error_msg}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        print(f"Looking for company with id={company_id}")
        try:
            company = Company.objects.get(id=company_id)
            print(f"Found company: {company}")
        except Company.DoesNotExist:
            error_msg = f"Company with id={company_id} not found"
            print(error_msg)
            return Response(
                {"error": error_msg}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        # Check if mapping already exists
        if RecruiterCompany.objects.filter(user=user, company=company).exists():
            error_msg = f"Mapping already exists for user {user_id} and company {company_id}"
            print(error_msg)
            return Response(
                {"error": error_msg},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Create the mapping
        print(f"Creating mapping for user {user_id} and company {company_id}")
        try:
            mapping = RecruiterCompany.objects.create(
                user=user,
                company=company
            )
            print(f"Mapping created successfully: {mapping}")
            
            return Response(
                RecruiterCompanySerializer(mapping).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            error_msg = f"Error creating mapping: {str(e)}"
            print(error_msg)
            return Response(
                {"error": error_msg},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request, *args, **kwargs):
        """
        List recruiter-company mappings.
        - Admins can see all mappings
        - Recruiters can only see their own mappings
        - Can be filtered by recruiter_id or company_id using query parameters (admin only)
        """
        # If user is not an admin, only show their own mappings
        if not request.user.is_staff and not request.user.is_superuser:
            queryset = RecruiterCompany.objects.filter(user=request.user)
        else:
            queryset = RecruiterCompany.objects.all()
            
            # Filter by user_id if provided (admin only)
            user_id = request.query_params.get('user_id')
            if user_id:
                queryset = queryset.filter(user_id=user_id)
            
            # Filter by company_id if provided (admin only)
            company_id = request.query_params.get('company_id')
            if company_id:
                queryset = queryset.filter(company_id=company_id)
        
        serializer = RecruiterCompanySerializer(queryset, many=True)
        return Response(serializer.data)


class RecruiterCompanyDetailView(APIView):
    """
    API View for retrieving and deleting specific recruiter-company mappings.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    
    def get(self, request, mapping_id, *args, **kwargs):
        """Get a specific recruiter-company mapping."""
        mapping = get_object_or_404(RecruiterCompany, id=mapping_id)
        serializer = RecruiterCompanySerializer(mapping)
        return Response(serializer.data)
    
    def delete(self, request, mapping_id, *args, **kwargs):
        """Delete a recruiter-company mapping."""
        mapping = get_object_or_404(RecruiterCompany, id=mapping_id)
        mapping.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
