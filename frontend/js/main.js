// Use the global auth instance from window.TalentLink

// Main Application
class TalentLinkApp {
  constructor() {
    this.api = window.TalentLink && window.TalentLink.api ? window.TalentLink.api : null;
    this.jobs = [];
    this.currentPage = 1;
    this.itemsPerPage = 9;
    this.filters = {
      search: '',
      location: '',
      jobType: '',
      experience: ''
    };
    this.user = null;
    
    this.initialize();
  }
  
  initialize() {
    this.cacheElements();
    this.setupEventListeners();
    this.checkAuth();
    
    // Only load jobs if we're on the jobs page, not on index
    if (window.location.pathname.endsWith('jobs.html') && 
        !window.location.pathname.endsWith('index.html') && 
        window.location.pathname !== '/') {
      this.loadJobs();
    }
    
    // Setup login form if on login page
    if (window.location.pathname.endsWith('login.html')) {
      this.setupLoginForm();
    }
    
    this.setupBackToTop();
    this.setupMobileMenu();
    
    // Add page visibility change listener to refresh jobs when user returns to page
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && 
          window.location.pathname.endsWith('jobs.html') && 
          !window.location.pathname.endsWith('index.html') && 
          window.location.pathname !== '/') {
        // User has returned to the page, refresh jobs to show updated listings
        console.log('[TalentLink] Page became visible, refreshing jobs...');
        this.loadJobs();
      }
    });
  }
  
  // Setup login form event listeners
  setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      const submitButton = loginForm.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.innerHTML;
      
      // Basic validation
      if (!username || !password) {
        this.showError('Please enter both username/email and password', errorMessage);
        return;
      }
      
      // Show loading state
      submitButton.disabled = true;
      submitButton.innerHTML = 'Logging in...';
      
      try {
        console.log('Attempting login with:', { username });
        // Use the correct API endpoint and expect 'token' in response
        const result = await window.TalentLink.auth.login(username, password);
        console.log('Login result:', result);
        
        // If we get here, login was successful
        this.showSuccess('Login successful! Redirecting...', errorMessage);
        
        // Redirect to home page after a short delay
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1000);
        
      } catch (error) {
        console.error('Login error:', error);
        
        // Show error message
        let errorMsg = 'Invalid username or password. Please try again.';
        if (error.message) {
          errorMsg = error.message;
        }
        this.showError(errorMsg, errorMessage);
        
      } finally {
        // Reset button state
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
      }
    });
    
    // Check for registered parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('registered') === 'true') {
      this.showSuccess('Registration successful! You can now log in.', errorMessage);
      // Remove the parameter from the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
  
  // Show error message
  showError(message, element) {
    if (!element) return;
    element.textContent = message;
    element.style.display = 'block';
    element.style.color = '#e53e3e'; // Red color for errors
    console.error('Error:', message);
  }
  
  // Show success message
  showSuccess(message, element) {
    if (!element) return;
    element.textContent = message;
    element.style.display = 'block';
    element.style.color = '#38a169'; // Green color for success
    console.log('Success:', message);
  }
  
  cacheElements() {
    // Navigation
    this.navLinks = document.getElementById('navLinks');
    this.authButtons = document.getElementById('authButtons');
    this.userMenu = document.getElementById('userMenu');
    this.userAvatar = document.getElementById('userAvatar');
    this.dropdownMenu = document.getElementById('dropdownMenu');
    this.hamburger = document.getElementById('hamburger');
    this.loginLink = document.getElementById('loginLink');
    this.registerLink = document.getElementById('registerLink');
    
    // Search and Filters
    this.searchForm = document.getElementById('searchForm');
    this.searchInput = document.getElementById('searchInput');
    this.locationInput = document.getElementById('locationInput');
    this.jobTypeFilter = document.getElementById('jobTypeFilter');
    this.experienceFilter = document.getElementById('experienceFilter');
    
    // Job Listings - Using the companies list container
    this.jobList = document.querySelector('.companies-list');
    this.pagination = document.querySelector('.pagination');
    
    // Back to top button
    this.backToTop = document.getElementById('backToTop');
  }
  
  setupEventListeners() {
    // Search and Filters
    if (this.searchForm) {
      this.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.applyFilters();
      });
    }
    
    if (this.jobTypeFilter) {
      this.jobTypeFilter.addEventListener('change', () => this.applyFilters());
    }
    
    if (this.experienceFilter) {
      this.experienceFilter.addEventListener('change', () => this.applyFilters());
    }
    
    // User menu dropdown
    if (this.userAvatar) {
      this.userAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dropdownMenu.classList.toggle('show');
      });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (this.dropdownMenu && !e.target.closest('.user-menu')) {
        this.dropdownMenu.classList.remove('show');
      }
    });
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
    }
    
    // Save job button click handler
    document.addEventListener('click', (e) => {
      if (e.target.closest('.btn-save')) {
        const jobId = e.target.closest('.btn-save').dataset.jobId;
        this.toggleSaveJob(e, jobId);
      } else if (e.target.closest('.btn-apply')) {
        const jobId = e.target.closest('.btn-apply').dataset.jobId;
        this.handleJobApplication(jobId);
      }
    });
  }
  
  setupMobileMenu() {
    if (this.hamburger) {
      this.hamburger.addEventListener('click', () => {
        this.navLinks.classList.toggle('active');
      });
    }
  }
  
  setupBackToTop() {
    if (this.backToTop) {
      window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
          this.backToTop.classList.add('visible');
        } else {
          this.backToTop.classList.remove('visible');
        }
      });
      
      this.backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }
  
  async checkAuth() {
    try {
      // Check if we have a token
      const token = localStorage.getItem('token');
      if (!token) {
        this.updateAuthUI(false);
        return false;
      }
      
      // Set the token in the API service
      if (window.TalentLink?.api) {
        window.TalentLink.api.setToken(token);
      }
      
      // Try to get the current user
      const response = await fetch('/api/auth/user/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Accept': 'application/json'
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        const user = {
          id: userData.pk || userData.id,
          username: userData.username,
          email: userData.email,
          firstName: userData.first_name || '',
          lastName: userData.last_name || '',
          user_type: userData.user_type,
          is_candidate: userData.is_candidate,
          isAuthenticated: true
        };
        
        this.user = user;
        localStorage.setItem('user', JSON.stringify(user));
        this.updateAuthUI(true);
        return true;
      } else {
        // Invalid token, clear auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.user = null;
        this.updateAuthUI(false);
        return false;
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      this.updateAuthUI(false);
      return false;
    }
  }
  
  updateAuthUI(isLoggedIn) {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const userInitials = document.getElementById('userInitials');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (isLoggedIn && this.user) {
      const user = this.user;
      
      // Show user menu and hide auth buttons
      if (userMenu) userMenu.style.display = 'block';
      if (authButtons) authButtons.style.display = 'none';
      
      // Update user info in dropdown
      if (userName) {
        const displayName = user.first_name || user.username || 'User';
        userName.textContent = displayName;
      }
      
      if (userEmail) {
        userEmail.textContent = user.email || '';
      }
      
      // Update user avatar initials
      if (userInitials) {
        const initials = (user.first_name ? user.first_name.charAt(0) : '') + 
                        (user.last_name ? user.last_name.charAt(0) : user.username ? user.username.charAt(0) : 'U');
        userInitials.textContent = initials.toUpperCase();
      }
      
      // Setup logout button
      if (logoutBtn) {
        logoutBtn.onclick = (e) => this.handleLogout(e);
      }
      
      // Update post job button visibility based on user type
      const postJobBtn = document.getElementById('postJobBtn');
      if (postJobBtn) {
        postJobBtn.style.display = user.user_type === 'employer' ? 'inline-flex' : 'none';
      }
      
    } else {
      // User is not authenticated
      if (authButtons) authButtons.style.display = 'flex';
      if (userMenu) userMenu.style.display = 'none';
      
      // Hide post job button for non-logged in users
      const postJobBtn = document.getElementById('postJobBtn');
      if (postJobBtn) {
        postJobBtn.style.display = 'none';
      }
    }
  }
  
  // Handle logout
  async handleLogout(event) {
    if (event) event.preventDefault();
    
    try {
      // Show loading state
      const logoutBtn = document.getElementById('logoutLink');
      const originalText = logoutBtn ? logoutBtn.innerHTML : '';
      if (logoutBtn) {
        logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
        logoutBtn.disabled = true;
      }
      
      // Call the auth service to logout
      await window.TalentLink.auth.logout();
      
      // Update UI
      this.user = null;
      this.updateAuthUI(false);
      
      // Show success message
      this.showNotification('You have been successfully logged out.', 'success');
      
      // Redirect to home page if not already there
      if (!window.location.pathname.endsWith('index.html') && 
          !window.location.pathname.endsWith('/')) {
        window.location.href = 'index.html';
      }
      
    } catch (error) {
      console.error('Logout error:', error);
      this.showNotification(error.message || 'An error occurred during logout.', 'error');
      
      // Reset button state
      const logoutBtn = document.getElementById('logoutLink');
      if (logoutBtn) {
        logoutBtn.innerHTML = originalText;
        logoutBtn.disabled = false;
      }
    }
  }
  
  // Show notification to user
  showNotification(message, type = 'info') {
    // You can implement a more sophisticated notification system here
    // For now, we'll use a simple alert
    alert(`${type.toUpperCase()}: ${message}`);
    
    /* Example of a more sophisticated notification system:
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
    */
  }
  
  async loadJobs() {
    try {
      // Clear job-related caches to ensure fresh data
      if (this.api && this.api.clearJobCaches) {
        this.api.clearJobCaches();
      }
      
      // Show loading state if jobList exists
      if (this.jobList) {
        this.jobList.innerHTML = `
          <div class="loading">
            <div class="spinner"></div>
            <p>Loading jobs...</p>
          </div>
        `;
      }
      // Fetch jobs from backend API
      const filters = {
        search: this.filters.search,
        location: this.filters.location,
        experience: this.filters.experience
      };
      // Only add job_type if a specific type is selected
      if (this.filters.jobType && this.filters.jobType !== '' && this.filters.jobType.toLowerCase() !== 'all' && this.filters.jobType.toLowerCase() !== 'all types') {
        filters.job_type = this.filters.jobType;
      }
      console.log('[TalentLink] loadJobs called with filters:', filters);
      if (!this.api) {
        console.error('[TalentLink] API instance not found on window.TalentLink.api');
        return;
      }
      const response = await this.api.jobs.getAll(filters);
      console.log('[TalentLink] jobs API response:', response);
      let jobs = response.results || response; // handle paginated or non-paginated
      
      // Filter out jobs that the user has already applied to
      if (this.user && (this.user.user_type === 'candidate' || this.user.user_type === 'job_seeker' || this.user.is_candidate)) {
        try {
          const myApplications = await this.api.jobs.getMyApplications();
          let applicationsArray = [];
          
          // Normalize applications to array
          if (Array.isArray(myApplications)) {
            applicationsArray = myApplications;
          } else if (myApplications && myApplications.results && Array.isArray(myApplications.results)) {
            applicationsArray = myApplications.results;
          } else if (myApplications && myApplications.data && Array.isArray(myApplications.data)) {
            applicationsArray = myApplications.data;
          }
          
          // Get list of job IDs that user has already applied to
          const appliedJobIds = applicationsArray.map(app => String(app.job_posting));
          
          // Filter out jobs that user has already applied to
          jobs = jobs.filter(job => !appliedJobIds.includes(String(job.id)));
          
          console.log('[TalentLink] Filtered out', appliedJobIds.length, 'already applied jobs');
        } catch (error) {
          console.warn('[TalentLink] Could not load user applications for filtering:', error);
        }
      }
      
      this.jobs = jobs;
      this.renderJobs();
    } catch (error) {
      console.error('Error loading jobs:', error);
      if (this.jobList) {
        this.jobList.innerHTML = `
          <div class="error-message">
            <span class="material-icons">error_outline</span>
            <p>Failed to load jobs. Please try again later.</p>
            <button class="btn btn-outline" onclick="app.loadJobs()">Retry</button>
          </div>
        `;
      }
    }
  }
  
  applyFilters() {
    // Map frontend job type values to backend values
    let jobTypeValue = this.jobTypeFilter ? this.jobTypeFilter.value : '';
    const jobTypeMap = {
      'Full-time': 'full_time',
      'Part-time': 'part_time',
      'Contract': 'contract',
      'Internship': 'internship',
      'Remote': 'remote'
    };
    if (jobTypeValue in jobTypeMap) {
      jobTypeValue = jobTypeMap[jobTypeValue];
    }
    this.filters = {
      search: this.searchInput ? this.searchInput.value.toLowerCase() : '',
      location: this.locationInput ? this.locationInput.value.toLowerCase() : '',
      jobType: jobTypeValue,
      experience: this.experienceFilter ? this.experienceFilter.value : ''
    };
    this.currentPage = 1; // Reset to first page when filters change
    this.loadJobs();
    // Update URL with filter parameters
    this.updateURL();
  }
  
  updateURL() {
    const params = new URLSearchParams();
    
    if (this.filters.search) params.set('q', this.filters.search);
    if (this.filters.location) params.set('location', this.filters.location);
    if (this.filters.jobType) params.set('type', this.filters.jobType);
    if (this.filters.experience) params.set('exp', this.filters.experience);
    if (this.currentPage > 1) params.set('page', this.currentPage);
    
    const newURL = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.pushState({}, '', newURL);
  }
  
  renderJobs() {
    if (!this.jobs || this.jobs.length === 0) {
      this.jobList.innerHTML = `
        <div class="no-results">
          <span class="material-icons">search_off</span>
          <h3>No jobs found</h3>
          <p>Try adjusting your search or filter to find what you're looking for.</p>
        </div>
      `;
      this.pagination.innerHTML = '';
      return;
    }

    // Apply client-side filtering as a fallback
    let filteredJobs = [...this.jobs];

    // Apply search filter
    if (this.filters.search) {
      const searchTerm = this.filters.search.toLowerCase();
      filteredJobs = filteredJobs.filter(job => 
        (job.title && job.title.toLowerCase().includes(searchTerm)) ||
        (job.company_name && job.company_name.toLowerCase().includes(searchTerm)) ||
        (job.description && job.description.toLowerCase().includes(searchTerm)) ||
        (job.skills && Array.isArray(job.skills) && 
          job.skills.some(skill => skill.toLowerCase().includes(searchTerm)))
      );
    }

    // Apply location filter
    if (this.filters.location) {
      const locationTerm = this.filters.location.toLowerCase();
      filteredJobs = filteredJobs.filter(job => 
        job.location && job.location.toLowerCase().includes(locationTerm)
      );
    }

    // Apply job type filter
    if (this.filters.jobType) {
      filteredJobs = filteredJobs.filter(job => 
        job.job_type === this.filters.jobType || 
        job.type === this.filters.jobType
      );
    }

    // Apply experience filter
    if (this.filters.experience) {
      filteredJobs = filteredJobs.filter(job => 
        job.experience_level === this.filters.experience ||
        job.experience === this.filters.experience
      );
    }

    // Handle pagination
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

    // Render the filtered and paginated jobs
    if (filteredJobs.length === 0) {
      this.jobList.innerHTML = `
        <div class="no-results">
          <span class="material-icons">search_off</span>
          <h3>No jobs match your filters</h3>
          <p>Try adjusting your search or filter criteria.</p>
        </div>
      `;
    } else {
      this.jobList.innerHTML = paginatedJobs.map(job => this.createJobCard(job)).join('');
    }
    
    this.renderPagination(filteredJobs.length);
  }
  
  createJobCard(job) {
    const isSaved = this.isJobSaved(job.id);
    // Use created_at or postedDate from backend
    const postedDate = new Date(job.created_at || job.postedDate || Date.now());
    const formattedDate = postedDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    
    // Experience mapping (if needed)
    const experienceMap = {
      'Entry Level': '0-2 years',
      'Mid Level': '3-5 years',
      'Senior Level': '5+ years'
    };
    // Use company_name from backend
    const companyInitial = job.company_name ? job.company_name.charAt(0).toUpperCase() : '?';
    // Use job_type from backend, map to display value
    const jobTypeMap = {
      'full_time': 'Full Time',
      'part_time': 'Part Time',
      'contract': 'Contract',
      'internship': 'Internship',
      'remote': 'Remote'
    };
    const jobType = jobTypeMap[job.job_type] || job.job_type || job.type || '';
    // Use salary from backend (string)
    const salary = job.salary ? job.salary : 'N/A';
    // Use experience from backend
    const experience = job.experience || job.experience_level || '';
    // Use skills if present, else empty array
    const skills = job.skills || [];
    
    return `
      <div class="job-card ${job.featured ? 'featured' : ''}" data-id="${job.id}">
        <div class="job-card-content">
          <div class="job-header">
            <div class="company-logo" style="background-color: ${this.getRandomColor()}">
              ${companyInitial}
            </div>
            <div class="job-header-text">
              <h3 class="job-title">${job.title}</h3>
              <a href="#" class="job-company">${job.company_name || ''}</a>
              <span class="job-type">${jobType}</span>
              ${job.urgent ? '<span class="job-urgent">Urgent</span>' : ''}
            </div>
          </div>
          
          <div class="job-meta">
            <span><i class="material-icons">location_on</i> ${job.location}</span>
            <span><i class="material-icons">attach_money</i> ${salary}</span>
            <span><i class="material-icons">work_outline</i> ${experienceMap[experience] || experience}</span>
          </div>
          
          <p class="job-description">${job.description}</p>
          
          <div class="job-skills">
            ${skills.slice(0, 3).map(skill => 
              `<span class="skill-tag">${skill}</span>`
            ).join('')}
            ${skills.length > 3 ? 
              `<span class="skill-tag more">+${skills.length - 3} more</span>` : ''
            }
          </div>
          
          <div class="job-footer">
            <span class="job-posted"><i class="material-icons">access_time</i> Posted ${formattedDate}</span>
            <div class="job-actions">
              ${this.user && (this.user.user_type === 'candidate' || this.user.user_type === 'job_seeker' || this.user.is_candidate) ? `
                <button class="btn-apply" data-job-id="${job.id}">
                  <i class="material-icons">send</i> Apply Now
                </button>
              ` : ''}
              <button class="btn-save ${isSaved ? 'saved' : ''}" data-job-id="${job.id}">
                <i class="material-icons">${isSaved ? 'bookmark' : 'bookmark_border'}</i>
                ${isSaved ? 'Saved' : 'Save'}
              </button>
              <a href="job-details.html?id=${job.id}" class="btn-view-details">
                <i class="material-icons">visibility</i> View Details
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / this.itemsPerPage);
    
    if (totalPages <= 1) {
      this.pagination.innerHTML = '';
      return;
    }
    
    let paginationHTML = '';
    const maxVisiblePages = 5;
    let startPage, endPage;
    
    if (totalPages <= maxVisiblePages) {
      startPage = 1;
      endPage = totalPages;
    } else {
      const maxPagesBeforeCurrent = Math.floor(maxVisiblePages / 2);
      const maxPagesAfterCurrent = Math.ceil(maxVisiblePages / 2) - 1;
      
      if (this.currentPage <= maxPagesBeforeCurrent) {
        startPage = 1;
        endPage = maxVisiblePages;
      } else if (this.currentPage + maxPagesAfterCurrent >= totalPages) {
        startPage = totalPages - maxVisiblePages + 1;
        endPage = totalPages;
      } else {
        startPage = this.currentPage - maxPagesBeforeCurrent;
        endPage = this.currentPage + maxPagesAfterCurrent;
      }
    }
    
    // Previous button
    paginationHTML += `
      <a href="#" class="page-link ${this.currentPage === 1 ? 'disabled' : ''}" 
         data-page="${this.currentPage - 1}" aria-label="Previous">
        &laquo;
      </a>
    `;
    
    // First page
    if (startPage > 1) {
      paginationHTML += `
        <a href="#" class="page-link" data-page="1">1</a>
        ${startPage > 2 ? '<span class="page-dots">...</span>' : ''}
      `;
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `
        <a href="#" class="page-link ${i === this.currentPage ? 'active' : ''}" data-page="${i}">
          ${i}
        </a>
      `;
    }
    
    // Last page
    if (endPage < totalPages) {
      paginationHTML += `
        ${endPage < totalPages - 1 ? '<span class="page-dots">...</span>' : ''}
        <a href="#" class="page-link" data-page="${totalPages}">${totalPages}</a>
      `;
    }
    
    // Next button
    paginationHTML += `
      <a href="#" class="page-link ${this.currentPage === totalPages ? 'disabled' : ''}" 
         data-page="${this.currentPage + 1}" aria-label="Next">
        &raquo;
      </a>
    `;
    
    this.pagination.innerHTML = paginationHTML;
    
    // Add event listeners to pagination links
    document.querySelectorAll('.page-link:not(.disabled)').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.currentPage = parseInt(link.dataset.page);
        this.renderJobs();
        this.updateURL();
        window.scrollTo({ top: this.jobList.offsetTop - 100, behavior: 'smooth' });
      });
    });
  }
  
  toggleSaveJob(e, jobId) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!this.user) {
      // Redirect to login or show login modal
      window.location.href = 'login.html';
      return;
    }
    
    const saveButton = e.currentTarget;
    const isSaved = saveButton.classList.contains('saved');
    
    // Toggle save state
    if (isSaved) {
      this.unsaveJob(jobId);
      saveButton.classList.remove('saved');
      saveButton.innerHTML = '<i class="material-icons">bookmark_border</i> Save';
    } else {
      this.saveJob(jobId);
      saveButton.classList.add('saved');
      saveButton.innerHTML = '<i class="material-icons">bookmark</i> Saved';
    }
  }
  
  saveJob(jobId) {
    const savedJobs = JSON.parse(localStorage.getItem('savedJobs') || '[]');
    if (!savedJobs.includes(jobId)) {
      savedJobs.push(jobId);
      localStorage.setItem('savedJobs', JSON.stringify(savedJobs));
    }
  }
  
  unsaveJob(jobId) {
    let savedJobs = JSON.parse(localStorage.getItem('savedJobs') || '[]');
    savedJobs = savedJobs.filter(id => id !== jobId);
    localStorage.setItem('savedJobs', JSON.stringify(savedJobs));
  }
  
  isJobSaved(jobId) {
    const savedJobs = JSON.parse(localStorage.getItem('savedJobs') || '[]');
    return savedJobs.includes(jobId);
  }
  
  clearFilters() {
    if (this.searchInput) this.searchInput.value = '';
    if (this.locationInput) this.locationInput.value = '';
    if (this.jobTypeFilter) this.jobTypeFilter.value = '';
    if (this.experienceFilter) this.experienceFilter.value = '';
    
    this.filters = {
      search: '',
      location: '',
      jobType: '',
      experience: ''
    };
    
    this.currentPage = 1;
    this.renderJobs();
    this.updateURL();
  }
  
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  }
  
  // Handle job application
  handleJobApplication(jobId) {
    if (!jobId) return;
    
    // Check if user is logged in
    if (!this.user || !this.user.id) {
      // Redirect to login with return URL
      window.location.href = `login.html?redirect=${encodeURIComponent(`application.html?jobId=${jobId}`)}`;
      return;
    }
    
    // Check user type
    if (!(this.user.user_type === 'candidate' || this.user.user_type === 'job_seeker' || this.user.is_candidate)) {
      this.showNotification('Only job seekers can apply for jobs.', 'error');
      return;
    }
    
    // Redirect to application page
    window.location.href = `application.html?jobId=${jobId}`;
  }

  getRandomColor() {
    const colors = [
      '#4361ee', '#3f37c9', '#4895ef', '#4cc9f0', '#4cc9f0',
      '#4cc9f0', '#4cc9f0', '#4cc9f0', '#4cc9f0', '#4cc9f0'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  getSampleJobs() {
    // Sample job data - in a real app, this would come from your API
    const companies = [
      { id: 1, name: 'TechCorp', logo: 'T' },
      { id: 2, name: 'WebSolutions', logo: 'W' },
      { id: 3, name: 'DataSystems', logo: 'D' },
      { id: 4, name: 'CloudNine', logo: 'C' },
      { id: 5, name: 'DesignHub', logo: 'D' },
    ];
    
    const titles = [
      'Senior Frontend Developer', 'Backend Engineer', 'UI/UX Designer',
      'Product Manager', 'Data Scientist', 'DevOps Engineer',
      'Full Stack Developer', 'Mobile App Developer', 'QA Engineer',
      'Project Manager', 'Scrum Master', 'Technical Writer'
    ];
    
    const locations = [
      'San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA',
      'Chicago, IL', 'Boston, MA', 'Denver, CO', 'Portland, OR',
      'Remote', 'Hybrid (US)'
    ];
    
    const skills = [
      'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'TypeScript',
      'Angular', 'Vue.js', 'Docker', 'Kubernetes', 'AWS', 'Azure',
      'GCP', 'SQL', 'MongoDB', 'GraphQL', 'REST API', 'CI/CD',
      'Agile', 'Scrum', 'TDD', 'Git', 'Redux', 'Sass', 'Less',
      'Webpack', 'Babel', 'Jest', 'Cypress', 'Jira', 'Confluence'
    ];
    
    const jobs = [];
    const now = new Date();
    
    for (let i = 1; i <= 24; i++) {
      const company = companies[Math.floor(Math.random() * companies.length)];
      const title = titles[Math.floor(Math.random() * titles.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];
      const isRemote = location.toLowerCase().includes('remote') || location.toLowerCase().includes('hybrid');
      const experienceLevels = ['Entry Level', 'Mid Level', 'Senior Level'];
      const experienceLevel = experienceLevels[Math.floor(Math.random() * experienceLevels.length)];
      const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Internship'];
      const type = jobTypes[Math.floor(Math.random() * jobTypes.length)];
      
      // Generate a random date within the last 30 days
      const postedDate = new Date(now);
      postedDate.setDate(now.getDate() - Math.floor(Math.random() * 30));
      
      // Generate a random salary range based on experience level
      let minSalary, maxSalary;
      switch (experienceLevel) {
        case 'Entry Level':
          minSalary = 50000 + Math.floor(Math.random() * 20000);
          maxSalary = minSalary + 10000 + Math.floor(Math.random() * 10000);
          break;
        case 'Mid Level':
          minSalary = 80000 + Math.floor(Math.random() * 30000);
          maxSalary = minSalary + 20000 + Math.floor(Math.random() * 20000);
          break;
        case 'Senior Level':
          minSalary = 120000 + Math.floor(Math.random() * 50000);
          maxSalary = minSalary + 40000 + Math.floor(Math.random() * 30000);
          break;
        default:
          minSalary = 50000 + Math.floor(Math.random() * 50000);
          maxSalary = minSalary + 20000 + Math.floor(Math.random() * 30000);
      }
      
      // Select random skills (2-5 skills per job)
      const jobSkills = [];
      const numSkills = 2 + Math.floor(Math.random() * 4);
      const availableSkills = [...skills];
      
      for (let j = 0; j < numSkills; j++) {
        if (availableSkills.length === 0) break;
        const skillIndex = Math.floor(Math.random() * availableSkills.length);
        jobSkills.push(availableSkills.splice(skillIndex, 1)[0]);
      }
      
      jobs.push({
        id: `job-${i}`,
        title,
        company: {
          id: company.id,
          name: company.name,
          logo: company.logo
        },
        location,
        isRemote,
        type,
        experienceLevel,
        salary: {
          min: minSalary,
          max: maxSalary,
          currency: 'USD',
          period: 'year'
        },
        description: `We are looking for a talented ${title} to join our team. In this role, you will be responsible for developing and maintaining high-quality software solutions. You should have a strong background in ${jobSkills[0]} and ${jobSkills[1]}, with experience in agile development environments.`,
        requirements: [
          `Bachelor's degree in Computer Science or related field`,
          `${experienceLevel === 'Entry Level' ? '0-2' : experienceLevel === 'Mid Level' ? '3-5' : '5+'} years of experience in a similar role`,
          `Strong proficiency in ${jobSkills.slice(0, 2).join(' and ')}`,
          'Excellent problem-solving and communication skills'
        ],
        responsibilities: [
          'Design, develop, and maintain software applications',
          'Collaborate with cross-functional teams to define and implement new features',
          'Write clean, maintainable, and efficient code',
          'Participate in code reviews and provide constructive feedback',
          'Troubleshoot, debug and upgrade existing systems'
        ],
        skills: jobSkills,
        postedDate: postedDate.toISOString(),
        featured: Math.random() > 0.7, // 30% chance of being featured
        urgent: Math.random() > 0.8, // 20% chance of being urgent
        applicants: Math.floor(Math.random() * 50)
      });
    }
    
    // Sort by date (newest first)
    return jobs.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
  }
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new TalentLinkApp();

  // Listen for auth state changes and update navbar
  window.addEventListener('authStateChange', (e) => {
    const isAuthenticated = e.detail?.isAuthenticated;
    window.app.updateAuthUI(isAuthenticated);
  });

  // On initial load, update navbar based on auth state
  let isAuthenticated = false;
  if (window.TalentLink && window.TalentLink.auth) {
    isAuthenticated = window.TalentLink.auth.isAuthenticated();
  } else {
    // Fallback: check localStorage
    const user = localStorage.getItem('user');
    isAuthenticated = !!user;
  }
  window.app.updateAuthUI(isAuthenticated);
  
  // Check for URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.has('q') && window.app.searchInput) {
    window.app.searchInput.value = urlParams.get('q');
  }
  
  if (urlParams.has('location') && window.app.locationInput) {
    window.app.locationInput.value = urlParams.get('location');
  }
  
  if (urlParams.has('type') && window.app.jobTypeFilter) {
    window.app.jobTypeFilter.value = urlParams.get('type');
  } else if (window.app.jobTypeFilter) {
    window.app.jobTypeFilter.value = '';
  }
  
  if (urlParams.has('exp') && window.app.experienceFilter) {
    window.app.experienceFilter.value = urlParams.get('exp');
  }
  
  if (urlParams.has('page')) {
    const page = parseInt(urlParams.get('page'));
    if (!isNaN(page) && page > 0) {
      window.app.currentPage = page;
    }
  }
  
  // Apply filters if any URL parameters are present
  if (window.location.search) {
    window.app.applyFilters();
  }
});
