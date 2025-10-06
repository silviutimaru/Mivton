// ===== AUTHENTICATION JAVASCRIPT =====

// Utility Functions
const showError = (elementId, message) => {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
};

const hideError = (elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = '';
        element.style.display = 'none';
    }
};

const showFormMessage = (type, message) => {
    const errorEl = document.getElementById('formError');
    const successEl = document.getElementById('formSuccess');
    
    if (type === 'error' && errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        if (successEl) successEl.style.display = 'none';
    } else if (type === 'success' && successEl) {
        successEl.textContent = message;
        successEl.style.display = 'block';
        if (errorEl) errorEl.style.display = 'none';
    }
};

const hideFormMessages = () => {
    const errorEl = document.getElementById('formError');
    const successEl = document.getElementById('formSuccess');
    if (errorEl) errorEl.style.display = 'none';
    if (successEl) successEl.style.display = 'none';
};

const setButtonLoading = (buttonId, loading) => {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    const buttonText = button.querySelector('.button-text');
    const buttonLoader = button.querySelector('.button-loader');
    
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
        if (buttonText) buttonText.style.opacity = '0';
        if (buttonLoader) buttonLoader.style.display = 'block';
    } else {
        button.classList.remove('loading');
        button.disabled = false;
        if (buttonText) buttonText.style.opacity = '1';
        if (buttonLoader) buttonLoader.style.display = 'none';
    }
};

// API Helper Functions
const apiCall = async (url, options = {}) => {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        return { success: response.ok, data, status: response.status };
    } catch (error) {
        console.error('API call failed:', error);
        return { success: false, error: error.message };
    }
};

// Validation Functions
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validateUsername = (username) => {
    return username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9]+$/.test(username);
};

const validatePassword = (password) => {
    return password.length >= 8 && 
           /[a-z]/.test(password) && 
           /[A-Z]/.test(password) && 
           /\d/.test(password);
};

const getPasswordStrength = (password) => {
    let score = 0;
    let feedback = [];
    
    if (password.length >= 8) score += 1;
    else feedback.push('Use at least 8 characters');
    
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Add lowercase letters');
    
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Add uppercase letters');
    
    if (/\d/.test(password)) score += 1;
    else feedback.push('Add numbers');
    
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
    else feedback.push('Add special characters');
    
    if (password.length >= 12) score += 1;
    
    const strengths = ['very-weak', 'weak', 'fair', 'good', 'strong', 'very-strong'];
    const strengthNames = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    
    return {
        score,
        strength: strengths[score] || 'very-weak',
        strengthName: strengthNames[score] || 'Very Weak',
        feedback
    };
};

// Password Strength Indicator
const updatePasswordStrength = (password) => {
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    if (!strengthFill || !strengthText) return;
    
    if (!password) {
        strengthFill.className = 'strength-fill';
        strengthText.textContent = 'Password strength';
        return;
    }
    
    const { strength, strengthName, feedback } = getPasswordStrength(password);
    
    strengthFill.className = `strength-fill ${strength}`;
    strengthText.textContent = strengthName;
    
    if (feedback.length > 0) {
        strengthText.textContent += ` • ${feedback[0]}`;
    }
};

// Username and Email Availability Check
const checkAvailability = async (type, value) => {
    const checkElement = document.getElementById(`${type}Check`);
    if (!checkElement) return;
    
    if (!value) {
        checkElement.style.display = 'none';
        return;
    }
    
    if (type === 'username' && !validateUsername(value)) {
        checkElement.className = 'availability-check unavailable';
        checkElement.textContent = '✗';
        checkElement.style.display = 'block';
        return;
    }
    
    if (type === 'email' && !validateEmail(value)) {
        checkElement.className = 'availability-check unavailable';
        checkElement.textContent = '✗';
        checkElement.style.display = 'block';
        return;
    }
    
    checkElement.className = 'availability-check checking';
    checkElement.textContent = '...';
    checkElement.style.display = 'block';
    
    const result = await apiCall(`/api/auth/check-${type}/${encodeURIComponent(value)}`);
    
    if (result.success && result.data.available) {
        checkElement.className = 'availability-check available';
        checkElement.textContent = '✓';
    } else {
        checkElement.className = 'availability-check unavailable';
        checkElement.textContent = '✗';
    }
};

