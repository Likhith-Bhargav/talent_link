/**
 * Authentication Module
 * Handles user authentication flows (login, registration, password reset, etc.)
 */

class Auth {
  constructor() {
    this.currentUser = null;
    this.token = localStorage.getItem('token');
    this.csrfToken = null;
    this.initialized = false;
    this.initializationPromise = null;
    
    // Bind methods
    this.init = this.init.bind(this);
    this.initialize = this.initialize.bind(this);
  }

  async initialize() {
    // Return existing initialization promise if already initializing
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    // Create a new promise for this initialization
    this.initializationPromise = (async () => {
      try {
        // Get CSRF token first
        await this.getCSRFToken();
        
        // If we have a token, try to fetch the current user
        if (this.token) {
          try {
            await this.fetchCurrentUser();
            this.currentUser = this.currentUser; // Set current user to itself
          } catch (error) {
            console.warn('Failed to fetch current user, logging out', error);
            this.logout();
          }
        }
        
        this.initialized = true;
        return this.currentUser;
      } catch (error) {
        console.error('Auth initialization error:', error);
        this.logout();
        throw error;
      } finally {
        this.initializationPromise = null;
      }
    })();
    
    return this.initializationPromise;
  }

  // Get CSRF token from cookies
  getCSRFTokenFromCookies() {
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];
    
