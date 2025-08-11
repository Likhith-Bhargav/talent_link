import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from career_portal.models import User, Company

def test_relationship():
    print("Testing User-Company many-to-many relationship...")
    
    # Create a test user
    print("\n1. Creating test user...")
    user = User.objects.create_user(
        email='test@example.com',
        username='testuser',
        password='testpass123',
        user_type='company'
    )
    print(f"   Created user: {user.email} (ID: {user.id})")
    
    # Create a test company
    print("\n2. Creating test company...")
    company = Company.objects.create(
        name='Test Company',
        description='A test company',
        website='https://testcompany.com'
    )
    print(f"   Created company: {company.name} (ID: {company.id})")
    
    # Add user to company
    print("\n3. Adding user to company...")
    company.users.add(user)
    print("   User added to company")
    
    # Verify the relationship from company side
    print("\n4. Verifying relationship from company side:")
    company_users = list(company.users.all())
    print(f"   Users in company: {[u.email for u in company_users]}")
    
    # Verify the relationship from user side
    print("\n5. Verifying relationship from user side:")
    user_companies = list(user.companies.all())
    print(f"   Companies for user: {[c.name for c in user_companies]}")
    
    # Test removing the user from company
    print("\n6. Testing removal of user from company...")
    company.users.remove(user)
    print("   User removed from company")
    print(f"   Users in company after removal: {list(company.users.all())}")
    print(f"   Companies for user after removal: {list(user.companies.all())}")
    
    # Clean up
    print("\n7. Cleaning up test data...")
    company.delete()
    user.delete()
    print("   Test data cleaned up")
    
    print("\nTest completed successfully!")

if __name__ == "__main__":
    test_relationship()
