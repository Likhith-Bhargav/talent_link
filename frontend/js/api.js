/**
 * API Service for TalentLink Frontend
 * Handles all HTTP requests to the backend API
 */

// Backend API base URL
const API_BASE_URL = 'http://localhost:8000/api';

// API service for handling all HTTP requests
class ApiService {
  constructor() {
    this.baseUrl = 'http://localhost:8000/api';
    this.token = localStorage.getItem('token') || null;
    this.csrfToken = null;
    this.pendingRequests = [];
    this.isRefreshing = false;
    
    // Initialize with CSRF token if available
    this.getCSRFToken();
  }

  // Set the auth token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }
  
  // Set CSRF token
  setCSRFToken(token) {
    this.csrfToken = token;
  }
  
  // Get CSRF token
  getCSRFToken() {
    // Try to get from cookie if not set
    if (!this.csrfToken) {
      const cookieMatch = document.cookie.match(/csrftoken=([^;]+)/);
      if (cookieMatch) {
        this.csrfToken = cookieMatch[1];
      }
    }
    return this.csrfToken;
  }

  // Get auth headers
  getAuthHeaders(contentType = 'application/json') {
    const headers = {};
    
    // Only set Content-Type if not FormData
    if (contentType && !(contentType instanceof FormData)) {
      headers['Content-Type'] = contentType;
    }
    
    // Add CSRF token for all mutating requests
    const csrfToken = this.getCSRFToken();
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }

    // Add auth token if available
    if (this.token) {
      headers['Authorization'] = `Token ${this.token}`;
    }

