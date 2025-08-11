/**
 * Utility Functions
 * A collection of helper functions used throughout the application
 */

/**
 * Format a date string into a more readable format
 * @param {string|Date} date - The date to format
 * @param {string} format - The output format (default: 'MM/DD/YYYY')
 * @returns {string} Formatted date string
 */
function formatDate(date, format = 'MM/DD/YYYY') {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  
  return format
    .replace('MM', month)
    .replace('DD', day)
    .replace('YYYY', year);
}

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code (default: 'USD')
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency = 'USD') {
  if (amount === null || amount === undefined) return 'N/A';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Truncate text to a specified length and add ellipsis
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text with ellipsis if needed
 */
function truncateText(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Debounce a function call
 * @param {Function} func - The function to debounce
 * @param {number} wait - The time to wait in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait = 300) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

/**
 * Throttle a function call
 * @param {Function} func - The function to throttle
 * @param {number} limit - The time limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit = 300) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Validate an email address
 * @param {string} email - The email to validate
 * @returns {boolean} True if the email is valid
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

/**
 * Validate a password (at least 8 chars, 1 uppercase, 1 lowercase, 1 number)
 * @param {string} password - The password to validate
 * @returns {boolean} True if the password is valid
 */
function isValidPassword(password) {
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
  return re.test(password);
}

/**
 * Get a URL parameter by name
 * @param {string} name - The parameter name
 * @returns {string|null} The parameter value or null if not found
 */
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

/**
 * Set or update a URL parameter
 * @param {string} param - The parameter name
 * @param {string} value - The parameter value
 * @param {boolean} reload - Whether to reload the page
 */
function setUrlParameter(param, value, reload = false) {
  const url = new URL(window.location);
  url.searchParams.set(param, value);
  
  if (reload) {
    window.location.href = url.toString();
  } else {
    window.history.pushState({}, '', url);
  }
}

/**
 * Remove a URL parameter
 * @param {string} param - The parameter name to remove
 * @param {boolean} reload - Whether to reload the page
 */
function removeUrlParameter(param, reload = false) {
  const url = new URL(window.location);
  url.searchParams.delete(param);
  
  if (reload) {
    window.location.href = url.toString();
  } else {
    window.history.pushState({}, '', url);
  }
}

/**
 * Copy text to clipboard
 * @param {string} text - The text to copy
 * @returns {Promise<boolean>} True if successful
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
}

/**
 * Generate a unique ID
 * @returns {string} A unique ID
 */
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Format a number with commas as thousand separators
 * @param {number} number - The number to format
 * @returns {string} Formatted number string
 */
function formatNumber(number) {
  if (number === null || number === undefined) return '0';
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Toggle a class on an element
 * @param {Element} element - The DOM element
 * @param {string} className - The class to toggle
 * @param {boolean} force - Force add or remove the class
 */
function toggleClass(element, className, force) {
  if (!element) return;
  
  if (force === true) {
    element.classList.add(className);
  } else if (force === false) {
    element.classList.remove(className);
  } else {
    element.classList.toggle(className);
  }
}

/**
 * Show a notification message
 * @param {string} message - The message to show
 * @param {string} type - The type of notification (success, error, warning, info)
 * @param {number} duration - How long to show the notification in ms (0 = don't auto-close)
 */
function showNotification(message, type = 'info', duration = 5000) {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'notification-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = () => notification.remove();
  notification.appendChild(closeBtn);
  
  // Add to notification container
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    document.body.appendChild(container);
  }
  
  container.appendChild(notification);
  
  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }
  
  return notification;
}

// Add CSS for notifications if not already present
if (!document.getElementById('notification-styles')) {
  const style = document.createElement('style');
  style.id = 'notification-styles';
  style.textContent = `
    #notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 350px;
    }
    
    .notification {
      position: relative;
      padding: 15px 40px 15px 20px;
      margin-bottom: 10px;
      border-radius: 4px;
      color: white;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      animation: slideIn 0.3s ease-out;
      transform: translateX(0);
      transition: transform 0.3s ease-out, opacity 0.3s ease-out;
    }
    
    .notification.fade-out {
      transform: translateX(100%);
      opacity: 0;
    }
    
    .notification.success {
      background-color: #4caf50;
    }
    
    .notification.error {
      background-color: #f44336;
    }
    
    .notification.warning {
      background-color: #ff9800;
      color: #333;
    }
    
    .notification.info {
      background-color: #2196f3;
    }
    
    .notification-close {
      position: absolute;
      top: 10px;
      right: 10px;
      background: none;
      border: none;
      color: inherit;
      font-size: 1.2em;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      opacity: 0.8;
    }
    
    .notification-close:hover {
      opacity: 1;
    }
    
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, error, warning, info)
 * @param {number} duration - How long to show the toast in ms (default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
  // Use showNotification if it exists, otherwise fall back to alert
  if (typeof showNotification === 'function') {
    return showNotification(message, type, duration);
  }
  
  // Fallback to browser alert
  alert(`${type.toUpperCase()}: ${message}`);
}

// Export all utility functions
const utils = {
  formatDate,
  formatCurrency,
  truncateText,
  debounce,
  throttle,
  isValidEmail,
  isValidPassword,
  getUrlParameter,
  setUrlParameter,
  removeUrlParameter,
  copyToClipboard,
  generateId,
  formatNumber,
  toggleClass,
  showNotification,
  showToast
};

// Make utils available globally
window.utils = utils;

export default utils;