    if (cookieValue) {
      this.csrfToken = cookieValue;
      return cookieValue;
    }
    return null;
  }
  
  // Get or refresh CSRF token
  async getCSRFToken() {
    // First try to get from cookies
    const tokenFromCookie = this.getCSRFTokenFromCookies();
    if (tokenFromCookie) {
      this.csrfToken = tokenFromCookie;
      console.log('Using existing CSRF token from cookies');
      return this.csrfToken;
    }
    
    console.log('CSRF token not found in cookies, fetching new one...');
    
    try {
      // If not in cookies, fetch a new one
      const response = await fetch('http://localhost:8000/api/auth/csrf/', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error('Failed to get CSRF token. Status:', response.status);
        throw new Error(`Failed to get CSRF token. Status: ${response.status}`);
      }
      
      // The CSRF token should now be set in cookies
      const token = this.getCSRFTokenFromCookies();
      
      if (!token) {
        console.error('CSRF token not found in cookies after fetch');
        throw new Error('Failed to retrieve CSRF token from cookies');
      }
      
      this.csrfToken = token;
      console.log('Successfully retrieved CSRF token');
      return this.csrfToken;
      
    } catch (error) {
      console.error('Error getting CSRF token:', error);
      // Don't block the login flow if CSRF token fetch fails
      // The server might still accept the request with session authentication
      console.warn('Proceeding without CSRF token, this might cause issues with some endpoints');
      return null;
    }
  }

  // Initialize auth state
  async init() {
    return this.initialize();
  }
  
  // Get CSRF token from the server
  async getCSRFToken() {
    try {
      const response = await fetch('/api/auth/csrf/', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to get CSRF token');
      }
      
      const data = await response.json();
      return data.csrfToken;
    } catch (error) {
      console.error('Error getting CSRF token:', error);
      throw error;
    }
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.currentUser;
  }

  // Check if user is an employer
  isEmployer() {
    const isEmployer = this.currentUser && 
                      (this.currentUser.user_type === 'employer' || 
                       this.currentUser.role === 'employer');
    
    console.log('isEmployer check:', {
      currentUser: this.currentUser,
      userType: this.currentUser?.user_type,
      role: this.currentUser?.role,
      result: isEmployer
    });
    
    return isEmployer;
  }

  // Check if user is a job seeker
  isJobSeeker() {
    return this.currentUser && this.currentUser.user_type === 'job_seeker';
  }

  // Set current user
  setCurrentUser(userData) {
    this.currentUser = userData;
    localStorage.setItem('user', JSON.stringify(userData));
    this.dispatchAuthStateChange();
  }

  // Clear authentication data
  clearAuth() {
    this.currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (window.TalentLink?.api) {
      window.TalentLink.api.setToken(null);
    }
    this.dispatchAuthStateChange();
  }

  // Dispatch auth state change event
  dispatchAuthStateChange() {
    const event = new CustomEvent('authStateChange', { 
      detail: { isAuthenticated: this.isAuthenticated(), user: this.currentUser }
    });
    window.dispatchEvent(event);
  }

  // Fetch current user data
  async fetchCurrentUser() {
    try {
      // Make sure we have a token
      if (!this.token) {
        throw new Error('No authentication token available');
      }
      
      console.log('Fetching current user data...');
      
      // Get user data from API
      const response = await fetch('http://localhost:8000/api/auth/user/', {
        method: 'GET',
        headers: {
          'Authorization': `Token ${this.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.detail || 'Failed to fetch user data');
        error.status = response.status;
        error.data = errorData;
        throw error;
      }
      
      const userData = await response.json();
      
      if (!userData) {
        throw new Error('No user data received');
      }
      
      console.log('User data received:', userData);
      
      // Update current user and dispatch state change
      this.currentUser = userData;
      localStorage.setItem('user', JSON.stringify(userData));
      this.dispatchAuthStateChange();
      
      return userData;
      
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      
      // If we get a 401 Unauthorized, clear the auth state
      if (error.status === 401) {
        console.log('Authentication failed, clearing auth state');
        this.clearAuth();
      }
      
      throw error;
    }
  }

  // Register a new user
  async register(userData) {
    try {
      console.log('Starting registration with data:', {
        ...userData,
        password: '••••••',
        password1: '••••••',
        password2: '••••••'
      });
      
      // Make sure we have CSRF token
      await this.getCSRFToken();
      
      // Call the API to register (correct endpoint)
      const response = await window.TalentLink.api.auth.register({
        username: userData.username,
        email: userData.email,
        password1: userData.password1 || userData.password,
        password2: userData.password2 || userData.password,
        first_name: userData.first_name,
        last_name: userData.last_name,
        user_type: userData.user_type
      });
      
      console.log('Registration API response:', response);
      
      // If we have a user object, registration and login were successful
      if (response.user) {
        this.setCurrentUser(response.user);
        this.currentUser = this.currentUser; // Set current user to itself
        this.dispatchAuthStateChange();
        
        return { 
          success: true, 
          user: response.user,
          message: 'Registration successful! You are now logged in.'
        };
      }
      
      // If we get here, registration was successful but requires email verification
      return { 
        success: true,
        requiresVerification: true,
        message: 'Registration successful! Please check your email to verify your account.'
      };
      
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.message || 'Registration failed. Please try again.',
        details: error.data || error.response?.data
      };
    }
  }

  // Login user
  async login(credentials) {
    try {
      console.log('Attempting login with credentials:', {
        ...credentials,
        password: '••••••'
      });
      
      // Make sure we have CSRF token
      await this.getCSRFToken();
      
      // Call the API to login (correct endpoint)
      const response = await window.TalentLink.api.auth.login({
        username: credentials.username,
        email: credentials.email,
        password: credentials.password
      });
      
      console.log('Login API response:', response);
      
      // If login was successful, update auth state (use 'token')
      if (response.token) {
        this.token = response.token;
        this.currentUser = this.currentUser; // Set current user to itself
        
        // Store the token
        localStorage.setItem('token', this.token);
        
        // Fetch and set the current user
        const userData = await this.fetchCurrentUser();
        
        // Dispatch auth state change to update UI
        this.dispatchAuthStateChange();
        
        return {
          success: true,
          user: userData,
          message: 'Login successful!'
        };
      }
      
      // If we get here, login failed
      return {
        success: false,
        error: 'Invalid credentials. Please try again.'
      };
      
    } catch (error) {
      console.error('Login error:', error);
      
      // Format the error response
      const result = { 
        success: false,
        error: error.message || 'Login failed. Please try again.',
        details: error.data || error.response?.data
      };
      
      // Handle specific error cases
      if (error.status === 400) {
        result.error = 'Invalid email/username or password.';
      } else if (error.status === 401) {
        result.error = 'Your account is not active. Please check your email for an activation link.';
      } else if (error.isNetworkError) {
        result.error = 'Unable to connect to the server. Please check your internet connection.';
      }
      
      return result;
    }
  }

  // Logout user
  async logout() {
    try {
      // Only try to call the logout API if we have a token
      if (this.token) {
        try {
          await window.TalentLink.api.logout();
        } catch (error) {
          console.warn('Logout API call failed, but proceeding with local logout', error);
        }
      }
      
      // Clear local state
      this.token = null;
      this.currentUser = null;
      this.currentUser = null; // Set current user to null
      
      // Clear storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Notify listeners
      this.dispatchAuthStateChange();
      
      return { success: true };
      
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if there's an error, we should still clear the local state
      this.token = null;
      this.currentUser = null;
      this.currentUser = null; // Set current user to null
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.dispatchAuthStateChange();
      
      return { 
        success: false, 
        error: 'An error occurred during logout',
        details: error.message
      };
    }
  }

  // Forgot password
  async forgotPassword(email) {
    try {
      await window.TalentLink.api.post('/auth/password/reset/', { email });
      return true;
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }

  // Reset password
  async resetPassword(uid, token, newPassword1, newPassword2) {
    try {
      const response = await window.TalentLink.api.post('/auth/password/reset/confirm/', {
        uid,
        token,
        new_password1: newPassword1,
        new_password2: newPassword2
      });
      
      if (response.detail) {
        return { success: true, message: response.detail };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(oldPassword, newPassword1, newPassword2) {
    try {
      const response = await window.TalentLink.api.post('/auth/password/change/', {
        old_password: oldPassword,
        new_password1: newPassword1,
        new_password2: newPassword2
      });
      
      if (response.detail) {
        return { success: true, message: response.detail };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      
      let errorMessage = 'Failed to change password. Please try again.';
      if (error.response && error.response.data) {
        const data = error.response.data;
        if (data.old_password) {
          errorMessage = data.old_password[0];
        } else if (data.new_password2) {
          errorMessage = data.new_password2[0];
        } else if (data.non_field_errors) {
          errorMessage = data.non_field_errors[0];
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  // Get auth token
  getToken() {
    return localStorage.getItem('token');
  }
  
  // Check if user is logged in
  isLoggedIn() {
    return !!this.getToken();
  }
  
  // Clear all authentication data
  clearAuth() {
    // Clear tokens and user data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear API token
    if (window.TalentLink?.api) {
      window.TalentLink.api.setToken(null);
    }
    
    // Reset current user
    this.currentUser = null;
    
    // Notify listeners
    this.dispatchAuthStateChange(false);
    
    console.log('Auth data cleared');
  }
  
  // Logout user
  async logout() {
    try {
      // Get CSRF token first
      await this.getCSRFToken();
      
      // Make the logout request
      const response = await fetch('/api/auth/logout/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': this.csrfToken,
          'Accept': 'application/json'
        },
        credentials: 'include'
      });
      
      // Clear local storage and state regardless of the response
      this.clearAuth();
      
      // Redirect to login page if not already there
      if (!window.location.pathname.endsWith('login.html')) {
        window.location.href = 'login.html';
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear auth even if the request fails
      this.clearAuth();
      throw error;
    }
  }
}

// Create and export the auth instance
const auth = new Auth();

// Initialize in browser environment
if (typeof window !== 'undefined') {
  // Expose auth globally for debugging
  window.TalentLink = window.TalentLink || {};
  window.TalentLink.auth = auth;
  
  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM fully loaded, initializing auth...');
    
    try {
      // Initialize auth
      await auth.initialize();
      
      // Check for redirect after login
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');
      
      if (redirect && auth.isAuthenticated()) {
        console.log('Redirecting to:', redirect);
        window.history.replaceState({}, document.title, window.location.pathname);
        window.location.href = redirect;
        return; // Stop further execution
      }
      
      // Set up logout button handler
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        console.log('Setting up logout button handler');
        logoutBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          console.log('Logout button clicked');
          await auth.logout();
          // Force a full page reload to ensure all state is reset
          window.location.href = '/';
        });
      }
      
      // Listen for auth state changes
      window.addEventListener('authStateChange', updateAuthUI);
      
      // Initial UI update
      updateAuthUI();
      
      // Trigger initial auth state
      auth.dispatchAuthStateChange();
      
    } catch (error) {
      console.error('Error during initialization:', error);
    }
  });
}

// Update UI based on auth state
const updateAuthUI = () => {
  console.log('Updating UI with auth state:', { 
    isAuthenticated: auth.isAuthenticated(), 
    currentUser: auth.currentUser 
  });
  
  const authButtons = document.getElementById('authButtons');
  const userMenu = document.getElementById('userMenu');
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const userInitials = document.getElementById('userInitials');
  
  if (auth.isAuthenticated() && auth.currentUser) {
    // User is logged in
    console.log('User is logged in, updating UI...');
    
    // Hide login/signup buttons
    if (authButtons) authButtons.style.display = 'none';
    
    // Show user menu
    if (userMenu) {
      userMenu.style.display = 'block';
      console.log('User menu should be visible now');
    }
    
    // Update user info in the dropdown
    const user = auth.currentUser;
    console.log('Current user data:', user);
    
    // Set user name
    if (userName) {
      const displayName = user.first_name || user.username || 'User';
      userName.textContent = displayName;
      console.log('Set user name to:', displayName);
      
      // Set user initials for the avatar
      if (userInitials) {
        const initials = displayName.split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);
        userInitials.textContent = initials;
        console.log('Set user initials to:', initials);
      }
    }
    
    // Set user email
    if (userEmail) {
      const email = user.email || '';
      userEmail.textContent = email;
      console.log('Set user email to:', email);
    }
    
    // Toggle post job button based on user type
    const postJobBtn = document.getElementById('postJobBtn');
    if (postJobBtn) {
      const isEmployer = user && user.user_type === 'employer';
      postJobBtn.style.display = isEmployer ? 'inline-flex' : 'none';
      console.log('Post job button visibility:', isEmployer ? 'visible' : 'hidden');
    }
    
    // Toggle Onboard Company button based on superuser status
    const onboardCompanyBtn = document.getElementById('onboardCompanyBtn');
    console.log('Onboard Company button element:', onboardCompanyBtn);
    console.log('Current user object:', user);
    if (onboardCompanyBtn) {
      const isSuperuser = user && (user.is_superuser === true || user.is_superuser === 'true');
      console.log('Is superuser?', isSuperuser);
      onboardCompanyBtn.style.display = isSuperuser ? 'inline-flex' : 'none';
      console.log('Onboard Company button visibility:', isSuperuser ? 'visible' : 'hidden');
      
      // Remove any existing click handlers to prevent duplicates
      const newOnboardBtn = onboardCompanyBtn.cloneNode(true);
      onboardCompanyBtn.parentNode.replaceChild(newOnboardBtn, onboardCompanyBtn);
      
      // Add click handler for the Onboard Company button
      newOnboardBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Onboard Company button clicked');
        
        // Use the global auth instance
        console.log('Current user:', auth.currentUser);
        console.log('Auth token exists:', !!auth.token);
        console.log('Is authenticated:', auth.isAuthenticated());
        
        // Store navigation intent
        localStorage.setItem('pendingNavigation', 'onboard-company.html');
        
        // Navigate to the onboard company page
        window.location.href = 'onboard-company.html';
      });
    }
    
    // Update Applications link based on user type
    const applicationsLink = document.getElementById('applicationsLink');
    if (applicationsLink) {
      const isEmployer = user && (user.user_type === 'employer' || user.user_type === 'company');
      applicationsLink.textContent = isEmployer ? 'Applications' : 'My Applications';
      applicationsLink.href = isEmployer ? 'all-applications.html' : 'my-applications.html';
      console.log('Applications link updated:', applicationsLink.href);
    }
  } else {
    // User is not logged in
    console.log('User is not logged in, showing login/signup buttons');
    
    if (authButtons) {
      authButtons.style.display = 'flex';
      console.log('Auth buttons shown');
    }
    
    if (userMenu) {
      userMenu.style.display = 'none';
      console.log('User menu hidden');
    }
  }
  
};

// Listen for auth state changes
window.addEventListener('authStateChange', updateAuthUI);

// Initial UI update when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  
  // Trigger initial auth state
  if (auth) {
    auth.dispatchAuthStateChange();
  }
});
