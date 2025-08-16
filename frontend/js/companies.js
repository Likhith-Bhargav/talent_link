/**
 * Companies Module
 * Handles company listing and display
 */

class Companies {
  constructor() {
    console.log('Initializing Companies module');
    this.currentPage = 1;
    this.itemsPerPage = 9; // Show 9 companies in a 3x3 grid
    this.filters = {
      search: '',
      industry: '',
      size: '',
      sortBy: 'name'
    };
    
    // Initialize if on index page
    if (document.querySelector('.companies-list')) {
      this.jobList = document.querySelector('.companies-list');
      this.pagination = document.createElement('div');
      this.pagination.className = 'pagination';
      this.jobList.parentNode.insertBefore(this.pagination, this.jobList.nextSibling);
      this.loadCompanies();
    }
  }

  // Get current employer's company ID
  async getEmployerCompanyId() {
    try {
      const auth = window.TalentLink?.auth;
      const api = window.TalentLink?.api;
      
      if (!auth?.currentUser) {
        console.log('No current user found');
        return null;
      }
      
      console.log('Current user:', {
        userType: auth.currentUser.user_type,
        companyId: auth.currentUser.company_id,
        company: auth.currentUser.company
      });
      
      // Check if user is an employer/recruiter
      const isEmployer = auth.currentUser.user_type === 'employer' || 
                        auth.currentUser.user_type === 'recruiter';
      
      if (!isEmployer) {
        console.log('User is not an employer or recruiter');
        return null;
      }
      
      // Try to get company ID from user object
      let companyId = auth.currentUser.company_id || 
                     (auth.currentUser.company && auth.currentUser.company.id);
      
      // If company ID is not found, try to fetch user profile
      if (!companyId && api) {
        console.log('Company ID not found in user object, fetching user profile...');
        try {
          const userProfile = await api.users.getCurrentUser();
          console.log('Fetched user profile:', userProfile);
          companyId = userProfile.company_id || 
                     (userProfile.company && userProfile.company.id);
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
      
      console.log('Employer check:', { isEmployer, companyId });
      return companyId ? companyId.toString() : null;
    } catch (error) {
      console.error('Error getting employer company ID:', error);
      return null;
    }
  }
  
  // Load companies from API
  async loadCompanies() {
    try {
      this.showLoading();
      
      const api = window.TalentLink?.api;
      const auth = window.TalentLink?.auth;
      
      if (!api || !auth) {
        console.error('[Companies] API or Auth is not available');
        return;
      }
      
      // Get current user's info
      const currentUser = auth.currentUser;
      const isRecruiter = currentUser?.user_type === 'recruiter' || 
                         currentUser?.user_type === 'employer';
      
      console.log('Current user type:', currentUser?.user_type);
      console.log('Current user object:', JSON.parse(JSON.stringify(currentUser)));
      
      // Prepare API parameters
      const params = {
        page: this.currentPage,
        page_size: this.itemsPerPage,
        search: this.filters.search,
        industry: this.filters.industry,
        size: this.filters.size,
        ordering: this.filters.sortBy
      };
      
      // If user is a recruiter/employer, only show their company
      if (isRecruiter) {
        // First, try to get company ID from the user's profile
        let companyId = currentUser.company_id;
        
        // Check if company is directly in the user object as an ID
        if (!companyId && currentUser.company) {
          // Handle case where company is a direct ID (number or string)
          if (typeof currentUser.company === 'number' || 
              (typeof currentUser.company === 'string' && !isNaN(currentUser.company))) {
            companyId = parseInt(currentUser.company, 10);
          } 
          // Handle case where company is an object with an id property
          else if (currentUser.company && typeof currentUser.company === 'object' && 'id' in currentUser.company) {
            companyId = currentUser.company.id;
          }
        }
        
        // Check company_details if available (new structure)
        if (!companyId && currentUser.company_details && currentUser.company_details.id) {
          companyId = currentUser.company_details.id;
        }
        
        // If still not found, try to get from companies array
        if (!companyId && currentUser.companies && currentUser.companies.length > 0) {
          companyId = currentUser.companies[0].id;
        }
        
        console.log('Company ID resolution:', {
            user_id: currentUser.id,
            user_type: currentUser.user_type,
            company_id: currentUser.company_id,
            company: currentUser.company,
            company_type: typeof currentUser.company,
            companies: currentUser.companies,
            resolved_company_id: companyId,
            all_user_props: Object.keys(currentUser).reduce((acc, key) => {
              acc[key] = typeof currentUser[key];
              return acc;
            }, {})
        });
        
        // If not found, try to fetch the company mapping from the API
        if (!companyId) {
          try {
            console.log('Fetching company mapping for recruiter...');
            console.log('Fetching company mapping from:', '/api/recruiter-companies/');
            const response = await api.get('/api/recruiter-companies/');
            console.log('Recruiter companies response:', {
              response: response,
              type: typeof response,
              isArray: Array.isArray(response),
              hasResults: response && response.results !== undefined,
              keys: response ? Object.keys(response) : []
            });
            
            // Handle both array response and paginated response
            let results = [];
            if (Array.isArray(response)) {
              results = response;
            } else if (response && Array.isArray(response.results)) {
              results = response.results;
            } else if (response && response.data) {
              // Handle case where response is wrapped in a data property
              results = Array.isArray(response.data) ? response.data : [response.data];
            }
            
            if (results.length > 0) {
              const mapping = results[0];
              companyId = mapping.company_id || (mapping.company && mapping.company.id);
              console.log('Found company ID from API:', companyId);
              
              // Update the user object with the company ID for future use
              if (currentUser) {
                currentUser.company_id = companyId;
                currentUser.company = mapping.company;
              }
            }
          } catch (error) {
            console.error('Error fetching recruiter companies:', error);
          }
        }
        
        if (companyId) {
          console.log('Filtering companies for recruiter/employer with company ID:', companyId);
          params.id = String(companyId);
          params.page_size = 1;
        } else {
          console.warn('No company ID found for recruiter/employer user:', currentUser);
          this.jobList.innerHTML = `
            <div class="alert alert-warning">
              <h4>No Company Associated</h4>
              <p>Your employer account is not associated with any company. Please contact the administrator.</p>
            </div>
          `;
          return;
        }
      }
      
      // Clean up params (remove empty values)
      Object.keys(params).forEach(key => {
        if (!params[key] && params[key] !== 0) {
          delete params[key];
        }
      });
      
      console.log('Fetching companies with params:', params);
      
      // Log the actual API URL being called
      const baseUrl = api.companies.baseURL || '';
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      console.log(`API URL: ${baseUrl}?${queryString}`);
      
      // Fetch companies from API
      console.log('Making API call with params:', params);
      const response = await api.companies.getAll(params);
      console.log('API response:', response);
      let companies = response.results || response;
      
      // Render companies
      this.renderCompanies(companies);
      
      // Render pagination if needed
      if (this.pagination && response.count > 0) {
        this.renderPagination(response.count);
      } else if (this.pagination) {
        this.pagination.innerHTML = '';
      }
      
    } catch (error) {
      console.error('Error loading companies:', error);
      this.showError('Failed to load companies. Please try again later.');
    }
  }
  
  // Render companies list
  renderCompanies(companies) {
    const container = this.jobList || document.querySelector('.companies-list');
    
    if (!companies || companies.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <i class="material-icons">business</i>
          <h3>No companies found</h3>
          <p>There are currently no companies listed. Please check back later.</p>
        </div>
      `;
      return;
    }
    
    // Generate company cards HTML
    const companiesHtml = `
      <div class="companies-grid">
        ${companies.map(company => this.createCompanyCard(company)).join('')}
      </div>
    `;
    
    // Update the companies list
    container.innerHTML = companiesHtml;
    
    // Set up interactions for the newly rendered company cards
    this.setupCompanyCardInteractions();
    
    // Debug: Log the number of company cards and add-recruiter buttons
    console.log('Rendered', document.querySelectorAll('.company-card').length, 'company cards');
    console.log('Found', document.querySelectorAll('.add-recruiter-btn').length, 'Add Recruiter buttons');
  }
  
  // Check if current user is a superuser
  isSuperuser() {
    try {
      const auth = window.TalentLink?.auth;
      if (!auth) {
        console.log('Auth module not found');
        return false;
      }
      
      // If auth is there but currentUser isn't loaded yet, try to get it
      if (!auth.currentUser && auth.getCurrentUser) {
        const user = auth.getCurrentUser();
        if (user) {
          auth.currentUser = user;
        }
      }
      
      const isSuperuser = auth.currentUser && 
                        (auth.currentUser.is_superuser === true || 
                         auth.currentUser.is_superuser === 'true' ||
                         auth.currentUser.is_staff === true ||
                         auth.currentUser.is_staff === 'true');
      
      console.log('isSuperuser check:', {
        currentUser: auth.currentUser,
        is_superuser: auth.currentUser?.is_superuser,
        is_staff: auth.currentUser?.is_staff,
        result: isSuperuser
      });
      
      return isSuperuser;
    } catch (error) {
      console.error('Error checking superuser status:', error);
      return false;
    }
  }

  // Create HTML for a company card
  createCompanyCard(company) {
    const companyInitial = company.name ? company.name.charAt(0).toUpperCase() : '?';
    const industry = company.industry 
      ? company.industry.charAt(0).toUpperCase() + company.industry.slice(1).toLowerCase() 
      : 'Not specified';
    const size = company.size ? this.formatCompanySize(company.size) : 'Not specified';
    const jobCount = company.job_count || 0;
    const companySize = company.company_size ? this.formatCompanySize(company.company_size) : 'Not specified';
    const isSuperuser = this.isSuperuser();
    const isEmployer = window.TalentLink?.auth?.isEmployer?.() || false;
    const showAddRecruiter = isSuperuser || isEmployer;
    const hasLogo = Boolean(company.logo);
    
    return `
      <div class="company-card" data-id="${company.id}">
        <div class="company-logo ${hasLogo ? 'has-image' : ''}" style="${!hasLogo ? `background: ${this.getRandomColor()}` : ''}">
          ${hasLogo ? 
            `<img src="${company.logo}" alt="${company.name}">` : 
            companyInitial
          }
        </div>
        <div class="company-details">
          <h3 class="company-name">${company.name || 'Unnamed Company'}</h3>
          <p>
            <i class="material-icons">business</i>
            <span>${industry}</span>
          </p>
          <p>
            <i class="material-icons">people</i>
            <span>${companySize}</span>
          </p>
          <p>
            <i class="material-icons">work_outline</i>
            <span>${jobCount} ${jobCount === 1 ? 'Job' : 'Jobs'}</span>
          </p>
        </div>
        <div class="company-actions">
          <a href="jobs.html?company_id=${company.id}" class="btn btn-outline view-jobs">
            <i class="material-icons">work_outline</i> View Jobs
          </a>
          ${showAddRecruiter ? `
            <button class="btn btn-primary add-recruiter-btn" data-company-id="${company.id}" data-company-name="${company.name || 'this company'}">
              <i class="material-icons">person_add</i> Add Recruiter
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  // Format company size for display
  formatCompanySize(size) {
    const sizes = {
      '1-10': '1-10 employees',
      '11-50': '11-50 employees',
      '51-200': '51-200 employees',
      '201-500': '201-500 employees',
      '501-1000': '501-1,000 employees',
      '1001-5000': '1,001-5,000 employees',
      '5001-10000': '5,001-10,000 employees',
      '10001+': '10,000+ employees'
    };
    return sizes[size] || size;
  }
  
  // Show recruiter signup modal
  showRecruiterModal(companyId, companyName) {
    console.log('showRecruiterModal called with:', { companyId, companyName });
    // Create modal if it doesn't exist
    let modal = document.getElementById('recruiterModal');
    
    if (!modal) {
      console.log('Creating new recruiter modal');
      modal = document.createElement('div');
      modal.id = 'recruiterModal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; margin: 2rem auto; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
          <span class="close-modal" style="position: absolute; top: 1rem; right: 1.5rem; font-size: 1.5rem; cursor: pointer;">&times;</span>
          <h2 style="margin-bottom: 1.5rem; color: #1a1a1a;">Add Recruiter for ${companyName}</h2>
          <form id="recruiterForm" style="margin-top: 1.5rem;">
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label for="username" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333;">Username</label>
              <input type="text" id="username" name="username" required 
                     style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
            </div>
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label for="email" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333;">Email</label>
              <input type="email" id="email" name="email" required 
                     style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
            </div>
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label for="first_name" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333;">First Name</label>
              <input type="text" id="first_name" name="first_name" required 
                     style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
            </div>
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label for="last_name" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333;">Last Name</label>
              <input type="text" id="last_name" name="last_name" required 
                     style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
            </div>
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label for="password1" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333;">Password</label>
              <input type="password" id="password1" name="password1" required minlength="8" 
                     style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
            </div>
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label for="password2" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333;">Confirm Password</label>
              <input type="password" id="password2" name="password2" required minlength="8" 
                     style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
            </div>
            <!-- Hidden field to ensure user_type is set to employer -->
            <input type="hidden" name="user_type" value="employer">
            <button type="submit" class="btn btn-primary" 
                    style="width: 100%; padding: 0.75rem; background-color: #4a6cf7; color: white; border: none; border-radius: 4px; font-size: 1rem; font-weight: 500; cursor: pointer; transition: background-color 0.2s;">
              <span class="btn-text">Create Recruiter</span>
              <span class="btn-loading" style="display: none;">Creating...</span>
            </button>
            <div id="recruiterFormMessage" class="message" style="margin-top: 1rem; padding: 0.75rem; border-radius: 4px; text-align: center; display: none;"></div>
          </form>
        </div>
      `;
      document.body.appendChild(modal);
      
      // Close modal when clicking the X
      modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.classList.remove('show');
      });
      
      // Close modal when clicking outside the modal content
      window.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('show');
        }
      });
      
