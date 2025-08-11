from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from ..models import Company, JobPosting
from ..serializers import CompanySerializer, JobPostingSerializer

class CompanyViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows companies to be viewed or edited.
    """
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAdminUser]
        return [permission() for permission in permission_classes]

    @action(detail=True, methods=['get'])
    def job_postings(self, request, pk=None):
        """
        Returns all job postings for a specific company.
        """
        company = self.get_object()
        job_postings = company.job_postings.all()
        serializer = JobPostingSerializer(job_postings, many=True, context={'request': request})
        return Response(serializer.data)
