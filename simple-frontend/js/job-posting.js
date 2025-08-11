document.addEventListener('DOMContentLoaded', function() {
    const postJobForm = document.getElementById('postJobForm');
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const messageDiv = document.getElementById('postJobMessage');
    
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isAuthenticated') === 'true';
    const userType = localStorage.getItem('userType');
    
    if (!isLoggedIn || userType !== 'company') {
        // Redirect to login if not logged in or not a company
        window.location.href = 'login.html';
        return;
    }
    
    // Handle form submission
    if (postJobForm) {
        postJobForm.addEventListener('submit', function(e) {
            e.preventDefault();
            postJob(false); // false means not a draft
        });
    }
    
    // Handle save as draft
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', function() {
            postJob(true); // true means save as draft
        });
    }
    
    // Function to post a job
    function postJob(isDraft) {
        const jobData = {
            title: document.getElementById('jobTitle').value,
            company: document.getElementById('companyName').value,
            type: document.getElementById('jobType').value,
            location: document.getElementById('location').value,
            salary: document.getElementById('salary').value,
            description: document.getElementById('description').value,
            requirements: document.getElementById('requirements').value.split('\n').filter(req => req.trim() !== ''),
            benefits: document.getElementById('benefits').value.split('\n').filter(benefit => benefit.trim() !== ''),
            status: isDraft ? 'draft' : 'published',
            postedBy: localStorage.getItem('userId'),
            postedAt: new Date().toISOString()
        };
        
        // Show loading state
        showMessage(messageDiv, isDraft ? 'Saving draft...' : 'Posting job...', 'info');
        
        // In a real app, this would be a fetch to your backend API
        setTimeout(() => {
            // Get existing jobs from localStorage or initialize empty array
            const jobs = JSON.parse(localStorage.getItem('jobs') || '[]');
            
            // Add new job with a unique ID
            const newJob = {
                ...jobData,
                id: 'job-' + Date.now(),
                applications: []
            };
            
            jobs.push(newJob);
            localStorage.setItem('jobs', JSON.stringify(jobs));
            
            // Show success message
            const successMessage = isDraft 
                ? 'Job draft saved successfully!' 
                : 'Job posted successfully!';
                
            showMessage(messageDiv, successMessage, 'success');
            
            // Redirect to job listings after a short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            
        }, 1000); // Simulate network delay
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
});