      // Handle form submission
      const form = modal.querySelector('#recruiterForm');
      const messageDiv = document.getElementById('recruiterFormMessage');
      
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(form);
        const userData = {
          username: formData.get('username'),
          email: formData.get('email'),
          first_name: formData.get('first_name'),
          last_name: formData.get('last_name'),
          password1: formData.get('password1'),
          password2: formData.get('password2'),
          user_type: 'employer',  // Using 'employer' as the user type for recruiters
          company_id: companyId
        };
        
        // Validate passwords match
        if (userData.password1 !== userData.password2) {
          showMessage('error', 'Passwords do not match');
          return;
        }
        
        // Validate password length
        if (userData.password1.length < 8) {
          showMessage('error', 'Password must be at least 8 characters long');
          return;
        }
        
        // Disable the submit button and show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        
        try {
          console.log('Creating recruiter with data:', userData);
          
          // Register the user - this will also create the recruiter-company mapping
          const response = await window.TalentLink.api.auth.register(userData);
          console.log('User created successfully:', response);
          
          if (!response || !response.user_id) {
            throw new Error('Failed to create user or retrieve user ID');
          }
          
          console.log('Recruiter created and mapped to company successfully');
          console.log('Company mapping created:', response.company_mapping_created || false);
          
          // Show success message
          showMessage('success', 'Recruiter created and assigned to company successfully!');
          
          // Close the modal after a short delay
          setTimeout(() => {
            modal.classList.remove('show');
            form.reset();
            
            // Refresh the page to show the new recruiter
            window.location.reload();
          }, 1500);
          
        } catch (error) {
          console.error('Error creating recruiter:', error);
          let errorMessage = 'Failed to create recruiter. ';
          
          // Handle different types of errors
          if (error.response) {
            // Handle validation errors from the API
            if (error.response.data) {
              // Handle field-specific errors
              if (typeof error.response.data === 'object') {
                const errorMessages = [];
                for (const [field, errors] of Object.entries(error.response.data)) {
                  errorMessages.push(`${field}: ${Array.isArray(errors) ? errors.join(' ') : errors}`);
                }
                errorMessage += errorMessages.join('\n');
              } else if (error.response.data.detail) {
                errorMessage += error.response.data.detail;
              } else {
                errorMessage += JSON.stringify(error.response.data);
              }
            } else {
              errorMessage += `Status: ${error.response.status}`;
            }
          } else if (error.request) {
            errorMessage += 'No response from server. Please check your connection.';
          } else {
            errorMessage += error.message;
          }
          
          showMessage('error', errorMessage);
        } finally {
          // Re-enable the submit button
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      });
      
      // Helper function to show messages
      function showMessage(message, type = 'error') {
        if (!messageDiv) return;
        
        messageDiv.textContent = message;
        messageDiv.className = 'message';
        messageDiv.classList.add(type);
        messageDiv.style.display = 'block';
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
          setTimeout(() => {
            messageDiv.style.display = 'none';
          }, 5000);
        }
      }
    }
    
    // Show the modal by adding the 'show' class
    console.log('Showing modal');
    modal.classList.add('show');
    console.log('Modal classes after show:', modal.className);
  }

  // Set up interactions for company cards
  setupCompanyCardInteractions() {
    console.log('Setting up company card interactions...');
    
    // Use event delegation for dynamically added elements
    document.addEventListener('click', (e) => {
      console.log('Document click event triggered', e.target);
      
      // Check if the clicked element or its parent has the add-recruiter-btn class
      const button = e.target.closest('.add-recruiter-btn');
      console.log('Button found:', button);
      
      if (button) {
        console.log('Add recruiter button clicked');
        e.preventDefault();
        e.stopPropagation();
        
        const companyId = button.dataset.companyId;
        const companyName = button.dataset.companyName || 'this company';
        
        console.log('Button dataset:', button.dataset);
        
        if (companyId) {
          console.log('Add recruiter clicked for company ID:', companyId);
          this.showRecruiterModal(companyId, companyName);
        } else {
          console.error('No company ID found for the add recruiter button');
        }
      } else {
        console.log('Clicked element is not an add-recruiter button');
      }
    }, true); // Use capture phase to catch events earlier
    
    // Also try direct event listeners as a fallback
    setTimeout(() => {
      const buttons = document.querySelectorAll('.add-recruiter-btn');
      console.log(`Found ${buttons.length} add-recruiter buttons`);
      
      buttons.forEach(button => {
        button.addEventListener('click', (e) => {
          console.log('Direct click on add-recruiter button');
          e.preventDefault();
          e.stopPropagation();
          
          const companyId = button.dataset.companyId;
          const companyName = button.dataset.companyName || 'this company';
          
          if (companyId) {
            console.log('Direct click - Add recruiter for company ID:', companyId);
            this.showRecruiterModal(companyId, companyName);
          }
        });
      });
    }, 1000); // Wait a bit for dynamic content to load
    
    console.log('Company card interactions initialized with event delegation');
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
        this.loadCompanies();
        window.scrollTo({ top: this.jobList.offsetTop - 100, behavior: 'smooth' });
      });
    });
  }
  
  // Show loading state
  showLoading() {
    const container = this.jobList || document.querySelector('.companies-list');
    if (container) {
      container.innerHTML = `
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading companies...</p>
        </div>
      `;
    }
  }
  
  // Show error message
  showError(message) {
    const container = this.jobList || document.querySelector('.companies-list');
    if (container) {
      container.innerHTML = `
        <div class="error-message">
          <i class="material-icons">error_outline</i>
          <p>${message}</p>
          <button class="btn btn-outline" onclick="window.companies.loadCompanies()">Retry</button>
        </div>
      `;
    }
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

// Export the Companies class
export { Companies };

// Create and export a singleton instance
const companies = new Companies();

// Make it available globally
if (typeof window !== 'undefined') {
    window.companies = companies;
}

export default companies;
