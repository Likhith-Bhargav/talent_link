// Onboard Company Form Handling
// Handles form submission and validation for the onboard company page

// Use an IIFE to prevent global scope pollution
(function() {
    // Private variable to store auth instance
    let auth;

    /**
     * Show error message
     * @param {string} message - The error message to display
     */
    function showError(message) {
        console.error('Error:', message);
        // Find or create error message container
        let errorContainer = document.getElementById('error-message');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'error-message';
            errorContainer.className = 'fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50';
            document.body.appendChild(errorContainer);
        }
        
        errorContainer.textContent = message;
        errorContainer.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorContainer.classList.add('hidden');
        }, 5000);
        
        // Insert error message at the top of the form if form exists
        const form = document.getElementById('onboardCompanyForm');
        if (form) {
            const errorElement = document.createElement('div');
            errorElement.className = 'mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700';
            errorElement.textContent = message;
            form.insertBefore(errorElement, form.firstChild);
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (errorElement.parentNode === form) {
                    form.removeChild(errorElement);
                }
            }, 5000);
        }
    }
    
    /**
     * Show success message
     */
    function showSuccess() {
        const successModal = document.getElementById('successModal');
        if (successModal) {
            // Show modal
            successModal.classList.remove('hidden');
            
            // Close modal when clicking outside
            successModal.addEventListener('click', function(e) {
                if (e.target === successModal) {
                    successModal.classList.add('hidden');
                }
            });
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                successModal.classList.add('hidden');
            }, 5000);
        }
    }

    /**
     * Handle form submission
     * @param {Event} e - The form submission event
     */
    async function handleFormSubmit(e) {
        e.preventDefault();
        
        console.log('Form submitted');
        
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton ? submitButton.innerHTML : '';
        
        try {
            // Disable submit button to prevent multiple submissions
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = 'Saving...';
            }
            
            // Get form data
            const formData = new FormData(form);
            
            // Log form data (excluding file content)
            const formDataObj = {};
            formData.forEach((value, key) => {
                if (key !== 'logo') {
                    formDataObj[key] = value;
                } else {
                    formDataObj[key] = value.name ? `File: ${value.name}` : 'No file selected';
                }
            });
            console.log('Form data:', formDataObj);
            
            // Check if auth is available and user is authenticated
            if (!auth) {
                throw new Error('Authentication module not available');
            }
            
            // Get the authentication token
            const token = localStorage.getItem('token');
            
            if (!token) {
                console.error('No authentication token found. Redirecting to login...');
                window.location.href = '/login.html?next=' + encodeURIComponent(window.location.pathname);
                return;
            }
            
            // Get CSRF token from cookie
            function getCookie(name) {
                let cookieValue = null;
                if (document.cookie && document.cookie !== '') {
                    const cookies = document.cookie.split(';');
                    for (let i = 0; i < cookies.length; i++) {
                        const cookie = cookies[i].trim();
                        if (cookie.substring(0, name.length + 1) === (name + '=')) {
                            cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                            break;
                        }
                    }
                }
                return cookieValue;
            }
            
            const csrftoken = getCookie('csrftoken');
            
            // Send request to server with FormData
            try {
                const response = await fetch('http://localhost:8000/api/companies/', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'X-CSRFToken': csrftoken || '',
                        // Don't set Content-Type, let the browser set it with the boundary
                    },
                    credentials: 'include',  // Important for including cookies
                    body: formData,
                    mode: 'cors'  // Ensure CORS mode is enabled
                });

                console.log('Response status:', response.status);
                
                // Handle 401 Unauthorized
                if (response.status === 401) {
                    // Token is invalid or expired
                    localStorage.removeItem('token');
                    window.location.href = '/login.html?next=' + encodeURIComponent(window.location.pathname);
                    return;
                }
                
                // Try to parse response as JSON, but handle non-JSON responses
                let responseData;
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    responseData = await response.json();
                } else {
                    const text = await response.text();
                    console.log('Non-JSON response:', text);
                    throw new Error('Server returned a non-JSON response');
                }
                
                if (!response.ok) {
                    console.error('Server error response:', responseData);
                    let errorMessage = 'An error occurred while saving the company';
                    if (responseData && responseData.detail) {
                        errorMessage = responseData.detail;
                    } else if (responseData && responseData.errors) {
                        errorMessage = Object.entries(responseData.errors)
                            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
                            .join('\n');
                    }
                    throw new Error(errorMessage);
                }
                
                // Show success message
                showSuccess();
                
                // Reset form
                form.reset();
                
                // Hide logo preview
                const logoPreview = document.getElementById('logoPreview');
                if (logoPreview) {
                    logoPreview.classList.add('hidden');
                }
                
                console.log('Company created successfully');
                
            } catch (error) {
                console.error('Error in form submission:', error);
                throw error; // Re-throw to be caught by the outer catch
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            showError(error.message || 'An error occurred while submitting the form');
        } finally {
            // Re-enable submit button
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            }
        }
    }

    /**
     * Main initialization function
     */
    async function initializeOnboardCompany() {
        try {
            console.log('Initializing onboard company page...');
            
            // Get auth instance
            if (!window.TalentLink || !window.TalentLink.auth) {
                console.error('Auth module not found');
                return;
            }
            
            auth = window.TalentLink.auth;
            
            // Get DOM elements
            const form = document.getElementById('onboardCompanyForm');
            const logoInput = document.getElementById('logo');
            const logoPreview = document.getElementById('logoPreview');
            const logoPreviewImage = document.getElementById('logoPreviewImage');
            
            // Add form submit handler
            if (form) {
                form.addEventListener('submit', handleFormSubmit);
            }
            
            // Set up logo preview
            if (logoInput && logoPreview && logoPreviewImage) {
                logoInput.addEventListener('change', function(e) {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        
                        reader.onload = function(e) {
                            logoPreviewImage.src = e.target.result;
                            logoPreview.classList.remove('hidden');
                        };
                        
                        reader.readAsDataURL(file);
                    } else {
                        logoPreviewImage.src = '';
                        logoPreview.classList.add('hidden');
                    }
                });
            }
            
            console.log('Onboard company page initialized');
            
        } catch (error) {
            console.error('Error initializing onboard company page:', error);
            showError('Failed to initialize page. Please refresh and try again.');
        }
    }

    // Initialize the page when the DOM is fully loaded
    document.addEventListener('DOMContentLoaded', function() {
        initializeOnboardCompany();
    });

    // Expose the initialize function to the global scope if needed
    window.TalentLink = window.TalentLink || {};
    window.TalentLink.initializeOnboardCompany = initializeOnboardCompany;
})();