// Debounced availability check - will be created after components load
let debouncedUsernameCheck;
let debouncedEmailCheck;

// Initialize these after debounce is available
const initDebouncedFunctions = () => {
    const debounceFunc = window.debounce || ((func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    });
    
    debouncedUsernameCheck = debounceFunc((value) => checkAvailability('username', value), 500);
    debouncedEmailCheck = debounceFunc((value) => checkAvailability('email', value), 500);
};

// Password Toggle Functionality
const initPasswordToggle = () => {
    // Try login page IDs first, then register page IDs
    const passwordField = document.getElementById('loginPassword') || document.getElementById('registerPassword');
    const toggleButton = document.getElementById('loginPasswordToggle') || document.getElementById('registerPasswordToggle');
    
    if (!passwordField || !toggleButton) return;
    
    toggleButton.addEventListener('click', () => {
        const isPassword = passwordField.type === 'password';
        passwordField.type = isPassword ? 'text' : 'password';
        
        const eyeOpen = toggleButton.querySelector('.eye-open');
        const eyeClosed = toggleButton.querySelector('.eye-closed');
        
        if (eyeOpen && eyeClosed) {
            eyeOpen.style.display = isPassword ? 'none' : 'block';
            eyeClosed.style.display = isPassword ? 'block' : 'none';
        }
    });
};

// Form Validation
const validateForm = (formData, isLogin = false) => {
    const errors = {};
    
    // Email validation
    if (!formData.email) {
        errors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
        errors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!formData.password) {
        errors.password = 'Password is required';
    } else if (!isLogin && !validatePassword(formData.password)) {
        errors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
    }
    
    if (!isLogin) {
        // Username validation
        if (!formData.username) {
            errors.username = 'Username is required';
        } else if (!validateUsername(formData.username)) {
            errors.username = 'Username must be 3-20 characters, letters and numbers only';
        }
        
        // Full name validation
        if (!formData.fullName) {
            errors.fullName = 'Full name is required';
        } else if (formData.fullName.length < 2) {
            errors.fullName = 'Full name must be at least 2 characters';
        }
        
        // Gender validation
        if (!formData.gender) {
            errors.gender = 'Please select your gender';
        }
        
        // Language validation
        if (!formData.nativeLanguage) {
            errors.nativeLanguage = 'Please select your native language';
        }
        
        // Terms validation
        if (!formData.agreeTerms) {
            errors.agreeTerms = 'You must agree to the Terms of Service and Privacy Policy';
        }
    }
    
    return errors;
};

const displayValidationErrors = (errors) => {
    // Determine page prefix based on current page
    const isLoginPage = window.location.pathname.includes('login.html');
    const prefix = isLoginPage ? 'login' : 'register';
    
    // Clear all errors first
    const fields = ['username', 'email', 'password', 'fullName', 'gender', 'nativeLanguage', 'agreeTerms'];
    fields.forEach(field => {
        // Try both prefixed and non-prefixed versions for compatibility
        hideError(`${prefix}${field.charAt(0).toUpperCase() + field.slice(1)}Error`);
        hideError(`${field}Error`);
    });
    
    // Show new errors
    Object.keys(errors).forEach(field => {
        const prefixedField = `${prefix}${field.charAt(0).toUpperCase() + field.slice(1)}Error`;
        const regularField = `${field}Error`;
        
        // Try prefixed version first, fallback to regular
        if (document.getElementById(prefixedField)) {
            showError(prefixedField, errors[field]);
        } else {
            showError(regularField, errors[field]);
        }
    });
};

// LOGIN PAGE FUNCTIONALITY
const initLoginPage = () => {
    console.log('Initializing login page...');
    
    // Initialize debounced functions
    initDebouncedFunctions();
    
    // Check if already authenticated
    checkAuthStatus();
    
    const form = document.getElementById('loginForm');
    if (!form) return;
    
    // Initialize password toggle
    initPasswordToggle();
    
    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = {
            email: formData.get('email'),
            password: formData.get('password'),
            rememberMe: formData.get('rememberMe') === 'on'
        };
        
        // Validate form
        const errors = validateForm(data, true);
        if (Object.keys(errors).length > 0) {
            displayValidationErrors(errors);
            return;
        }
        
        // Clear previous errors
        hideFormMessages();
        setButtonLoading('loginButton', true);
        
        // Submit login request
        const result = await apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        setButtonLoading('loginButton', false);
        
        if (result.success) {
            showFormMessage('success', result.data.message || 'Login successful!');
            
            // Redirect to dashboard after short delay
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
        } else {
            showFormMessage('error', result.data?.error || 'Login failed. Please try again.');
        }
    });
};

