/**
 * Jobs Module
 * Handles job-related functionality (search, filters, applications, etc.)
 */

const api = window.TalentLink && window.TalentLink.api;
const auth = window.TalentLink && window.TalentLink.auth;

class Jobs {
  constructor() {
    console.log('[Jobs] Jobs constructor called');
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.filters = {
      search: '',
      location: '',
      jobType: '',
      experience: '',
      salaryMin: '',
      salaryMax: '',
      remote: false,
      sortBy: 'newest'
    };
    
    // Set up storage event listener for cross-tab communication
    this.setupStorageListener();
    
    // Ensure window.app and window.app.api are set
    if (!window.app) window.app = {};
    if (!window.app.api && window.TalentLink && window.TalentLink.api) {
      window.app.api = window.TalentLink.api;
    }
    
    // Ensure window.app.user is set from localStorage if not already set
    if (!window.app.user) {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) window.app.user = user;
      } catch (e) {}
    }
    // Initialize if on jobs page or index page
    if (document.getElementById('jobList')) {
      this.init();
    } else if (document.querySelector('.job-list')) {
      // Initialize with empty filters for the index page
      this.jobList = document.querySelector('.job-list');
      this.pagination = document.createElement('div');
      this.pagination.className = 'pagination';
      this.jobList.parentNode.insertBefore(this.pagination, this.jobList.nextSibling);
      this.loadJobs();
    }
  }

  // Initialize jobs module
  init() {
    this.cacheElements();
    this.setupEventListeners();
    this.loadJobs();
    this.setupURLParams();
    
    // Add page visibility change listener to refresh jobs when user returns to page
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // User has returned to the page, refresh jobs to show updated listings
        console.log('[Jobs] Page became visible, refreshing jobs...');
        this.loadJobs();
      }
    });
  }

  // Cache DOM elements
  cacheElements() {
    this.jobList = document.getElementById('jobList');
    this.pagination = document.getElementById('pagination');
    this.searchForm = document.getElementById('searchForm');
    this.searchInput = document.getElementById('searchInput');
    this.locationInput = document.getElementById('locationInput');
    this.jobTypeFilter = document.getElementById('jobTypeFilter');
    this.experienceFilter = document.getElementById('experienceFilter');
    this.salaryMinFilter = document.getElementById('salaryMinFilter');
    this.salaryMaxFilter = document.getElementById('salaryMaxFilter');
    this.remoteFilter = document.getElementById('remoteFilter');
    this.sortBySelect = document.getElementById('sortBy');
    this.clearFiltersBtn = document.getElementById('clearFiltersBtn');
  }

  // Set up event listeners
  setupEventListeners() {
    // Search form submission
    if (this.searchForm) {
      this.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.applyFilters();
      });
    }

    // Filter changes
    const filterInputs = [
      this.jobTypeFilter,
      this.experienceFilter,
      this.salaryMinFilter,
      this.salaryMaxFilter,
      this.remoteFilter,
      this.sortBySelect
    ];

    filterInputs.forEach(input => {
      if (input) {
        input.addEventListener('change', () => this.applyFilters());
      }
    });

    // Clear filters button
    if (this.clearFiltersBtn) {
      this.clearFiltersBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.clearFilters();
      });
    }
  }

  // Set up URL parameters
  setupURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Get filters from URL
    this.filters = {
      search: urlParams.get('q') || '',
      location: urlParams.get('location') || '',
      jobType: urlParams.get('job_type') || '',
      experience: urlParams.get('exp') || '',
      salaryMin: urlParams.get('salary_min') || '',
      salaryMax: urlParams.get('salary_max') || '',
      remote: urlParams.get('remote') === 'true',
      sortBy: urlParams.get('sort') || 'newest'
    };
    
    // Update form fields
    if (this.searchInput) this.searchInput.value = this.filters.search;
    if (this.locationInput) this.locationInput.value = this.filters.location;
    if (this.jobTypeFilter) this.jobTypeFilter.value = this.filters.jobType;
    if (this.experienceFilter) this.experienceFilter.value = this.filters.experience;
    if (this.salaryMinFilter) this.salaryMinFilter.value = this.filters.salaryMin;
    if (this.salaryMaxFilter) this.salaryMaxFilter.value = this.filters.salaryMax;
    if (this.remoteFilter) this.remoteFilter.checked = this.filters.remote;
    if (this.sortBySelect) this.sortBySelect.value = this.filters.sortBy;
    
    // Get page number
    const page = parseInt(urlParams.get('page')) || 1;
    this.currentPage = page > 0 ? page : 1;
  }

  // Apply filters and load jobs
  async applyFilters() {
    // Update filters from form
    this.filters = {
      search: this.searchInput ? this.searchInput.value.trim() : '',
      location: this.locationInput ? this.locationInput.value.trim() : '',
      jobType: this.jobTypeFilter ? this.jobTypeFilter.value : '',
      experience: this.experienceFilter ? this.experienceFilter.value : '',
      salaryMin: this.salaryMinFilter ? this.salaryMinFilter.value : '',
      salaryMax: this.salaryMaxFilter ? this.salaryMaxFilter.value : '',
      remote: this.remoteFilter ? this.remoteFilter.checked : false,
      sortBy: this.sortBySelect ? this.sortBySelect.value : 'newest'
    };
    
    // Reset to first page when filters change
    this.currentPage = 1;
    
    // Update URL
    this.updateURL();
    
    // Load jobs with new filters
    await this.loadJobs();
  }

  // Clear job-related caches
  clearJobCaches() {
    // Clear any cached job data in localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('jobs_') || key === 'jobListings' || key === 'lastJobUpdate') {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Notify other tabs that jobs have been updated
    localStorage.setItem('jobListingsUpdated', Date.now().toString());
    
    // Force clear any in-memory caches
    if (window.TalentLink && window.TalentLink.api && typeof window.TalentLink.api.clearCaches === 'function') {
      window.TalentLink.api.clearCaches();
    }
  }
  
  // Set up storage event listener for cross-tab communication
  setupStorageListener() {
    window.addEventListener('storage', (event) => {
      if (event.key === 'jobListingsUpdated') {
        console.log('[Jobs] Received job listings update from another tab, refreshing...');
        this.loadJobs();
      }
    });
  }
  
  // Clear all filters
  clearFilters() {
    // Reset filter values
    this.filters = {
      search: '',
      location: '',
      jobType: '',
      experience: '',
      salaryMin: '',
      salaryMax: '',
      remote: false,
      sortBy: 'newest'
    };
    
    // Reset form fields
    if (this.searchInput) this.searchInput.value = '';
    if (this.locationInput) this.locationInput.value = '';
    if (this.jobTypeFilter) this.jobTypeFilter.value = '';
    if (this.experienceFilter) this.experienceFilter.value = '';
    if (this.salaryMinFilter) this.salaryMinFilter.value = '';
    if (this.salaryMaxFilter) this.salaryMaxFilter.value = '';
    if (this.remoteFilter) this.remoteFilter.checked = false;
    if (this.sortBySelect) this.sortBySelect.value = 'newest';
    
    // Update URL and reload jobs
    this.currentPage = 1;
    this.updateURL();
    this.loadJobs();
  }

  // Update URL with current filters
  updateURL() {
    const params = new URLSearchParams();
    
    // Add filters to URL parameters
    if (this.filters.search) params.set('q', this.filters.search);
    if (this.filters.location) params.set('location', this.filters.location);
    if (this.filters.jobType) params.set('job_type', this.filters.jobType);
    // Comment out experience filter if not supported by backend
    // if (this.filters.experience) params.set('exp', this.filters.experience);
    if (this.filters.salaryMin) params.set('salary_min', this.filters.salaryMin);
    if (this.filters.salaryMax) params.set('salary_max', this.filters.salaryMax);
    if (this.filters.remote) params.set('remote', 'true');
    if (this.filters.sortBy !== 'newest') params.set('sort', this.filters.sortBy);
    if (this.currentPage > 1) params.set('page', this.currentPage);
    
    // Update URL without page reload
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.pushState({}, '', newUrl);
  }

  // Load jobs from API
  async loadJobs() {
    try {
      this.showLoading();
      
      // Clear job-related caches to ensure fresh data
      if (window.TalentLink && window.TalentLink.api && window.TalentLink.api.clearJobCaches) {
        window.TalentLink.api.clearJobCaches();
      }
      
      const api = window.TalentLink?.api || new ApiService();
      
      // Prepare API parameters
      const params = {
        page: this.currentPage,
        page_size: this.itemsPerPage,
        job_type: this.filters.jobType,
        remote: this.filters.remote,
        sort: this.filters.sortBy !== 'newest' ? this.filters.sortBy : undefined,
        // Add more mappings as needed
      };
      
      // Clean up params (remove empty values)
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });
      
      // Fetch jobs from API
      if (!api) {
        console.error('[Jobs] API is not available');
        return;
      }
      const response = await api.jobs.getAll(params);
      console.log('[Jobs] jobs API response:', response);
      
      let jobs = response.results || response;
      
      // Filter out jobs that the user has already applied to
      const currentUser = window.app ? window.app.user : JSON.parse(localStorage.getItem('user') || '{}');
      if (currentUser && currentUser.id && (currentUser.user_type === 'candidate' || currentUser.user_type === 'job_seeker' || currentUser.is_candidate)) {
        try {
          const myApplications = await api.jobs.getMyApplications();
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
          
          console.log('[Jobs] Filtered out', appliedJobIds.length, 'already applied jobs');
        } catch (error) {
          console.warn('[Jobs] Could not load user applications for filtering:', error);
        }
      }
      
      // Render jobs
      this.renderJobs(jobs);
      
      // Render pagination if pagination element exists
      if (this.pagination) {
        if (response.count > 0) {
          this.renderPagination(response.count);
        } else {
          this.pagination.innerHTML = '';
        }
      }
      
    } catch (error) {
      console.error('Error loading jobs:', error);
      this.showError('Failed to load jobs. Please try again later.');
    }
  }

  // Render jobs list
  renderJobs(jobs) {
    const jobListContainer = this.jobList || document.querySelector('.job-list');
    
    if (!jobs || jobs.length === 0) {
      const noResultsHtml = `
        <div class="no-results">
          <i class="material-icons">search_off</i>
          <h3>No jobs found</h3>
          <p>There are currently no job openings. Please check back later.</p>
        </div>
      `;
      
      if (jobListContainer) {
        jobListContainer.innerHTML = noResultsHtml;
      }
      return;
    }
    
    // Generate job cards HTML
    const jobsHtml = jobs.map(job => this.createJobCard(job)).join('');
    
    if (jobListContainer) {
      jobListContainer.innerHTML = jobsHtml;
      
      // Add event listeners to job cards
      this.setupJobCardInteractions();
    }
  }

  // Create HTML for a job card
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
    
    // Get current user from localStorage or global app instance
    const currentUser = window.app ? window.app.user : JSON.parse(localStorage.getItem('user') || '{}');
    
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
              ${currentUser && (currentUser.user_type === 'candidate' || currentUser.user_type === 'job_seeker' || currentUser.is_candidate) ? `
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

  // Set up interactions for job cards
  setupJobCardInteractions() {
    // Handle save job button clicks
    document.addEventListener('click', async (e) => {
      const saveBtn = e.target.closest('.btn-save');
      if (saveBtn) {
        e.preventDefault();
        e.stopPropagation();
        const jobId = saveBtn.dataset.jobId;
        await this.toggleSaveJob(jobId, saveBtn);
      }
    });

    // Handle apply button clicks - redirect to application page
    document.addEventListener('click', (e) => {
      const applyBtn = e.target.closest('.btn-apply');
      if (applyBtn) {
        e.preventDefault();
        e.stopPropagation();
        const jobId = applyBtn.dataset.jobId;
        
        // Check if user is logged in
        const user = window.app && window.app.user ? window.app.user : 
                   JSON.parse(localStorage.getItem('user') || 'null');
        
        if (!user || !user.id) {
          // Redirect to login with return URL
          window.location.href = `login.html?redirect=${encodeURIComponent(`application.html?jobId=${jobId}`)}`;
          return;
        }
        
        // Check user type
        if (!(user.user_type === 'candidate' || user.user_type === 'job_seeker' || user.is_candidate)) {
          alert('Only job seekers can apply for jobs.');
          return;
        }
        
        // Redirect to application page
        window.location.href = `application.html?jobId=${jobId}`;
      }
    });
    
    // Click on job card to view details
    document.querySelectorAll('.job-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't navigate if clicking on action buttons or their children
        if (!e.target.closest('.btn-save') && !e.target.closest('.btn-apply')) {
          const jobId = card.dataset.jobId;
          window.location.href = `job-details.html?id=${jobId}`;
        }
      });
    });
  }

  // Toggle save job
  async toggleSaveJob(e, jobId) {
    if (!auth.isAuthenticated()) {
      // Redirect to login with return URL
      window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }
    
    const button = e.currentTarget;
    const jobIdToSave = jobId || button.dataset.jobId;
    
    try {
      await api.jobs.toggleSave(jobIdToSave);
      
      // Toggle save state
      const isSaved = button.classList.contains('saved');
      button.classList.toggle('saved');
      button.innerHTML = `
        <i class="material-icons">${isSaved ? 'bookmark_border' : 'bookmark'}</i>
        ${isSaved ? 'Save' : 'Saved'}
      `;
      
      // Dispatch event
      const event = new CustomEvent('jobSaved', { 
        detail: { jobId: jobIdToSave, saved: !isSaved }
      });
      window.dispatchEvent(event);
      
    } catch (error) {
      console.error('Error saving job:', error);
      alert('Failed to save job. Please try again.');
    }
  }

  // Check if a job is saved
  isJobSaved(jobId) {
    // In a real app, you would check this against the API
    const savedJobs = JSON.parse(localStorage.getItem('savedJobs') || '[]');
    return savedJobs.includes(jobId);
  }

  // Render pagination
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
        this.updateURL();
        this.loadJobs();
        window.scrollTo({ top: this.jobList.offsetTop - 100, behavior: 'smooth' });
      });
    });
  }

  // Show loading state
  showLoading() {
    if (this.jobList) {
      this.jobList.innerHTML = `
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading jobs...</p>
        </div>
      `;
    } else if (document.querySelector('.job-list')) {
      document.querySelector('.job-list').innerHTML = `
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading jobs...</p>
        </div>
      `;
    }
  }

  // Handle job application
  async handleJobApplication(jobId) {
    // Clear caches before applying
    this.clearJobCaches();
    const currentUser = window.app ? window.app.user : JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!currentUser || !(currentUser.user_type === 'candidate' || currentUser.user_type === 'job_seeker' || currentUser.is_candidate)) {
      this.showNotification('Please log in as a job seeker to apply for jobs.', 'error');
      return;
    }

    try {
      // Show loading state
      const applyBtn = document.querySelector(`.btn-apply[data-job-id="${jobId}"]`);
      if (applyBtn) {
        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="material-icons">hourglass_empty</i> Applying...';
      }

      // Call the API to apply for the job
      const response = await this.api.jobs.apply(jobId);
      
      // Show success message
      this.showNotification('Application submitted successfully!', 'success');
      
      // Update button state
      if (applyBtn) {
        applyBtn.innerHTML = '<i class="material-icons">check_circle</i> Applied';
        applyBtn.classList.add('applied');
      }
    } catch (error) {
      console.error('Error applying for job:', error);
      this.showNotification(
        error.response?.data?.message || 'Failed to submit application. Please try again.',
        'error'
      );
      
      // Reset button state on error
      const applyBtn = document.querySelector(`.btn-apply[data-job-id="${jobId}"]`);
      if (applyBtn) {
        applyBtn.disabled = false;
        applyBtn.innerHTML = '<i class="material-icons">send</i> Apply Now';
      }
    }
  }

  // Show error message
  showError(message) {
    this.jobList.innerHTML = `
      <div class="error-message">
        <i class="material-icons">error_outline</i>
        <p>${message}</p>
        <button class="btn btn-outline" onclick="jobs.loadJobs()">Retry</button>
      </div>
    `;
  }

  // Format job type
  formatJobType(type) {
    if (!type) return 'Full-time';
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  // Format experience level
  formatExperience(level) {
    if (!level) return 'Not specified';
    return level.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  // Format salary period
  formatSalaryPeriod(period) {
    const periods = {
      'year': 'per year',
      'month': 'per month',
      'week': 'per week',
      'day': 'per day',
      'hour': 'per hour'
    };
    
    return periods[period] || period;
  }

  // Generate random color for company logo
  getRandomColor() {
    const colors = [
      '#4361ee', '#3f37c9', '#4895ef', '#4cc9f0', '#4cc9f0',
      '#4cc9f0', '#4cc9f0', '#4cc9f0', '#4cc9f0', '#4cc9f0'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

// Export the Jobs class
export { Jobs };

// Create and export a singleton instance
const jobs = new Jobs();

// Make it available globally
if (typeof window !== 'undefined') {
    window.jobs = jobs;
}
export default jobs;
