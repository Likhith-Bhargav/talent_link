from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from ..models import JobApplication, JobPosting
from ..serializers import JobApplicationSerializer

class JobApplicationViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows job applications to be viewed or edited.
    """
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Return job applications for the authenticated user.
        Admin users can see all applications.
        """
        user = self.request.user
        if user.is_staff:
            return JobApplication.objects.all()
        return JobApplication.objects.filter(applicant=user)

    def perform_create(self, serializer):
        """
        Create a new job application.
        """
        job_posting_id = self.request.data.get('job_posting')
        job_posting = get_object_or_404(JobPosting, id=job_posting_id)
        
        # Check if user has already applied
        if JobApplication.objects.filter(
            job_posting=job_posting, 
            applicant=self.request.user
        ).exists():
            raise serializers.ValidationError("You have already applied to this job.")
        
        serializer.save(applicant=self.request.user, job_posting=job_posting)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """
        Update the status of a job application.
        Only accessible by admin users or the employer who posted the job.
        """
        job_application = self.get_object()
        
        # Check if user is admin or the employer who posted the job
        if not (request.user.is_staff or 
                request.user == job_application.job_posting.posted_by):
            return Response(
                {"detail": "You do not have permission to update this application."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        new_status = request.data.get('status')
        if new_status not in dict(JobApplication.STATUS_CHOICES):
            return Response(
                {"status": ["Invalid status choice."]},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        job_application.status = new_status
        job_application.save()
        
        return Response(JobApplicationSerializer(job_application).data)

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
