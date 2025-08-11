// Function to check if user is a recruiter
function isRecruiter() {
    try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        console.log('User data in isRecruiter:', userData);
        // Check both role and username to determine if user is a recruiter
        const isRecruiterUser = userData && 
                              (userData.role === 'recruiter' || 
                               userData.role === 'employer' ||
                               (userData.username && (
                                   userData.username.toLowerCase().includes('recruiter') ||
                                   userData.username.toLowerCase().includes('employer') ||
                                   userData.username.toLowerCase().includes('company')
                               )));
        console.log('Is user a recruiter?', isRecruiterUser);
        return isRecruiterUser;
    } catch (error) {
        console.error('Error checking if user is recruiter:', error);
        return false;
    }
}

// Function to check if user is authenticated
function isAuthenticated() {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    return localStorage.getItem('isAuthenticated') === 'true' && Object.keys(userData).length > 0;
}

// Function to get current user data
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('user') || '{}');
}

// Function to update UI based on user role and authentication state
function updateUIBasedOnRole() {
    const userNav = document.getElementById('userNav');
    const authNav = document.getElementById('authNav');
    const postJobBtn = document.getElementById('postJobBtn');
    const userAvatar = document.getElementById('userAvatar');
    const userInitials = document.getElementById('userInitials');
    
    // Always get fresh data from localStorage
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const isUserAuthenticated = localStorage.getItem('isAuthenticated') === 'true' && Object.keys(userData).length > 0;
    
    console.log('Current user data:', userData);
    console.log('Is authenticated:', isUserAuthenticated);
    
    // First, handle the post-job page access
    if (window.location.pathname.includes('post-job.html')) {
        const isUserRecruiter = isRecruiter();
        console.log('On post-job page. Is user recruiter?', isUserRecruiter);
        
        if (!isUserAuthenticated || !isUserRecruiter) {
            console.log('Redirecting to login: isAuthenticated:', isUserAuthenticated, 'isRecruiter:', isUserRecruiter);
            alert('You must be logged in as a recruiter to access this page.');
            localStorage.removeItem('user');
            localStorage.removeItem('isAuthenticated');
            window.location.href = 'login.html';
            return false;
        }
    }
    
    // Update navigation based on authentication status
    if (isUserAuthenticated) {
        console.log('User is authenticated, showing user nav');
        // User is logged in
        if (authNav) authNav.style.display = 'none';
        if (userNav) userNav.style.display = 'flex';
        
        // Update user avatar with initials
        if (userAvatar && userInitials) {
            const name = userData.name || userData.username || 'U';
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            userInitials.textContent = initials;
            
            // Set a consistent background color for the avatar based on username
            const colors = ['#1976d2', '#2e7d32', '#d32f2f', '#7b1fa2', '#00796b', '#e65100'];
            const colorIndex = (userData.username || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length;
            userAvatar.style.backgroundColor = colors[colorIndex];
            
            // Add click handler for user menu
            userAvatar.onclick = function(e) {
                e.preventDefault();
                if (confirm('Do you want to log out?')) {
                    localStorage.removeItem('user');
                    localStorage.removeItem('isAuthenticated');
                    window.location.href = 'login.html';
                }
            };
        }
        
        // Show/hide post job button based on role
        if (postJobBtn) {
            const isUserRecruiter = isRecruiter();
            console.log('Setting post job button visibility. Is recruiter?', isUserRecruiter);
            
            if (isUserRecruiter) {
                console.log('User is a recruiter, showing Post Job button');
                postJobBtn.style.display = 'flex';
            } else {
                console.log('User is not a recruiter, hiding Post Job button');
                postJobBtn.style.display = 'none';
            }
        }
    } else {
        // User is not logged in
        console.log('No user logged in, showing auth nav');
        if (authNav) authNav.style.display = 'flex';
        if (userNav) userNav.style.display = 'none';
        if (postJobBtn) postJobBtn.style.display = 'none';
    }
    
    return true;
}

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Update UI based on user role
    updateUIBasedOnRole();
    
    // Check if we're on the jobs page
    if (document.getElementById('jobList')) {
        loadJobs();
        setupSearch();
    }
});

