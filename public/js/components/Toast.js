/**
 * ==============================================
 * MIVTON - TOAST NOTIFICATION SYSTEM
 * Phase 2.2 - Modern UI Components
 * Toast notification system with auto-dismiss
 * ==============================================
 */

/**
 * Toast Component Class
 * Standalone toast notifications with animations
 */
class MivtonToast extends (window.MivtonComponents?.BaseComponent || class {}) {
    constructor(options = {}) {
        // Create toast element
        const toastElement = document.createElement('div');
        toastElement.className = 'mivton-toast';
        
        const defaultOptions = {
            className: 'mivton-toast',
            type: 'info',
            title: '',
            message: '',
            duration: 5000,
            closable: true,
            icon: true,
            position: 'top-right',
            animation: 'slide',
            pauseOnHover: true,
            progressBar: true,
            ...options
        };
        
        super(toastElement, defaultOptions);
        
        // Toast-specific properties
        this.timer = null;
        this.progressTimer = null;
        this.isPaused = false;
        this.startTime = 0;
        this.remainingTime = this.options.duration;
    }
    
    /**
     * Custom initialization
     */
    onInit() {
        this.buildToast();
        this.setupEvents();
        this.show();
    }
    
    /**
     * Build toast structure
     */
    buildToast() {
        // Apply toast type
        this.addClass(`toast-${this.options.type}`);
        
        // Create toast content
        const content = document.createElement('div');
        content.className = 'mivton-toast-content';
        
        // Add icon if enabled
        if (this.options.icon) {
            const icon = document.createElement('i');
            icon.className = 'mivton-toast-icon';
            icon.innerHTML = this.getIconForType(this.options.type);
            content.appendChild(icon);
        }
        
        // Create body
        const body = document.createElement('div');
        body.className = 'mivton-toast-body';
        
        // Add title if provided
        if (this.options.title) {
            const title = document.createElement('div');
            title.className = 'mivton-toast-title';
            title.textContent = this.options.title;
            body.appendChild(title);
        }
        
        // Add message
        if (this.options.message) {
            const message = document.createElement('div');
            message.className = 'mivton-toast-message';
            message.textContent = this.options.message;
            body.appendChild(message);
        }
        
        content.appendChild(body);
        this.element.appendChild(content);
        
        // Add close button if closable
        if (this.options.closable) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'mivton-toast-close';
            closeBtn.innerHTML = '×';
            closeBtn.setAttribute('aria-label', 'Close notification');
            this.element.appendChild(closeBtn);
        }
        
