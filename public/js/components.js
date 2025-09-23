// Reusable UI Components JavaScript

// Toast Notification System
class ToastManager {
    constructor() {
        this.container = document.getElementById('toastContainer') || this.createContainer();
        this.toasts = new Set();
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }

    show(message, type = 'info', duration = 5000) {
        const toast = this.createToast(message, type);
        this.container.appendChild(toast);
        this.toasts.add(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                this.remove(toast);
            }, duration);
        }

        return toast;
    }

    createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease-out';

        const title = this.getToastTitle(type);
        
        toast.innerHTML = `
            <div class="toast-header">
                <div class="toast-title">${title}</div>
                <button class="toast-close">&times;</button>
            </div>
            <div class="toast-message">${message}</div>
        `;

        // Add click handler for close button
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.remove(toast));

        return toast;
    }

    getToastTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        };
        return titles[type] || 'Notification';
    }

    remove(toast) {
        if (!this.toasts.has(toast)) return;

        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            this.toasts.delete(toast);
        }, 300);
    }

    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
}

// Modal Manager
class ModalManager {
    constructor() {
        this.modals = new Map();
        this.activeModal = null;
        this.bindGlobalEvents();
    }

    bindGlobalEvents() {
        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.close(this.activeModal);
            }
        });

        // Close modal on backdrop click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') && this.activeModal) {
                this.close(this.activeModal);
            }
        });
    }

    create(id, options = {}) {
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'modal';
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        
        const header = document.createElement('div');
        header.className = 'modal-header';
        
        const title = document.createElement('h3');
        title.className = 'modal-title';
        title.textContent = options.title || 'Modal';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => this.close(id));
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        const body = document.createElement('div');
        body.className = 'modal-body';
        body.innerHTML = options.body || '';
        
        content.appendChild(header);
        content.appendChild(body);
        
        if (options.actions) {
            const actions = document.createElement('div');
            actions.className = 'modal-actions';
            actions.innerHTML = options.actions;
            content.appendChild(actions);
        }
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        this.modals.set(id, modal);
        return modal;
    }

    show(id, options = {}) {
        let modal = this.modals.get(id);
        
        if (!modal) {
            modal = this.create(id, options);
        } else if (options.title || options.body || options.actions) {
            this.update(id, options);
        }

        // Close any active modal first
        if (this.activeModal && this.activeModal !== id) {
            this.close(this.activeModal);
        }

        modal.classList.add('active');
        this.activeModal = id;
        document.body.style.overflow = 'hidden';

        return modal;
    }

    close(id) {
        const modal = this.modals.get(id);
        if (!modal) return;

        modal.classList.remove('active');
        this.activeModal = null;
        document.body.style.overflow = '';
    }

    update(id, options) {
        const modal = this.modals.get(id);
        if (!modal) return;

        if (options.title) {
            const title = modal.querySelector('.modal-title');
            if (title) title.textContent = options.title;
        }

        if (options.body) {
            const body = modal.querySelector('.modal-body');
            if (body) body.innerHTML = options.body;
        }

        if (options.actions) {
            let actions = modal.querySelector('.modal-actions');
            if (!actions) {
                actions = document.createElement('div');
                actions.className = 'modal-actions';
                modal.querySelector('.modal-content').appendChild(actions);
            }
            actions.innerHTML = options.actions;
        }
    }

    remove(id) {
        const modal = this.modals.get(id);
        if (!modal) return;

        this.close(id);
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
            this.modals.delete(id);
        }, 200);
    }
}

// Confirmation Dialog
function showConfirmDialog(message, title = 'Confirm Action') {
    return new Promise((resolve) => {
        const modal = window.modal.show('confirmModal', {
            title: title,
            body: `<p>${message}</p>`,
            actions: `
                <button class="btn secondary" onclick="window.modal.close('confirmModal'); window.confirmResolve(false);">Cancel</button>
                <button class="btn primary" onclick="window.modal.close('confirmModal'); window.confirmResolve(true);">Confirm</button>
            `
        });

        window.confirmResolve = resolve;
    });
}

// Loading Overlay
class LoadingOverlay {
    constructor() {
        this.overlay = null;
    }

    show(message = 'Loading...') {
        this.hide(); // Remove any existing overlay

        this.overlay = document.createElement('div');
        this.overlay.className = 'loading-overlay';
        this.overlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner large"></div>
                <div class="loading-text">${message}</div>
            </div>
        `;

        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(20px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            color: var(--text);
        `;

        document.body.appendChild(this.overlay);
        document.body.style.overflow = 'hidden';
    }

    hide() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
            this.overlay = null;
            document.body.style.overflow = '';
        }
    }
}

