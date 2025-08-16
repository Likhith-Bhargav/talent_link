from django.db import models
from django.utils import timezone
from django.conf import settings

class Company(models.Model):
    COMPANY_SIZE_CHOICES = [
        ('1-10', '1-10 employees'),
        ('11-50', '11-50 employees'),
        ('51-200', '51-200 employees'),
        ('201-500', '201-500 employees'),
        ('501-1000', '501-1000 employees'),
        ('1001-5000', '1001-5000 employees'),
        ('5001+', '5001+ employees'),
    ]

    INDUSTRY_CHOICES = [
        ('technology', 'Technology'),
        ('finance', 'Finance'),
        ('healthcare', 'Healthcare'),
        ('education', 'Education'),
        ('manufacturing', 'Manufacturing'),
        ('retail', 'Retail'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField()
    website = models.URLField(max_length=200, blank=True)
    logo = models.ImageField(upload_to='company_logos/', blank=True, null=True)
    industry = models.CharField(
        max_length=50,
        choices=INDUSTRY_CHOICES,
        blank=True,
        help_text="The industry sector of the company."
    )
    company_size = models.CharField(
        max_length=20,
        choices=COMPANY_SIZE_CHOICES,
        blank=True,
        null=True,
        help_text="The size of the company by number of employees."
    )
    headquarters = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text="The location of the company's headquarters."
    )
    founded_year = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="The year the company was founded."
    )
    users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='companies',
        blank=True,
        help_text='Users associated with this company.'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Companies"