// Load jobs from the API
function loadJobs(searchParams = '') {
    const jobList = document.getElementById('jobList');
    if (!jobList) return;

    // Show loading state with animation
    jobList.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading jobs...</p>
        </div>`;

    // In a real app, this would be a fetch to your backend API
    setTimeout(() => {
        // Sample job data with more details
        const jobs = [
            {
                id: 1,
                title: 'Senior Frontend Developer',
                company: 'Tech Innovations Inc.',
                location: 'Remote',
                type: 'Full-time',
                salary: '$100,000 - $140,000',
                description: 'We are looking for an experienced Frontend Developer with expertise in modern JavaScript frameworks to lead our frontend development efforts.',
                posted: '2 days ago',
                isFeatured: true,
                skills: ['React', 'TypeScript', 'Redux', 'CSS3'],
                benefits: ['Health insurance', 'Remote work', 'Flexible hours', 'Stock options']
            },
            {
                id: 2,
                title: 'Backend Engineer',
                company: 'Data Systems LLC',
                location: 'New York, NY',
                type: 'Full-time',
                salary: '$110,000 - $150,000',
                description: 'Join our team to build scalable backend services using modern technologies and cloud infrastructure.',
                posted: '1 week ago',
                isUrgent: true,
                skills: ['Node.js', 'Python', 'AWS', 'Docker', 'PostgreSQL'],
                benefits: ['Health/dental/vision', '401(k) matching', 'Gym membership', 'Commuter benefits']
            },
            {
                id: 3,
                title: 'UX/UI Designer',
                company: 'Design Hub',
                location: 'San Francisco, CA',
                type: 'Contract',
                salary: '$70 - $90/hr',
                description: 'Looking for a creative UX/UI Designer to create amazing user experiences for our enterprise clients.',
                posted: '3 days ago',
                isFeatured: true,
                skills: ['Figma', 'Sketch', 'User Research', 'Prototyping'],
                benefits: ['Remote work', 'Flexible schedule', 'Professional development']
            },
            {
                id: 4,
                title: 'DevOps Engineer',
                company: 'Cloud Native Solutions',
                location: 'Remote',
                type: 'Full-time',
                salary: '$120,000 - $160,000',
                description: 'Help us build and maintain our cloud infrastructure and CI/CD pipelines.',
                posted: '5 days ago',
                skills: ['Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'Monitoring'],
                benefits: ['Remote work', 'Unlimited PTO', 'Home office stipend', 'Wellness program']
            },
            {
                id: 5,
                title: 'Product Manager',
                company: 'Product Labs',
                location: 'Boston, MA',
                type: 'Full-time',
                salary: '$95,000 - $130,000',
                description: 'Lead product development from conception to launch, working with cross-functional teams.',
                posted: '1 day ago',
                isUrgent: true,
                skills: ['Product Strategy', 'Agile', 'User Research', 'Analytics'],
                benefits: ['Health insurance', 'Stock options', 'Flexible hours', 'Learning budget']
            }
        ];

        // Filter jobs based on search if provided
        const filteredJobs = searchParams 
            ? jobs.filter(job => 
                job.title.toLowerCase().includes(searchParams.toLowerCase()) ||
                job.company.toLowerCase().includes(searchParams.toLowerCase()) ||
                job.location.toLowerCase().includes(searchParams.toLowerCase()) ||
                job.description.toLowerCase().includes(searchParams.toLowerCase()) ||
                job.skills.some(skill => skill.toLowerCase().includes(searchParams.toLowerCase()))
            )
            : jobs;

        // Display jobs with enhanced UI
        if (filteredJobs.length > 0) {
            jobList.innerHTML = `
                <div class="job-list-header">
                    <h2>${filteredJobs.length} ${filteredJobs.length === 1 ? 'Job' : 'Jobs'} Found</h2>
                    <div class="sort-options">
                        <span>Sort by:</span>
                        <select id="sortBy" class="sort-select">
                            <option value="recent">Most Recent</option>
                            <option value="salary_high">Salary (High to Low)</option>
                            <option value="salary_low">Salary (Low to High)</option>
                        </select>
                    </div>
                </div>
                <div class="job-cards-container">
                    ${filteredJobs.map(job => createJobCard(job)).join('')}
                </div>`;

            // Add event listeners to job cards
            document.querySelectorAll('.job-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (!e.target.closest('.job-actions')) {
                        const jobId = card.dataset.id;
                        window.location.href = `job-detail.html?id=${jobId}`;
                    }
                });
            });

            // Add sort functionality
            const sortSelect = document.getElementById('sortBy');
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    const sortedJobs = [...filteredJobs];
                    switch(e.target.value) {
                        case 'salary_high':
                            sortedJobs.sort((a, b) => extractSalary(b.salary) - extractSalary(a.salary));
                            break;
                        case 'salary_low':
                            sortedJobs.sort((a, b) => extractSalary(a.salary) - extractSalary(b.salary));
                            break;
                        default: // recent
                            sortedJobs.sort((a, b) => new Date(b.posted) - new Date(a.posted));
                    }
                    document.querySelector('.job-cards-container').innerHTML = 
                        sortedJobs.map(job => createJobCard(job)).join('');
                });
            }
        } else {
            jobList.innerHTML = `
                <div class="no-results">
                    <i class="material-icons">search_off</i>
                    <h3>No jobs found</h3>
                    <p>Try adjusting your search or filter criteria</p>
                    <button class="btn-clear-filters" onclick="document.getElementById('searchForm').reset(); loadJobs();">
                        Clear all filters
                    </button>
                </div>`;
        }
    }, 500); // Simulate network delay
}

// Helper function to create a job card HTML
function createJobCard(job) {
    const isSaved = false; // You can implement saved jobs functionality
    
    return `
        <div class="job-card ${job.isFeatured ? 'featured' : ''} ${job.isUrgent ? 'urgent' : ''}" data-id="${job.id}">
            <div class="job-card-content">
                <div class="job-header">
                    <div class="company-logo" style="background-color: ${getRandomColor()}">
                        ${job.company.charAt(0).toUpperCase()}
                    </div>
                    <div class="job-header-text">
                        <h3 class="job-title">${job.title}</h3>
                        <div>
                            <span class="job-company">${job.company}</span>
                            ${job.isFeatured ? '<span class="job-badge badge-featured">Featured</span>' : ''}
                            ${job.isUrgent ? '<span class="job-badge badge-urgent">Urgent</span>' : ''}
                        </div>
                        <span class="job-type">${job.type}</span>
                    </div>
                </div>
                
                <div class="job-meta">
                    <span><i class="material-icons">location_on</i> ${job.location}</span>
                    <span><i class="material-icons">attach_money</i> ${job.salary}</span>
                    <span><i class="material-icons">schedule</i> ${job.posted}</span>
                </div>
                
                <p class="job-description">${job.description}</p>
                
                ${job.skills ? `
                    <div class="job-skills">
                        ${job.skills.slice(0, 4).map(skill => 
                            `<span class="skill-tag">${skill}</span>`
                        ).join('')}
                        ${job.skills.length > 4 ? '<span class="skill-tag more">+' + (job.skills.length - 4) + ' more</span>' : ''}
                    </div>` : ''
                }
                
                <div class="job-footer">
                    <span class="job-posted">
                        <i class="material-icons">schedule</i> Posted ${job.posted}
                    </span>
                    <div class="job-actions">
                        <button class="btn-save" data-job-id="${job.id}">
                            <i class="material-icons">${isSaved ? 'bookmark' : 'bookmark_border'}</i>
                            <span>${isSaved ? 'Saved' : 'Save'}</span>
                        </button>
                        <a href="job-detail.html?id=${job.id}" class="btn-view-details">
                            View Details <i class="material-icons">arrow_forward</i>
                        </a>
                    </div>
                </div>
            </div>
        </div>`;
}

// Helper function to extract numeric value from salary string
function extractSalary(salary) {
    if (!salary) return 0;
    // Extract first number from salary string (e.g., "$80,000 - $100,000" -> 80000)
    const match = salary.match(/\$?([\d,]+)/);
    return match ? parseInt(match[1].replace(/,/g, '')) : 0;
}

// Helper function to generate random pastel color for company logos
function getRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 80%, 90%)`;
}