// Tab Manager
class TabManager {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) return;

        this.tabBtns = this.container.querySelectorAll('.tab-btn');
        this.tabContents = this.container.querySelectorAll('.tab-content');

        this.bindEvents();
        this.showTab(this.getActiveTabId() || this.getFirstTabId());
    }

    bindEvents() {
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = btn.dataset.tab;
                this.showTab(tabId);
            });
        });
    }

    showTab(tabId) {
        // Update buttons
        this.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        // Update content
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}-requests`);
        });
    }

    getActiveTabId() {
        const activeBtn = this.container.querySelector('.tab-btn.active');
        return activeBtn ? activeBtn.dataset.tab : null;
    }

    getFirstTabId() {
        const firstBtn = this.container.querySelector('.tab-btn');
        return firstBtn ? firstBtn.dataset.tab : null;
    }
}

// Form Validation
class FormValidator {
    constructor(formSelector) {
        this.form = document.querySelector(formSelector);
        if (!this.form) return;

        this.errors = new Map();
        this.bindEvents();
    }

    bindEvents() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.validate()) {
                this.onSubmit(new FormData(this.form));
            }
        });

        // Real-time validation
        const inputs = this.form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    validateField(field) {
        const value = field.value.trim();
        const rules = this.getValidationRules(field);
        
        for (const rule of rules) {
            if (!rule.test(value, field)) {
                this.setFieldError(field, rule.message);
                return false;
            }
        }
        
        this.clearFieldError(field);
        return true;
    }

    getValidationRules(field) {
        const rules = [];
        
        if (field.required) {
            rules.push({
                test: (value) => value.length > 0,
                message: 'This field is required'
            });
        }
        
        if (field.type === 'email') {
            rules.push({
                test: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
                message: 'Please enter a valid email address'
            });
        }
        
        if (field.minLength) {
            rules.push({
                test: (value) => value.length >= field.minLength,
                message: `Must be at least ${field.minLength} characters`
            });
        }
        
        if (field.maxLength) {
            rules.push({
                test: (value) => value.length <= field.maxLength,
                message: `Must be no more than ${field.maxLength} characters`
            });
        }
        
        return rules;
    }

    setFieldError(field, message) {
        this.errors.set(field.name, message);
        field.classList.add('form-error');
        
        let errorElement = field.parentNode.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            field.parentNode.appendChild(errorElement);
        }
        errorElement.textContent = message;
    }

    clearFieldError(field) {
        this.errors.delete(field.name);
        field.classList.remove('form-error');
        
        const errorElement = field.parentNode.querySelector('.error-message');
        if (errorElement) {
            errorElement.remove();
        }
    }

    validate() {
        this.errors.clear();
        const inputs = this.form.querySelectorAll('input, select, textarea');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    onSubmit(formData) {
        // Override this method in instances
        console.log('Form submitted:', formData);
    }
}

// Dropdown Menu
class DropdownMenu {
    constructor(triggerSelector) {
        this.trigger = document.querySelector(triggerSelector);
        if (!this.trigger) return;

        this.menu = this.trigger.nextElementSibling;
        this.isOpen = false;
        
        this.bindEvents();
    }

    bindEvents() {
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Close on outside click
        document.addEventListener('click', () => {
            if (this.isOpen) {
                this.close();
            }
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    open() {
        this.menu.classList.add('active');
        this.trigger.classList.add('active');
        this.isOpen = true;
    }

    close() {
        this.menu.classList.remove('active');
        this.trigger.classList.remove('active');
        this.isOpen = false;
    }
}

// Search Component
class SearchComponent {
    constructor(inputSelector, options = {}) {
        this.input = document.querySelector(inputSelector);
        if (!this.input) return;

        this.options = {
            debounceMs: 300,
            minLength: 2,
            onSearch: () => {},
            onClear: () => {},
            ...options
        };

        this.debounceTimer = null;
        this.bindEvents();
    }

    bindEvents() {
        this.input.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            clearTimeout(this.debounceTimer);
            
            if (query.length === 0) {
                this.options.onClear();
                return;
            }
            
            if (query.length < this.options.minLength) {
                return;
            }

            this.debounceTimer = setTimeout(() => {
                this.options.onSearch(query);
            }, this.options.debounceMs);
        });

        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = e.target.value.trim();
                if (query.length >= this.options.minLength) {
                    this.options.onSearch(query);
                }
            }
        });
    }

    clear() {
        this.input.value = '';
        this.options.onClear();
    }

    focus() {
        this.input.focus();
    }
}

// Avatar Generator
function generateAvatar(name, size = 'medium') {
    const initials = name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 2);

    const avatar = document.createElement('div');
    avatar.className = `avatar ${size} primary`;
    avatar.textContent = initials;
    
    return avatar;
}

// Utility Functions
function formatTimeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return days === 1 ? '1 day ago' : `${days} days ago`;
    } else if (hours > 0) {
        return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    } else if (minutes > 0) {
        return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    } else {
        return 'Just now';
    }
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
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

// Animation Helpers
function fadeIn(element, duration = 300) {
    element.style.opacity = '0';
    element.style.display = 'block';
    
    let opacity = 0;
    const timer = setInterval(() => {
        opacity += 50 / duration;
        if (opacity >= 1) {
            clearInterval(timer);
            opacity = 1;
        }
        element.style.opacity = opacity;
    }, 50);
}

function fadeOut(element, duration = 300) {
    let opacity = 1;
    const timer = setInterval(() => {
        opacity -= 50 / duration;
        if (opacity <= 0) {
            clearInterval(timer);
            element.style.display = 'none';
            opacity = 0;
        }
        element.style.opacity = opacity;
    }, 50);
}

// Initialize global instances
window.toast = new ToastManager();
window.modal = new ModalManager();
window.loading = new LoadingOverlay();

// Add to MivtonComponents namespace for compatibility
if (typeof window !== 'undefined') {
    window.MivtonComponents = window.MivtonComponents || {};
    window.MivtonComponents.Toast = window.toast;
    window.MivtonComponents.Modal = window.modal;
    window.MivtonComponents.Loading = window.loading;
}

// Expose utility functions globally
window.formatNumber = formatNumber;
window.formatTimeAgo = formatTimeAgo;
window.generateAvatar = generateAvatar;
window.showConfirmDialog = showConfirmDialog;
window.debounce = debounce;
window.throttle = throttle;

// Expose classes globally
window.TabManager = TabManager;
window.SearchComponent = SearchComponent;
window.FormValidator = FormValidator;
window.DropdownMenu = DropdownMenu;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ToastManager,
        ModalManager,
        FormValidator,
        DropdownMenu,
        SearchComponent,
        TabManager,
        LoadingOverlay,
        generateAvatar,
        formatTimeAgo,
        formatNumber,
        debounce,
        throttle,
        fadeIn,
        fadeOut,
        showConfirmDialog
    };
}