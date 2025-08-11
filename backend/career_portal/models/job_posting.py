from django.db import models
from django.utils import timezone
from django.conf import settings

class JobPosting(models.Model):
    JOB_TYPES = [
        ('full_time', 'Full Time'),
        ('part_time', 'Part Time'),
        ('contract', 'Contract'),
        ('internship', 'Internship'),
        ('remote', 'Remote'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField()
    requirements = models.TextField()
    location = models.CharField(max_length=200)
    job_type = models.CharField(max_length=20, choices=JOB_TYPES)
    salary = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    company = models.ForeignKey('Company', on_delete=models.CASCADE, related_name='job_postings')
    posted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='posted_jobs')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    application_deadline = models.DateField()

    def __str__(self):
        return f"{self.title} at {self.company.name}"

    @property
    def is_expired(self):
        return timezone.now().date() > self.application_deadline