// REGISTRATION PAGE FUNCTIONALITY
const initRegisterPage = () => {
    console.log('Initializing registration page...');
    
    // Initialize debounced functions
    initDebouncedFunctions();
    
    // Check if already authenticated
    checkAuthStatus();
    
    const form = document.getElementById('registerForm');
    if (!form) return;
    
    // Initialize password toggle
    initPasswordToggle();
    
    // Username availability check
    const usernameField = document.getElementById('username');
    if (usernameField) {
        usernameField.addEventListener('input', (e) => {
            if (debouncedUsernameCheck) {
                debouncedUsernameCheck(e.target.value);
            }
        });
    }
    
    // Email availability check
    const emailField = document.getElementById('registerEmail');
    if (emailField) {
        emailField.addEventListener('input', (e) => {
            if (debouncedEmailCheck) {
                debouncedEmailCheck(e.target.value);
            }
        });
    }
    
    // Password strength indicator
    const passwordField = document.getElementById('registerPassword');
    if (passwordField) {
        passwordField.addEventListener('input', (e) => {
            updatePasswordStrength(e.target.value);
        });
    }
    
    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            fullName: formData.get('fullName'),
            gender: formData.get('gender'),
            nativeLanguage: formData.get('nativeLanguage'),
            agreeTerms: formData.get('agreeTerms') === 'on'
        };
        
        // Validate form
        const errors = validateForm(data, false);
        if (Object.keys(errors).length > 0) {
            displayValidationErrors(errors);
            return;
        }
        
        // Clear previous errors
        hideFormMessages();
        setButtonLoading('registerButton', true);
        
        // Submit registration request
        const result = await apiCall('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        setButtonLoading('registerButton', false);
        
        if (result.success) {
            showFormMessage('success', result.data.message || 'Registration successful! Redirecting...');
            
            // Redirect to dashboard after short delay
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 2000);
        } else {
            if (result.data?.details) {
                // Show validation errors from server
                const serverErrors = {};
                result.data.details.forEach(error => {
                    const field = error.path || error.param;
                    if (field) {
                        serverErrors[field] = error.msg || error.message;
                    }
                });
                displayValidationErrors(serverErrors);
            }
            
            showFormMessage('error', result.data?.error || 'Registration failed. Please try again.');
        }
    });
};

// Check Authentication Status
const checkAuthStatus = async () => {
    const result = await apiCall('/api/auth/status');
    
    if (result.success && result.data.authenticated) {
        // User is already logged in, redirect to dashboard
        if (window.location.pathname === '/login.html' || window.location.pathname === '/register.html') {
            window.location.href = '/dashboard.html';
        }
    }
};

// Logout Function
const logout = async () => {
    const result = await apiCall('/api/auth/logout', { method: 'POST' });
    
    if (result.success) {
        window.location.href = '/login.html';
    } else {
        console.error('Logout failed:', result.error || result.data?.error);
    }
};

// Auto-hide messages after delay
const autoHideMessages = () => {
    setTimeout(() => {
        hideFormMessages();
    }, 5000);
};

// Initialize based on current page
document.addEventListener('DOMContentLoaded', () => {
    // Wait for other scripts to load
    setTimeout(() => {
        const currentPage = window.location.pathname;
        
        if (currentPage.includes('login.html')) {
            initLoginPage();
        } else if (currentPage.includes('register.html')) {
            initRegisterPage();
        }
        
        // Auto-hide messages
        autoHideMessages();
    }, 50);
});

// Export functions for use in other scripts
window.MivtonAuth = {
    initLoginPage,
    initRegisterPage,
    logout,
    checkAuthStatus,
    apiCall
};