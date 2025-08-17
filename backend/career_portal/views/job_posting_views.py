from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.utils import timezone
from django.db import models
from django.db.models import Q
from ..models import JobPosting, Company, RecruiterCompany
from ..serializers import JobPostingSerializer

class IsCompanyUser(permissions.BasePermission):
    """
    Permission class to check if the user is an employer or company user
    """
    def has_permission(self, request, view):
        return hasattr(request.user, 'user_type') and request.user.user_type in ['employer', 'company']

class IsCompanyOwner(permissions.BasePermission):
    """
    Permission class to check if the user owns the company
    """
    def has_object_permission(self, request, view, obj):
        return obj.company == request.user.company

class JobPostingViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows job postings to be viewed or edited.
    """
    queryset = JobPosting.objects.all()
    serializer_class = JobPostingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'], url_path='my-company-jobs')
    def my_company_jobs(self, request):
        """
        Custom endpoint to get all job postings for the current user's company.
        Only accessible to company/employer users.
        """
        if not hasattr(request.user, 'user_type') or request.user.user_type not in ['employer', 'company']:
            raise PermissionDenied("Only company/employer users can access this endpoint.")
            
        # Get the company IDs the user is associated with
        company_ids = []
        
        # Get direct company associations
        direct_companies = list(request.user.companies.all())
        company_ids.extend([c.id for c in direct_companies])
        
        # Get companies through recruiter relationship
        recruiter_companies = list(RecruiterCompany.objects.filter(
            user=request.user
        ).values_list('company_id', flat=True))
        company_ids.extend(recruiter_companies)
        
        # Remove duplicates and ensure we have valid IDs
        company_ids = list(set([cid for cid in company_ids if cid is not None]))
        
        if not company_ids:
            return Response([], status=status.HTTP_200_OK)
            
        print(f"DEBUG - Fetching jobs for company IDs: {company_ids}")
        
        # Get job postings for the user's companies with related data
        queryset = JobPosting.objects.filter(
            company_id__in=company_ids,
            posted_by=request.user  # Only include jobs posted by the current user
        ).select_related('company', 'posted_by')
        
        # Add applicant count to each job
        from django.db.models import Count
        queryset = queryset.annotate(
            applicant_count=Count('applications', distinct=True)
        )
        
        # Apply additional filters if provided
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        # Order by most recent first
        queryset = queryset.order_by('-created_at')
        
        # Paginate the results
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def get_queryset(self):
        """
        Restrict the returned postings based on user type:
        - Company/employer users see only their company's postings
        - Admin users can see all postings, optionally filtered by company_id
        - Regular users see all active postings
        - Unauthenticated users see all active postings (handled by permissions)
        """
        print("\n=== DEBUG: get_queryset ===")
        print(f"Request user: {getattr(self.request.user, 'email', 'Anonymous')}")
        print(f"User type: {getattr(self.request.user, 'user_type', 'N/A')}")
        print(f"Request query params: {self.request.query_params}")
        
        queryset = JobPosting.objects.all()
        
        # Apply company filter if company is provided in query params (works for all user types)
        company_id = self.request.query_params.get('company')
        if company_id:
            queryset = queryset.filter(company_id=company_id)
            print(f"Filtering jobs by company ID: {company_id}")
        # For company/employer users, only show their company's postings if no specific company filter is set
        elif hasattr(self.request.user, 'user_type') and self.request.user.user_type in ['employer', 'company']:
            # Get direct company associations
            direct_companies = list(self.request.user.companies.all())
            
            # Get companies through recruiter relationship
            recruiter_companies = list(RecruiterCompany.objects.filter(
                user=self.request.user
            ).values_list('company', flat=True))
            
            # Combine and deduplicate company IDs
            company_ids = list(set(
                [c.id for c in direct_companies] + 
                list(recruiter_companies)
            ))
            
            if company_ids:
                queryset = queryset.filter(company_id__in=company_ids)
                print(f"DEBUG - Filtering jobs by user's company IDs: {company_ids}")
            else:
                # If user has no company, return empty queryset
                print("DEBUG - No companies found for user")
                return queryset.none()
                
        # For admin users, allow filtering by company_id if provided (legacy support)
        elif self.request.user.is_staff:
            company_id = self.request.query_params.get('company_id')
            if company_id is not None:
                print(f"Admin filtering by company_id: {company_id}")
                queryset = queryset.filter(company_id=company_id)
        
        # For regular users, only show active and non-expired postings
        else:
            queryset = queryset.filter(
                is_active=True,
                application_deadline__gte=timezone.now().date()
            )
            
            # Apply additional filters if provided
            job_type = self.request.query_params.get('job_type')
            if job_type:
                queryset = queryset.filter(job_type=job_type)
                
            search = self.request.query_params.get('search')
            if search:
                queryset = queryset.filter(
                    models.Q(title__icontains=search) |
                    models.Q(description__icontains=search) |
                    models.Q(requirements__icontains=search) |
                    models.Q(location__icontains=search)
                )
                
            location = self.request.query_params.get('location')
            if location:
                queryset = queryset.filter(location__icontains=location)
                
            experience = self.request.query_params.get('experience')
            if experience:
                queryset = queryset.filter(experience__icontains=experience)
        
        # Order by most recent first
        queryset = queryset.order_by('-created_at')
        print(f"Final queryset SQL: {str(queryset.query)}")
        return queryset

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        elif self.action == 'create':
            permission_classes = [permissions.IsAuthenticated, IsCompanyUser]
        elif self.action in ['update', 'partial_update', 'destroy', 'toggle_active']:
            permission_classes = [permissions.IsAuthenticated, IsCompanyOwner | permissions.IsAdminUser]
        else:
            permission_classes = [permissions.IsAuthenticated]
            
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        """
        Automatically set the posted_by field to the current user
        and ensure the company is the user's company
        """
        user = self.request.user
        if not hasattr(user, 'user_type') or user.user_type not in ['employer', 'company']:
            raise PermissionDenied("You don't have permission to create job postings. Only employers can post jobs.")

        try:
            # Debug information
            print(f"\n{'='*50}")
            print(f"DEBUG - User: {user.id} - {user.email}")
            print(f"DEBUG - User type: {getattr(user, 'user_type', 'not set')}")
            
            # 1. First try to get companies through the recruiter_companies relationship
            recruiter_companies = RecruiterCompany.objects.filter(user=user).select_related('company')
            user_companies = [rc.company for rc in recruiter_companies]
            print(f"DEBUG - Recruiter companies: {[c.id for c in user_companies]}")
            
            if not user_companies:
                # 2. Try the standard companies relationship
                user_companies = list(user.companies.all())
                print(f"DEBUG - Standard companies: {[c.id for c in user_companies]}")
                
                if not user_companies:
                    # 3. Try the reverse relationship
                    user_companies = list(Company.objects.filter(users=user))
                    print(f"DEBUG - Reverse companies: {[c.id for c in user_companies]}")
            
            if not user_companies:
                raise ValidationError(
                    "You are not associated with any company. "
                    "Please contact an administrator to be added to a company."
                )
            
            # Get the first company (in a real app, you might want to let the user choose)
            company = user_companies[0]
            print(f"DEBUG - Using company: {company.id} - {company.name}")
            
            # Set the posted_by and company fields
            serializer.save(
                posted_by=user,
                company=company
            )
            
            print(f"DEBUG - Successfully created job with company: {company.id}")
            print("="*50 + "\n")
            
        except Exception as e:
            import traceback
            error_msg = f"Error in perform_create: {str(e)}\n{traceback.format_exc()}"
            print("\n" + "="*50)
            print("ERROR DETAILS:")
            print(error_msg)
            print("="*50 + "\n")
            if isinstance(e, ValidationError):
                raise e
            raise ValidationError("An error occurred while creating the job posting. Please try again.")

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """
        Toggle the is_active status of a job posting.
        Only the company owner or admin can do this.
        """
        job_posting = self.get_object()
        job_posting.is_active = not job_posting.is_active
        job_posting.save()
        serializer = self.get_serializer(job_posting)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        """
        Apply for a job posting.
        """
        from ..models import JobApplication
        from ..serializers import JobApplicationSerializer
        import traceback
        
        try:
            # Debug: Print request data
            print("\n" + "="*50)
            print("APPLY REQUEST DEBUG:")
            print(f"Request method: {request.method}")
            print(f"Request content type: {request.content_type}")
            print(f"Request data: {request.data}")
            print(f"Request FILES: {request.FILES}")
            print(f"Request user: {request.user}")
            print("="*50 + "\n")
            
            job_posting = self.get_object()
            
            # Check if user has already applied
            if JobApplication.objects.filter(
                job_posting=job_posting, 
                applicant=request.user
            ).exists():
                return Response(
                    {"detail": "You have already applied to this job."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update user profile with provided information
            user = request.user
            if request.data.get('full_name'):
                # Split full name into first and last name
                name_parts = request.data.get('full_name').strip().split(' ', 1)
                if len(name_parts) >= 2:
                    user.first_name = name_parts[0]
                    user.last_name = name_parts[1]
                else:
                    user.first_name = name_parts[0]
                    user.last_name = ''
            
            if request.data.get('email'):
                user.email = request.data.get('email')
            
            # Update phone number if provided
            if request.data.get('phone'):
                user.phone_number = request.data.get('phone')
            
            # Save user changes
            user.save()
            
            # Create the application
            application_data = {
                'job_posting': job_posting.id,
                'resume': request.FILES.get('resume'),
                'cover_letter': request.data.get('cover_letter', ''),
                'skills': request.data.get('skills', ''),
            }
            
            # Add context for serializer
            serializer = JobApplicationSerializer(data=application_data, context={'request': request})
            if serializer.is_valid():
                serializer.save(applicant=request.user)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            import traceback
            error_msg = f"Error in apply action: {str(e)}\n{traceback.format_exc()}"
            print("\n" + "="*50)
            print("APPLY ACTION ERROR:")
            print(error_msg)
            print("="*50 + "\n")
            return Response(
                {"detail": f"Internal server error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