        // Add progress bar if enabled
        if (this.options.progressBar && this.options.duration > 0) {
            const progress = document.createElement('div');
            progress.className = 'mivton-toast-progress';
            this.element.appendChild(progress);
        }
    }
    
    /**
     * Get icon for toast type
     */
    getIconForType(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }
    
    /**
     * Setup event handlers
     */
    setupEvents() {
        // Close button click
        const closeBtn = this.element.querySelector('.mivton-toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // Pause on hover
        if (this.options.pauseOnHover) {
            this.element.addEventListener('mouseenter', () => this.pause());
            this.element.addEventListener('mouseleave', () => this.resume());
        }
        
        // Click to close
        if (this.options.clickToClose) {
            this.element.addEventListener('click', () => this.close());
        }
    }
    
    /**
     * Show toast with animation
     */
    show() {
        // Add to container
        const container = MivtonToast.getContainer(this.options.position);
        container.appendChild(this.element);
        
        // Trigger show animation
        requestAnimationFrame(() => {
            this.addClass('toast-show');
        });
        
        // Start auto-dismiss timer
        if (this.options.duration > 0) {
            this.startTimer();
        }
        
        // Start progress bar animation
        if (this.options.progressBar && this.options.duration > 0) {
            this.startProgressBar();
        }
        
        this.emit('show');
        return this;
    }
    
    /**
     * Close toast with animation
     */
    close() {
        // Clear timers
        this.clearTimers();
        
        // Add hide animation
        this.addClass('toast-hide');
        this.removeClass('toast-show');
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            this.emit('close');
            this.destroy();
        }, 300);
        
        return this;
    }
    
    /**
     * Start auto-dismiss timer
     */
    startTimer() {
        this.startTime = Date.now();
        this.timer = setTimeout(() => {
            this.close();
        }, this.remainingTime);
    }
    
    /**
     * Clear all timers
     */
    clearTimers() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        
        if (this.progressTimer) {
            clearInterval(this.progressTimer);
            this.progressTimer = null;
        }
    }
    
    /**
     * Pause auto-dismiss
     */
    pause() {
        if (this.isPaused || !this.timer) return;
        
        this.isPaused = true;
        this.remainingTime -= Date.now() - this.startTime;
        this.clearTimers();
        
        // Pause progress bar
        const progressBar = this.element.querySelector('.mivton-toast-progress');
        if (progressBar) {
            progressBar.style.animationPlayState = 'paused';
        }
        
        this.emit('pause');
    }
    
    /**
     * Resume auto-dismiss
     */
    resume() {
        if (!this.isPaused) return;
        
        this.isPaused = false;
        this.startTimer();
        
        // Resume progress bar
        const progressBar = this.element.querySelector('.mivton-toast-progress');
        if (progressBar) {
            progressBar.style.animationPlayState = 'running';
        }
        
        this.emit('resume');
    }
    
    /**
     * Start progress bar animation
     */
    startProgressBar() {
        const progressBar = this.element.querySelector('.mivton-toast-progress');
        if (!progressBar) return;
        
        progressBar.style.width = '100%';
        progressBar.style.transition = `width ${this.options.duration}ms linear`;
        
        // Animate to 0 width
        requestAnimationFrame(() => {
            progressBar.style.width = '0%';
        });
    }
    
    /**
     * Update toast content
     */
    updateContent(title, message) {
        const titleElement = this.element.querySelector('.mivton-toast-title');
        const messageElement = this.element.querySelector('.mivton-toast-message');
        
        if (title && titleElement) {
            titleElement.textContent = title;
        }
        
        if (message && messageElement) {
            messageElement.textContent = message;
        }
        
        this.emit('content-updated', { title, message });
        return this;
    }
    
    /**
     * Static method to get or create toast container
     */
    static getContainer(position = 'top-right') {
        const containerId = `mivton-toast-container-${position}`;
        let container = document.getElementById(containerId);
        
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.className = `mivton-toast-container toast-${position}`;
            
            // Position the container
            this.positionContainer(container, position);
            
            document.body.appendChild(container);
        }
        
        return container;
    }
    
    /**
     * Position toast container
     */
    static positionContainer(container, position) {
        // Reset all positioning
        container.style.top = 'auto';
        container.style.bottom = 'auto';
        container.style.left = 'auto';
        container.style.right = 'auto';
        
        switch (position) {
            case 'top-left':
                container.style.top = '1rem';
                container.style.left = '1rem';
                break;
            case 'top-center':
                container.style.top = '1rem';
                container.style.left = '50%';
                container.style.transform = 'translateX(-50%)';
                break;
            case 'top-right':
            default:
                container.style.top = '1rem';
                container.style.right = '1rem';
                break;
            case 'bottom-left':
                container.style.bottom = '1rem';
                container.style.left = '1rem';
                break;
            case 'bottom-center':
                container.style.bottom = '1rem';
                container.style.left = '50%';
                container.style.transform = 'translateX(-50%)';
                break;
            case 'bottom-right':
                container.style.bottom = '1rem';
                container.style.right = '1rem';
                break;
        }
    }
    
    /**
     * Static method to create and show toast
     */
    static show(options) {
        const toast = new MivtonToast(options);
        return toast;
    }
    
    /**
     * Static convenience methods
     */
    static success(message, title = '', options = {}) {
        return this.show({
            type: 'success',
            title,
            message,
            ...options
        });
    }
    
    static error(message, title = '', options = {}) {
        return this.show({
            type: 'error',
            title,
            message,
            duration: 0, // Don't auto-dismiss errors
            ...options
        });
    }
    
    static warning(message, title = '', options = {}) {
        return this.show({
            type: 'warning',
            title,
            message,
            ...options
        });
    }
    
    static info(message, title = '', options = {}) {
        return this.show({
            type: 'info',
            title,
            message,
            ...options
        });
    }
    
    /**
     * Clear all toasts
     */
    static clearAll(position = null) {
        if (position) {
            const container = document.getElementById(`mivton-toast-container-${position}`);
            if (container) {
                container.innerHTML = '';
            }
        } else {
            // Clear all containers
            const containers = document.querySelectorAll('[id^="mivton-toast-container-"]');
            containers.forEach(container => {
                container.innerHTML = '';
            });
        }
    }
    
    /**
     * Get all active toasts
     */
    static getAll(position = null) {
        const toasts = [];
        
        if (position) {
            const container = document.getElementById(`mivton-toast-container-${position}`);
            if (container) {
                toasts.push(...container.querySelectorAll('.mivton-toast'));
            }
        } else {
            const containers = document.querySelectorAll('[id^="mivton-toast-container-"]');
            containers.forEach(container => {
                toasts.push(...container.querySelectorAll('.mivton-toast'));
            });
        }
        
        return toasts;
    }
}

/**
 * Register component globally
 */
if (typeof window !== 'undefined') {
    window.MivtonComponents = window.MivtonComponents || {};
    window.MivtonComponents.Toast = MivtonToast;
    
    // Add global toast methods for convenience
    window.toast = {
        show: (options) => MivtonToast.show(options),
        success: (message, title, options) => MivtonToast.success(message, title, options),
        error: (message, title, options) => MivtonToast.error(message, title, options),
        warning: (message, title, options) => MivtonToast.warning(message, title, options),
        info: (message, title, options) => MivtonToast.info(message, title, options),
        clear: (position) => MivtonToast.clearAll(position)
    };
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MivtonToast;
}
