from django.contrib import admin
from .models import Company, JobPosting, JobApplication

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'website', 'created_at', 'updated_at')
    search_fields = ('name', 'website')
    list_filter = ('created_at', 'updated_at')

@admin.register(JobPosting)
class JobPostingAdmin(admin.ModelAdmin):
    list_display = ('title', 'company', 'location', 'job_type', 'is_active', 'application_deadline', 'created_at')
    list_filter = ('job_type', 'is_active', 'created_at', 'application_deadline')
    search_fields = ('title', 'description', 'requirements', 'location')
    raw_id_fields = ('company', 'posted_by')
    date_hierarchy = 'created_at'

@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):
    list_display = ('id', 'job_posting', 'applicant', 'status', 'skills', 'applied_at', 'updated_at')
    list_filter = ('status', 'applied_at', 'updated_at')
    search_fields = ('job_posting__title', 'applicant__username', 'applicant__email', 'skills')
    raw_id_fields = ('job_posting', 'applicant')
    date_hierarchy = 'applied_at'
