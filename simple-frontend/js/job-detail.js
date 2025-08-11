document.addEventListener('DOMContentLoaded', function() {
    // Get job ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');
    
    if (!jobId) {
        window.location.href = 'index.html';
        return;
    }
    
    // Get job details from localStorage
    const jobs = JSON.parse(localStorage.getItem('jobs') || '[]');
    const job = jobs.find(j => j.id === jobId);
    
    if (!job) {
        window.location.href = '404.html';
        return;
    }
    
    // Update page with job details
    document.getElementById('jobTitle').textContent = job.title;
    document.getElementById('companyName').textContent = job.company;
    document.getElementById('jobType').textContent = job.type || 'Not specified';
    document.getElementById('jobLocation').textContent = job.location || 'Not specified';
    document.getElementById('jobSalary').textContent = job.salary || 'Not specified';
    document.getElementById('jobDescription').innerHTML = job.description.replace(/\n/g, '<br>');
    
    // Format and display requirements
    const requirementsList = document.getElementById('requirementsList');
    if (job.requirements && job.requirements.length > 0) {
        job.requirements.forEach(req => {
            const li = document.createElement('li');
            li.textContent = req;
            requirementsList.appendChild(li);
        });
    } else {
        requirementsList.innerHTML = '<li>No specific requirements listed.</li>';
    }
    
    // Format and display benefits
    const benefitsList = document.getElementById('benefitsList');
    if (job.benefits && job.benefits.length > 0) {
        job.benefits.forEach(benefit => {
            const li = document.createElement('li');
            li.textContent = benefit;
            benefitsList.appendChild(li);
        });
    } else {
        benefitsList.innerHTML = '<li>No benefits listed.</li>';
    }
    
    // Format and display posted date
    if (job.postedAt) {
        const postedDate = new Date(job.postedAt);
        const now = new Date();
        const diffTime = Math.abs(now - postedDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let dateText;
        if (diffDays < 1) {
            dateText = 'Posted today';
        } else if (diffDays === 1) {
            dateText = 'Posted yesterday';
        } else if (diffDays < 30) {
            dateText = `Posted ${diffDays} days ago`;
        } else {
            dateText = `Posted on ${postedDate.toLocaleDateString()}`;
        }
        
        document.getElementById('postedDate').textContent = dateText;
    }
    
    // Check if user is logged in and update UI accordingly
    const isLoggedIn = localStorage.getItem('isAuthenticated') === 'true';
    const userType = localStorage.getItem('userType');
    const authNav = document.getElementById('authNav');
    const userNav = document.getElementById('userNav');
    
    if (isLoggedIn) {
        // Show user navigation
        if (authNav) authNav.style.display = 'none';
        if (userNav) userNav.style.display = 'block';
        
        // If user is the job poster, show edit/delete options
        if (userType === 'company' && job.postedBy === localStorage.getItem('userId')) {
            const jobActions = document.querySelector('.job-actions');
            if (jobActions) {
                jobActions.innerHTML = `
                    <button id="editJobBtn" class="btn-primary">Edit Job</button>
                    <button id="deleteJobBtn" class="btn-danger">Delete Job</button>
                    <button id="viewApplicantsBtn" class="btn-secondary">View Applicants</button>
                `;
                
                document.getElementById('editJobBtn').addEventListener('click', () => {
                    window.location.href = `post-job.html?edit=${job.id}`;
                });
                
                document.getElementById('deleteJobBtn').addEventListener('click', () => {
                    if (confirm('Are you sure you want to delete this job posting?')) {
                        // In a real app, this would be an API call
                        const updatedJobs = jobs.filter(j => j.id !== jobId);
                        localStorage.setItem('jobs', JSON.stringify(updatedJobs));
                        alert('Job posting deleted successfully.');
                        window.location.href = 'index.html';
                    }
                });
                
                document.getElementById('viewApplicantsBtn').addEventListener('click', () => {
                    // In a real app, this would navigate to an applicants page
                    alert('Viewing applicants for this job (not implemented in this demo)');
                });
            }
        }
    } else {
        // Show auth navigation
        if (authNav) authNav.style.display = 'block';
        if (userNav) userNav.style.display = 'none';
    }
    
    // Handle apply button click
    const applyBtn = document.getElementById('applyBtn');
    const applicationForm = document.getElementById('applicationForm');
    const cancelApplyBtn = document.getElementById('cancelApplyBtn');
    const jobApplicationForm = document.getElementById('jobApplicationForm');
    const applicationMessage = document.getElementById('applicationMessage');
    
    if (applyBtn) {
        applyBtn.addEventListener('click', function() {
            if (!isLoggedIn) {
                // Redirect to login with a return URL
                localStorage.setItem('returnUrl', window.location.href);
                window.location.href = 'login.html';
                return;
            }
            
            if (userType === 'company') {
                alert('Companies cannot apply for jobs. Please use a candidate account.');
                return;
            }
            
            // Show the application form
            this.style.display = 'none';
            if (applicationForm) applicationForm.style.display = 'block';
        });
    }
    
    if (cancelApplyBtn) {
        cancelApplyBtn.addEventListener('click', function() {
            if (applicationForm) applicationForm.style.display = 'none';
            if (applyBtn) applyBtn.style.display = 'inline-block';
        });
    }
    
    // Handle job application form submission
    if (jobApplicationForm) {
        jobApplicationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // In a real app, this would upload the resume to a server
            // and submit the application data to your backend
            
            // Show success message
            showMessage(applicationMessage, 'Application submitted successfully!', 'success');
            
            // Reset form
            this.reset();
            
            // Hide form after submission
            setTimeout(() => {
                if (applicationForm) applicationForm.style.display = 'none';
                if (applyBtn) applyBtn.style.display = 'inline-block';
            }, 2000);
            
            // In a real app, you would save the application to localStorage or send to a server
            const application = {
                jobId: jobId,
                jobTitle: job.title,
                company: job.company,
                applicantName: document.getElementById('applicantName').value,
                applicantEmail: document.getElementById('applicantEmail').value,
                applicantPhone: document.getElementById('applicantPhone').value,
                coverLetter: document.getElementById('coverLetter').value,
                appliedAt: new Date().toISOString(),
                status: 'pending',
                resume: 'resume-placeholder.pdf' // In a real app, this would be the uploaded file
            };
            
            // Save application to localStorage
            const applications = JSON.parse(localStorage.getItem('jobApplications') || '[]');
            applications.push(application);
            localStorage.setItem('jobApplications', JSON.stringify(applications));
            
            // Update job with new application
            job.applications = job.applications || [];
            job.applications.push({
                applicantId: localStorage.getItem('userId'),
                applicationId: 'app-' + Date.now(),
                status: 'pending',
                appliedAt: new Date().toISOString()
            });
            
            // Update jobs in localStorage
            const jobIndex = jobs.findIndex(j => j.id === jobId);
            if (jobIndex !== -1) {
                jobs[jobIndex] = job;
                localStorage.setItem('jobs', JSON.stringify(jobs));
            }
        });
    }
    
    // Handle save job button
    const saveJobBtn = document.getElementById('saveJobBtn');
    if (saveJobBtn) {
        saveJobBtn.addEventListener('click', function() {
            if (!isLoggedIn) {
                localStorage.setItem('returnUrl', window.location.href);
                window.location.href = 'login.html';
                return;
            }
            
            const savedJobs = JSON.parse(localStorage.getItem('savedJobs') || '{}');
            const userId = localStorage.getItem('userId');
            
            if (!savedJobs[userId]) {
                savedJobs[userId] = [];
            }
            
            // Check if job is already saved
            const isSaved = savedJobs[userId].some(j => j.id === jobId);
            
            if (isSaved) {
                // Remove from saved jobs
                savedJobs[userId] = savedJobs[userId].filter(j => j.id !== jobId);
                this.textContent = 'Save Job';
                alert('Job removed from saved jobs');
            } else {
                // Add to saved jobs
                savedJobs[userId].push({
                    id: jobId,
                    title: job.title,
                    company: job.company,
                    location: job.location,
                    savedAt: new Date().toISOString()
                });
                this.textContent = 'Saved ✓';
                alert('Job saved successfully');
            }
            
            localStorage.setItem('savedJobs', JSON.stringify(savedJobs));
        });
    }
    
    // Handle logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('userId');
            localStorage.removeItem('userType');
            window.location.href = 'index.html';
        });
    }
});

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
