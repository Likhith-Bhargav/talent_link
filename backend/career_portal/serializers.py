from rest_framework import serializers
from .models import Company, JobPosting, JobApplication, User, RecruiterCompany

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the User model with extended fields for user type information.
    """
    user_type = serializers.SerializerMethodField()
    is_employer = serializers.SerializerMethodField()
    is_candidate = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'user_type', 'is_employer', 'is_candidate', 'date_joined', 'phone_number'
        ]
        read_only_fields = ['id', 'date_joined']
    
    def get_user_type(self, obj):
        return getattr(obj, 'user_type', 'candidate')
    
    def get_is_employer(self, obj):
        return getattr(obj, 'user_type', '') == 'employer'
    
    def get_is_candidate(self, obj):
        return getattr(obj, 'user_type', 'candidate') in ['candidate', 'job_seeker']

class CompanySerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField(read_only=True)
    logo = serializers.ImageField(required=False, allow_null=True)
    job_count = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Company
        fields = ['id', 'name', 'description', 'website', 'logo', 'logo_url', 'industry', 
                 'company_size', 'headquarters', 'founded_year', 'created_at', 'updated_at',
                 'job_count']
        read_only_fields = ['id', 'created_at', 'updated_at', 'logo_url', 'job_count']
        
    def get_job_count(self, obj):
        # Count only active job postings that haven't expired
        from django.utils import timezone
        return obj.job_postings.filter(
            is_active=True,
            application_deadline__gte=timezone.now().date()
        ).count()
    
    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request is not None:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None
    
    def create(self, validated_data):
        logo = validated_data.pop('logo', None)
        company = Company.objects.create(**validated_data)
        if logo:
            company.logo = logo
            company.save()
        return company


class RecruiterCompanySerializer(serializers.ModelSerializer):
    """
    Serializer for the RecruiterCompany model.
    """
    recruiter_email = serializers.EmailField(source='user.email', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = RecruiterCompany
        fields = ['id', 'user', 'recruiter_email', 'company', 'company_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'recruiter_email', 'company_name']
    
    def validate(self, data):
        """
        Check that the user is of type 'employer' and not already mapped to this company.
        """
        user = data.get('user')
        company = data.get('company')
        
        if user.user_type != 'employer':
            raise serializers.ValidationError("The specified user is not an employer/recruiter.")
            
        if RecruiterCompany.objects.filter(user=user, company=company).exists():
            raise serializers.ValidationError("This user is already associated with this company as a recruiter.")
            
        return data

class JobPostingSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    company_logo = serializers.SerializerMethodField()
    posted_by_username = serializers.CharField(source='posted_by.username', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    applicant_count = serializers.SerializerMethodField()
    
    class Meta:
        model = JobPosting
        fields = [
            'id', 'title', 'description', 'requirements', 'location', 'job_type',
            'salary', 'is_active', 'company', 'company_name', 'company_logo',
            'posted_by', 'posted_by_username', 'created_at', 'updated_at',
            'application_deadline', 'is_expired', 'applicant_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_expired', 'company', 'posted_by']
    
    def validate_application_deadline(self, value):
        """
        Check that the application deadline is in the future.
        """
        from django.utils import timezone
        if value < timezone.now().date():
            raise serializers.ValidationError("Application deadline must be in the future.")
        return value
    
    def get_company_logo(self, obj):
        if obj.company.logo:
            return self.context['request'].build_absolute_uri(obj.company.logo.url)
        return None
    
    def get_applicant_count(self, obj):
        return obj.applications.count()

class JobApplicationSerializer(serializers.ModelSerializer):
    applicant_details = UserSerializer(source='applicant', read_only=True)
    job_title = serializers.CharField(source='job_posting.title', read_only=True)
    company_name = serializers.CharField(source='job_posting.company.name', read_only=True)
    location = serializers.CharField(source='job_posting.location', read_only=True)
    job_type = serializers.CharField(source='job_posting.job_type', read_only=True)
    salary = serializers.CharField(source='job_posting.salary', read_only=True)
    resume_url = serializers.SerializerMethodField()
    
    class Meta:
        model = JobApplication
        fields = [
            'id', 'job_posting', 'job_title', 'company_name', 'location', 'job_type', 'salary',
            'applicant', 'applicant_details', 'resume', 'resume_url', 'cover_letter', 'skills',
            'status', 'applied_at', 'updated_at'
        ]
        read_only_fields = ['id', 'applicant', 'applied_at', 'updated_at', 'resume_url']
    
    def get_resume_url(self, obj):
        if obj.resume:
            return self.context['request'].build_absolute_uri(obj.resume.url)
        return None
    
    def validate(self, data):
        # Ensure a user can't apply to the same job posting twice
        if self.instance is None:  # Only check on create
            job_posting = data.get('job_posting')
            applicant = self.context['request'].user
            if JobApplication.objects.filter(job_posting=job_posting, applicant=applicant).exists():
                raise serializers.ValidationError("You have already applied to this job posting.")
        return data
