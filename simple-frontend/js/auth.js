// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the login page
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Check if we're on the signup page
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
});

// Handle login form submission
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('loginMessage');
    
    // Simple validation
    if (!username || !password) {
        showMessage(messageDiv, 'Please enter both username and password', 'error');
        return;
    }
    
    // Show loading state
    showMessage(messageDiv, 'Logging in...', 'info');
    
    // In a real app, this would be a fetch to your backend API
    // For now, we'll simulate a successful login
    setTimeout(() => {
        // Determine if this is an employer or job seeker login
        // In a real app, this would come from your backend
        const isEmployer = username.toLowerCase().includes('employer') || 
                          username.toLowerCase().includes('recruiter') ||
                          username.toLowerCase().includes('company');
        
        // Store user data in localStorage
        const userData = {
            username: username,
            email: `${username}@example.com`,
            role: isEmployer ? 'recruiter' : 'job_seeker',
            name: isEmployer ? 'Recruiter User' : 'Job Seeker User',
            isRecruiter: isEmployer // Add explicit flag for recruiter status
        };
        
        console.log('Logging in user with data:', userData);
        
        // Save user data to localStorage
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('isAuthenticated', 'true');
        
        // Show success message
        showMessage(messageDiv, 'Login successful! Redirecting...', 'success');
        
        // Redirect to the jobs page after a short delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }, 1000);
}

// Handle signup form submission
function handleSignup(e) {
    e.preventDefault();
    
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const userType = document.querySelector('input[name="user-type"]:checked')?.value || 'job_seeker';
    const messageDiv = document.getElementById('signupMessage');
    
    // Simple validation
    if (!username || !email || !password || !confirmPassword) {
        showMessage(messageDiv, 'Please fill in all fields', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage(messageDiv, 'Passwords do not match', 'error');
        return;
    }
    
    // Show loading state
    showMessage(messageDiv, 'Creating your account...', 'info');
    
    // In a real app, this would be a fetch to your backend API
    // For now, we'll simulate a successful signup
    setTimeout(() => {
        // Determine if this is an employer or job seeker signup
        const isEmployer = userType === 'employer' || 
                          username.toLowerCase().includes('employer') || 
                          username.toLowerCase().includes('recruiter') ||
                          username.toLowerCase().includes('company');
        
        console.log('Creating account. User type:', isEmployer ? 'recruiter' : 'job_seeker');
        
        // Store user data in localStorage
        const userData = {
            username: username,
            email: email,
            role: isEmployer ? 'recruiter' : 'job_seeker',
            name: username,
            userType: userType
        };
        
        // Save user data to localStorage
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('isAuthenticated', 'true');
        
        // Show success message
        showMessage(messageDiv, 'Account created successfully! Redirecting...', 'success');
        
        // Redirect to the jobs page after a short delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }, 1500);
}

// Helper function to show messages
function showMessage(element, message, type = 'info') {
    if (!element) return;
    
    element.textContent = message;
    element.className = 'message';
    
    switch (type) {
        case 'error':
            element.classList.add('error');
            break;
        case 'success':
            element.classList.add('success');
            break;
        default:
            // Info style is the default
            break;
    }
}
