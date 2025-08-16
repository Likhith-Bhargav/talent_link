from django.db import models
from django.conf import settings
from .user import User
from .company import Company

class RecruiterCompany(models.Model):
    """
    Model to map recruiters to companies.
    A recruiter can be associated with multiple companies.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='recruiter_companies',
        limit_choices_to={'user_type': 'employer'},
        db_column='user_id',
        verbose_name='recruiter'
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='company_recruiters'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'recruiter_companies'
        verbose_name = 'Recruiter Company Mapping'
        verbose_name_plural = 'Recruiter Company Mappings'
        unique_together = ('user', 'company')

    def __str__(self):
        return f"{self.user.email} - {self.company.name}"
