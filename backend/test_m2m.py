import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from career_portal.models import User, Company

def test_m2m_relationship():
    # Create a test user
    user = User.objects.create_user(
        email='test@example.com',
        username='testuser',
        password='testpass123',
        user_type='company'
    )
    
    # Create a test company
    company = Company.objects.create(
        name='Test Company',
        description='A test company',
        website='https://testcompany.com'
    )
    
    # Add user to company
    company.users.add(user)
    
    # Verify the relationship
    print(f"Company users: {list(company.users.all())}")
    print(f"User companies: {list(user.companies.all())}")
    
    # Clean up
    company.delete()
    user.delete()

if __name__ == "__main__":
    test_m2m_relationship()
