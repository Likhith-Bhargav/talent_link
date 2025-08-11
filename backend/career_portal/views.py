from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Company, JobPosting, JobApplication
from .serializers import (
    CompanySerializer, JobPostingSerializer, JobApplicationSerializer
)
import tempfile
import os
from resume_parser.resume_parser import parse_resume_file

# Company Views
class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, JSONParser]

    def perform_create(self, serializer):
        serializer.save()

# Job Posting Views
class JobPostingViewSet(viewsets.ModelViewSet):
    serializer_class = JobPostingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        queryset = JobPosting.objects.select_related('company', 'posted_by').all()
        
        # Filter by company
        company_id = self.request.query_params.get('company_id')
        if company_id:
            queryset = queryset.filter(company_id=company_id)
            
        # Filter by job type
        job_type = self.request.query_params.get('job_type')
        if job_type:
            queryset = queryset.filter(job_type=job_type)
            
        # Filter by search query
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(requirements__icontains=search) |
                Q(location__icontains=search)
            )
            
        # Filter active jobs only (default)
        if self.request.query_params.get('active_only', 'true').lower() == 'true':
            queryset = queryset.filter(is_active=True)
            
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(posted_by=self.request.user)
        
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        job = self.get_object()
        if job.posted_by != request.user and not request.user.is_staff:
            return Response(
                {"detail": "You do not have permission to perform this action."},
                status=status.HTTP_403_FORBIDDEN
            )
        job.is_active = not job.is_active
        job.save()
        return Response({"is_active": job.is_active})

    @action(detail=False, methods=['get'], url_path='my-company-jobs', permission_classes=[permissions.IsAuthenticated])
    def my_company_jobs(self, request):
        user = request.user
        if user.user_type not in ['company', 'employer']:
            return Response({'detail': 'Only employers can access this endpoint.'}, status=status.HTTP_403_FORBIDDEN)
        # Get all companies this user is associated with
        companies = user.companies.all()
        if not companies.exists():
            return Response({'results': []})
        # Get all jobs posted by these companies
        jobs = JobPosting.objects.filter(company__in=companies).select_related('company', 'posted_by')
        serializer = self.get_serializer(jobs, many=True, context={'request': request})
        return Response({'results': serializer.data})

    @action(detail=False, methods=['get'], url_path='test-endpoint')
    def test_endpoint(self, request):
        return Response({'message': 'Test endpoint working!'})

# Job Application Views
class JobApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, JSONParser]
    
    def get_queryset(self):
        user = self.request.user
        queryset = JobApplication.objects.select_related(
            'job_posting', 'job_posting__company', 'applicant'
        )
        
        # Filter by job posting if provided
        job_posting_id = self.request.query_params.get('job_posting_id')
        if job_posting_id:
            queryset = queryset.filter(job_posting_id=job_posting_id)
            
        # For regular users, only show their own applications
        if not user.is_staff:
            queryset = queryset.filter(applicant=user)
            
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(applicant=self.request.user)
        
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        if not request.user.is_staff:
            return Response(
                {"detail": "Only staff members can update application status."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        application = self.get_object()
        new_status = request.data.get('status')
        
        if not new_status:
            return Response(
                {"status": ["This field is required."]},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        application.status = new_status
        application.save()
        serializer = self.get_serializer(application)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def parse_resume(self, request):
        """
        Parse resume file and extract basic information using AI-powered resume parser
        """
        if 'resume' not in request.FILES:
            return Response(
                {"detail": "Resume file is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        resume_file = request.FILES['resume']
        
        # Check file size (5MB max)
        if resume_file.size > 5 * 1024 * 1024:
            return Response(
                {"detail": "Resume file size should be less than 5MB."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check file type
        allowed_types = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        if resume_file.content_type not in allowed_types:
            return Response(
                {"detail": "Please upload a valid file (PDF, DOC, or DOCX)."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        temp_file = None
        try:
            # Save the uploaded file temporarily
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(resume_file.name)[1])
            for chunk in resume_file.chunks():
                temp_file.write(chunk)
            temp_file.close()
            
            # Parse the resume using our AI-powered parser
            parsed_data = parse_resume_file(temp_file.name)
            
            return Response(parsed_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"detail": f"Error parsing resume: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        finally:
            # Clean up temporary file
            if temp_file and os.path.exists(temp_file.name):
                try:
                    os.unlink(temp_file.name)
                except Exception as e:
                    print(f"Warning: Could not delete temporary file {temp_file.name}: {str(e)}")

    def job_applicants(self, request, job_id=None):
        """
        Get all applicants for a specific job posting (employers only)
        """
        user = request.user
        if user.user_type not in ['company', 'employer']:
            return Response({'detail': 'Only employers can access this endpoint.'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Get the job posting
            job_posting = JobPosting.objects.get(id=job_id)
            
            # Check if the user is associated with the company that posted this job
            if not user.companies.filter(id=job_posting.company.id).exists():
                return Response({'detail': 'You can only view applicants for jobs posted by your company.'}, status=status.HTTP_403_FORBIDDEN)
            
            # Get all applications for this job
            applications = JobApplication.objects.filter(job_posting=job_posting).select_related('applicant')
            serializer = self.get_serializer(applications, many=True, context={'request': request})
            
            return Response({
                'job_title': job_posting.title,
                'company_name': job_posting.company.name,
                'applications': serializer.data
            })
            
        except JobPosting.DoesNotExist:
            return Response({'detail': 'Job posting not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'detail': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