// Set up search functionality with debounce
function setupSearch() {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('search');
    const locationFilter = document.getElementById('locationFilter');
    const jobTypeFilter = document.getElementById('jobTypeFilter');
    
    if (!searchForm) return;
    
    let searchTimeout;
    
    // Handle form submission
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        performSearch();
    });
    
    // Handle input changes with debounce
    [searchInput, locationFilter, jobTypeFilter].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(performSearch, 300);
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    clearTimeout(searchTimeout);
                    performSearch();
                }
            });
        }
    });
    
    // Perform the actual search
    function performSearch() {
        const searchTerm = searchInput ? searchInput.value.trim() : '';
        const location = locationFilter ? locationFilter.value : '';
        const jobType = jobTypeFilter ? jobTypeFilter.value : '';
        
        // Update URL with search parameters
        const params = new URLSearchParams();
        if (searchTerm) params.set('q', searchTerm);
        if (location) params.set('location', location);
        if (jobType) params.set('type', jobType);
        
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
        
        // Load jobs with filters
        loadJobs(searchTerm, { location, jobType });
    }
    
    // Initialize from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('q') && searchInput) {
        searchInput.value = urlParams.get('q');
    }
    if (urlParams.has('location') && locationFilter) {
        locationFilter.value = urlParams.get('location');
    }
    if (urlParams.has('type') && jobTypeFilter) {
        jobTypeFilter.value = urlParams.get('type');
    }
    
    // Initial search if there are URL parameters
    if (urlParams.toString()) {
        performSearch();
    }
}