    return headers;
  }

  // Process response data
  async processResponse(response) {
    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }
    
    // Try to parse JSON, but don't fail if response is empty
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch (e) {
        console.error('Failed to parse JSON response', e);
        responseData = {};
      }
    } else if (contentType && contentType.includes('text/')) {
      responseData = await response.text();
    } else {
      // For other content types (like file downloads), return the response as is
      return response;
    }
    
    // Handle error responses
    if (!response.ok) {
      const error = new Error(responseData.detail || responseData.message || 'Something went wrong');
      error.status = response.status;
      error.response = responseData;
      throw error;
    }
    
    return responseData;
  }

  // Normalize error responses
  normalizeError(error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;
      
      const normalizedError = new Error(data?.detail || 'An error occurred');
      normalizedError.status = status;
      normalizedError.data = data;
      
      // Handle different error formats
      if (data) {
        if (data.non_field_errors) {
          normalizedError.message = Array.isArray(data.non_field_errors) 
            ? data.non_field_errors[0]
            : data.non_field_errors;
        } else if (typeof data === 'string') {
          normalizedError.message = data;
        } else if (typeof data === 'object') {
          // Get the first error message from the response
          const errorKey = Object.keys(data)[0];
          if (errorKey) {
            const errorValue = data[errorKey];
            normalizedError.message = Array.isArray(errorValue)
              ? errorValue[0]
              : String(errorValue);
          }
        }
      }
      
      return normalizedError;
    } else if (error.request) {
      // The request was made but no response was received
      const networkError = new Error('No response from server. Please check your internet connection.');
      networkError.isNetworkError = true;
      return networkError;
    }
    
    // Something happened in setting up the request that triggered an Error
    return error;
  }
  
  // Handle API response
  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    let data;
    
    try {
      data = contentType?.includes('application/json') 
        ? await response.json() 
        : await response.text();
    } catch (error) {
      data = {};
    }
    
    if (!response.ok) {
      const error = new Error(data?.detail || 'An error occurred');
      error.response = response;
      error.status = response.status;
      error.data = data;
      throw error;
    }
    
    return data;
  }

  // Generic request method
  async request(method, endpoint, data = null, options = {}) {
    let url;
    if (endpoint.startsWith('http')) {
      url = endpoint;
    } else if (endpoint.startsWith('/api/')) {
      // If it starts with /api/, use the full URL
      url = `http://localhost:8000${endpoint}`;
    } else if (endpoint.startsWith('/')) {
      // If it starts with /, prepend the base URL
      url = `${this.baseUrl}${endpoint}`;
    } else {
      url = `${this.baseUrl}/${endpoint}`;
    }
    
    // Determine content type
    let contentType = 'application/json';
    if (data instanceof FormData) {
      contentType = null; // Let the browser set the content type with boundary
    } else if (options.headers && options.headers['Content-Type']) {
      contentType = options.headers['Content-Type'];
    }
    
    // Prepare request config
    const config = {
      method: method.toUpperCase(),
      headers: this.getAuthHeaders(contentType),
      credentials: 'include', // Important for cookies
      ...options,
      // Override headers after spreading options to ensure our headers take precedence
      headers: {
        ...this.getAuthHeaders(contentType),
        ...(options.headers || {})
      }
    };
    
    // Handle request data
    if (data) {
      if (data instanceof FormData) {
        config.body = data;
      } else if (contentType === 'application/json') {
        config.body = JSON.stringify(data);
      } else {
        config.body = data;
      }
    }
    
    try {
      const response = await fetch(url, config);
      return await this.handleResponse(response);
      
    } catch (error) {
      console.error(`API ${method} ${endpoint} failed:`, error);
      
      // Enhance error with more context if available
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        error.message = 'Unable to connect to the server. Please check your internet connection.';
      }
      
      throw this.normalizeError(error);
    }
  }

  // Helper methods for common HTTP methods
  async get(endpoint, params = {}, options = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request('GET', url, null, options);
  }

  async post(endpoint, data, options = {}) {
    return this.request('POST', endpoint, data, options);
  }

  async put(endpoint, data, options = {}) {
    return this.request('PUT', endpoint, data, options);
  }

  async patch(endpoint, data, options = {}) {
    return this.request('PATCH', endpoint, data, options);
  }

  async delete(endpoint, data = null, options = {}) {
    return this.request('DELETE', endpoint, data, options);
  }
  
  // File upload helper
  async uploadFile(endpoint, file, fieldName = 'file', additionalData = {}) {
    const formData = new FormData();
    formData.append(fieldName, file);
    
    // Append additional data if provided
    Object.entries(additionalData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });
    
    return this.post(endpoint, formData, {
      headers: {
        // Let the browser set the content type with boundary
        'Content-Type': undefined,
      },
    });
  }

  // Auth API
  auth = {
    // User registration
    register: async (userData) => {
      try {
        // Get CSRF token from cookies first
        const csrfToken = this.getCSRFToken();
        
        if (!csrfToken) {
          // If no CSRF token in cookies, fetch a new one
          const csrfResponse = await fetch('/api/auth/csrf/', {
            method: 'GET',
            credentials: 'include'
          });
          
          if (!csrfResponse.ok) {
            throw new Error('Failed to get CSRF token');
          }
          
          const csrfData = await csrfResponse.json();
          this.setCSRFToken(csrfData.csrfToken);
        }
        
        console.log('Sending registration request to http://localhost:8000/api/auth/register/ with data:', {
          ...userData,
          password1: '***',
          password2: '***'
        });
        
        // Make the registration request
        const response = await fetch('http://localhost:8000/api/auth/register/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': this.getCSRFToken() || '',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(userData)
        });
        
        console.log('Registration response status:', response.status);
        
        // Handle the response
        if (!response.ok) {
          let errorData = {};
          try {
            errorData = await response.json();
            console.error('Registration error response:', errorData);
          } catch (e) {
            console.error('Failed to parse error response:', e);
          }
          
          // Create a more detailed error message
          let errorMessage = 'Registration failed';
          
          if (response.status === 400) {
            // Handle validation errors
            const errors = [];
            for (const [field, messages] of Object.entries(errorData)) {
              if (Array.isArray(messages)) {
                errors.push(`${field}: ${messages.join(', ')}`);
              } else if (typeof messages === 'string') {
                errors.push(messages);
              } else if (field === 'non_field_errors') {
                errors.push(...messages);
              }
            }
            
            if (errors.length > 0) {
              errorMessage = errors.join('\n');
            } else if (errorData.detail) {
              errorMessage = errorData.detail;
            }
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          }
          
          const error = new Error(errorMessage);
          error.response = response;
          error.data = errorData;
          throw error;
        }
        
        return await response.json();
        
      } catch (error) {
        console.error('Registration error:', error);
        
        // Enhance error with more context if available
        if (error.response) {
          try {
            const errorData = await error.response.json();
            error.data = errorData;
            
            // Handle common error cases
            if (error.response.status === 400) {
              error.message = 'Validation error';
              if (errorData.non_field_errors) {
                error.message = errorData.non_field_errors[0];
              } else if (errorData.email) {
                error.message = `Email: ${errorData.email[0]}`;
              } else if (errorData.username) {
                error.message = `Username: ${errorData.username[0]}`;
              } else if (errorData.password1) {
                error.message = `Password: ${errorData.password1[0]}`;
              }
            }
          } catch (e) {
            console.error('Error parsing error response:', e);
          }
        } else if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
          error.message = 'Unable to connect to the server. Please check your internet connection.';
        }
        
        throw error;
      }
    },

    // User login
    login: async (credentials) => {
      try {
        // Ensure we have CSRF token before login
        await this.getCSRFToken();
        
        // Make the login request directly to ensure we capture all headers
        const response = await fetch('http://localhost:8000/api/auth/login/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': this.getCSRFToken() || '',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            email: credentials.email || '',
            username: credentials.username || '',
            password: credentials.password
          })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          const error = new Error(data.detail || 'Login failed');
          error.response = response;
          error.data = data;
          throw error;
        }
        
        // Extract token from response data or Authorization header
        let token = data.token;
        if (!token && response.headers.get('Authorization')) {
          const authHeader = response.headers.get('Authorization');
          const tokenMatch = authHeader.match(/^Token\s+(.+)$/);
          if (tokenMatch) {
            token = tokenMatch[1];
          }
        }
        
        if (token) {
          this.setToken(token);
          
          // If user data is included in the response, use it
          if (data.user) {
            return { ...data, token };
          }
          
          // Otherwise fetch user data
          try {
            const userResponse = await this.get('/api/auth/user/');
            return { ...data, token, user: userResponse };
          } catch (error) {
            console.error('Error fetching user data:', error);
            return { ...data, token };
          }
        }
        
        return data;
      } catch (error) {
        console.error('Login error:', error);
        throw this.normalizeError(error);
      }
    },

    // Get current user
    getMe: async () => {
      return this.get('/api/auth/user/');
    },

    // Update user profile
    updateProfile: async (userData) => {
      return this.patch('/api/auth/user/', userData);
    },

    // Change password
    changePassword: async (passwords) => {
      return this.post('/api/auth/password/change/', passwords);
    },

    // Logout
    logout: async () => {
      try {
        await this.post('/auth/logout/');
      } catch (error) {
        console.warn('Logout error (proceeding anyway):', error);
      } finally {
        this.setToken(null);
        localStorage.removeItem('user');
      }
    },

    // Forgot password
    forgotPassword: async (email) => {
      return this.post('/api/auth/password/reset/', { email }, {
        public: true
      });
    },
    
    // Verify email
    verifyEmail: async (key) => {
      return this.post('/api/auth/registration/verify-email/', { key }, {
        public: true
      });
    },
    
    // Resend verification email
    resendVerificationEmail: async (email) => {
      return this.post('/api/auth/registration/resend-email/', { email }, {
        public: true
      });
    },

    // Reset password with token
    resetPassword: async (uid, token, newPassword1, newPassword2) => {
      return this.post('/api/auth/password/reset/confirm/', {
        uid,
        token,
        new_password1: newPassword1,
        new_password2: newPassword2
      }, {
        public: true
      });
    }
  };

  // Jobs API
  jobs = {
    // Get all jobs with optional filters
    getAll: async (filters = {}) => {
      const queryParams = new URLSearchParams();
      
      // Add filters to query params if provided
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      });
      
      const queryString = queryParams.toString();
      const url = `/api/job-postings/${queryString ? `?${queryString}` : ''}`;
      
      return this.get(url);
    },

    // Get a single job by ID
    getById: async (id) => {
      return this.get(`/api/job-postings/${id}/`);
    },

    // Create a new job (for employers)
    create: async (jobData) => {
      return this.post('/api/job-postings/', jobData);
    },

    // Update a job (for employers)
    update: async (id, jobData) => {
      return this.patch(`/api/job-postings/${id}/`, jobData);
    },

    // Delete a job (for employers)
    delete: async (id) => {
      return this.request(`/api/job-postings/${id}/`, {
        method: 'DELETE'
      });
    },

    // Get jobs posted by the current employer
    getMyJobs: async () => {
      return this.request('GET', '/api/job-postings/my-jobs/');
    },

    // Get jobs posted by the current employer's company (with applicant counts)
    getMyCompanyJobs: async () => {
      return this.request('GET', '/api/job-postings/my-company-jobs/');
    },

    // Save/unsave a job (for job seekers)
    toggleSave: async (jobId) => {
      return this.request('POST', `/api/job-postings/${jobId}/save/`);
    },

    // Get saved jobs (for job seekers)
    getSavedJobs: async () => {
      return this.request('GET', '/api/job-postings/saved/');
    },

    // Apply for a job
    apply: async (jobId, applicationData) => {
      const formData = new FormData();
      
      // Append all fields to form data
      Object.entries(applicationData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
      
      return this.request('POST', `/api/job-postings/${jobId}/apply/`, formData, {
        headers: {
          // Let the browser set the Content-Type with boundary for FormData
          'Accept': 'application/json'
        }
      }, false); // Don't stringify FormData
    },

    // Parse resume to extract information
    parseResume: async (resumeFile) => {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      
      return this.request('POST', '/resume/parse/', formData, {
        headers: {
          'Accept': 'application/json'
        }
      }, false); // Don't stringify FormData
    },

    // Get applications for a job (for employers)
    getJobApplications: async (jobId) => {
      return this.request('GET', `/api/job-postings/${jobId}/applications/`);
    },

    // Get applicants for a specific job (for employers)
    getJobApplicants: async (jobId) => {
      return this.request('GET', `/api/job-applications/job-applicants/${jobId}/`);
    },

    // Get my applications (for job seekers)
    getMyApplications: async () => {
      // Check if we have cached applications data
      const cached = sessionStorage.getItem('cached_applications');
      const cacheTime = sessionStorage.getItem('cached_applications_time');
      
      // Use cache if it's less than 5 minutes old
      if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < 5 * 60 * 1000) {
        return JSON.parse(cached);
      }
      
      // Fetch fresh data with timestamp to prevent browser caching
      const timestamp = new Date().getTime();
      const applications = await this.request('GET', `/api/job-applications/?_t=${timestamp}`);
      
      // Cache the result
      sessionStorage.setItem('cached_applications', JSON.stringify(applications));
      sessionStorage.setItem('cached_applications_time', Date.now().toString());
      
      return applications;
    },

    // Clear applications cache (call this after applying to a job)
    clearApplicationsCache: () => {
      sessionStorage.removeItem('cached_applications');
      sessionStorage.removeItem('cached_applications_time');
    },

    // Clear all job-related caches
    clearJobCaches: () => {
      sessionStorage.removeItem('cached_applications');
      sessionStorage.removeItem('cached_applications_time');
      // Clear any other job-related caches
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.includes('job') || key.includes('application')) {
          sessionStorage.removeItem(key);
        }
      });
    },

    // Force clear all caches and reload if needed
    forceClearAllCaches: () => {
      // Clear sessionStorage completely
      sessionStorage.clear();
      
      // Clear localStorage items that might be cached
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('job') || key.includes('application') || key.includes('cache')) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('All caches cleared');
    },

    // Get a single application
    getApplication: async (applicationId) => {
      return this.request('GET', `/api/job-applications/${applicationId}/`);
    },

    // Update application status (for employers)
    updateApplicationStatus: async (applicationId, status) => {
      return this.request('PATCH', `/api/job-applications/${applicationId}/status/`, { status });
    },

    // Search jobs
    search: async (query, filters = {}) => {
      return this.request('POST', '/api/job-postings/search/', { query, ...filters });
    }
  };

  // Companies API
  companies = {
    // Get all companies
    getAll: async (filters = {}) => {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      });
      
      const queryString = queryParams.toString();
      const url = `/companies/${queryString ? `?${queryString}` : ''}`;
      
      return this.request('GET', url);
    },

    // Get a single company by ID
    getById: async (id) => {
      return this.request('GET', `/companies/${id}/`);
    },

    // Get company profile for the current user
    getMyCompany: async () => {
      return this.request('GET', '/companies/me/');
    },

    // Create or update company profile
    updateCompany: async (companyData) => {
      const isUpdating = companyData.id;
      const method = isUpdating ? 'PATCH' : 'POST';
      const url = isUpdating ? `/companies/${companyData.id}/` : '/companies/';
      
      return this.request(method, url, companyData);
    },

    // Upload company logo
    uploadLogo: async (companyId, file) => {
      const formData = new FormData();
      formData.append('logo', file);
      
      return this.request('POST', `/companies/${companyId}/logo/`, formData, {
        headers: {
          'Accept': 'application/json'
        }
      });
    },

    // Get jobs by company
    getCompanyJobs: async (companyId) => {
      return this.request('GET', `/companies/${companyId}/jobs/`);
    }
  };

  // User Profile API
  profile = {
    // Get user profile
    get: async (userId) => {
      const url = userId ? `/profiles/${userId}/` : '/profiles/me/';
      return this.request('GET', url);
    },

    // Create or update profile
    update: async (profileData) => {
      return this.request('PATCH', '/profiles/me/', profileData);
    },

    // Upload resume
    uploadResume: async (file) => {
      const formData = new FormData();
      formData.append('resume', file);
      
      return this.request('POST', '/profiles/me/resume/', formData, {
        headers: {
          'Accept': 'application/json'
        }
      });
    },

    // Delete resume
    deleteResume: async () => {
      return this.request('DELETE', '/profiles/me/resume/');
    },

        // Update skills
    updateSkills: async (skills) => {
      return this.request('PUT', '/profiles/me/skills/', { skills });
    },

    // Add work experience
    addExperience: async (experience) => {
      return this.request('POST', '/profiles/me/experience/', experience);
    },

    // Update work experience
    updateExperience: async (expId, experience) => {
      return this.request('PATCH', `/profiles/me/experience/${expId}/`, experience);
    },

    // Delete work experience
    deleteExperience: async (expId) => {
      return this.request('DELETE', `/profiles/me/experience/${expId}/`);
    },

    // Add education
    addEducation: async (education) => {
      return this.request('POST', '/profiles/me/education/', education);
    },

    // Update education
    updateEducation: async (eduId, education) => {
      return this.request('PATCH', `/profiles/me/education/${eduId}/`, education);
    },

    // Delete education
    deleteEducation: async (eduId) => {
      return this.request('DELETE', `/profiles/me/education/${eduId}/`);
    }
  };

  // Notifications API
  notifications = {
    // Get all notifications
    getAll: async () => {
      return this.request('GET', '/notifications/');
    },

    // Mark notification as read
    markAsRead: async (notificationId) => {
      return this.request('POST', `/notifications/${notificationId}/read/`);
    },

    // Mark all notifications as read
    markAllAsRead: async () => {
      return this.request('POST', '/notifications/mark-all-read/');
    },

    // Get unread count
    getUnreadCount: async () => {
      return this.request('GET', '/notifications/unread-count/');
    }
  };
}

// Create and export the API instance
const api = new ApiService();

// Export the API instance
// REMOVE: export { api };
// ENSURE: window.TalentLink = window.TalentLink || {}; window.TalentLink.api = api;

// Initialize in browser environment
if (typeof window !== 'undefined') {
  // Create the namespace if it doesn't exist
  window.TalentLink = window.TalentLink || {};
  
  // Make it available for debugging and global access
  window.TalentLink.api = api;
  
  // Log initialization
  console.log('TalentLink API module initialized and available as window.TalentLink.api');
  
  // Log debug info
  console.log('API debug info:', {
    baseUrl: api.baseUrl,
    hasToken: !!api.token,
    isInitialized: !!window.TalentLink?.api
  });
}
