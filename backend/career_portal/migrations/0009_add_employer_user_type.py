from django.db import migrations, models


def update_user_type_choices(apps, schema_editor):
    """
    Update the user_type choices to include 'employer'.
    This is a data migration to ensure existing data remains valid.
    """
    User = apps.get_model('career_portal', 'User')
    
    # Get all users with user_type 'company' that should be 'employer'
    # Note: This is just an example, adjust according to your needs
    # User.objects.filter(user_type='company').update(user_type='employer')


class Migration(migrations.Migration):

    dependencies = [
        ('career_portal', '0008_update_recruiter_company'),
    ]

    operations = [
        migrations.RunPython(update_user_type_choices, reverse_code=migrations.RunPython.noop),
        migrations.AlterField(
            model_name='user',
            name='user_type',
            field=models.CharField(
                choices=[
                    ('candidate', 'Candidate'),
                    ('company', 'Company'),
                    ('admin', 'Admin'),
                    ('employer', 'Employer'),
                ],
                default='candidate',
                max_length=20,
            ),
        ),
    ]
