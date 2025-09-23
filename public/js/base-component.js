/**
 * ==============================================
 * MIVTON - BASE COMPONENT CLASS
 * Phase 2.3 - User Interface Polish
 * Base JavaScript component class for inheritance
 * ==============================================
 */

/**
 * Base Component Class
 * Provides common functionality for all Mivton components
 */
class MivtonBaseComponent {
    constructor(element, options = {}) {
        // Validate element
        if (!element) {
            throw new Error('Element is required for component initialization');
        }
        
        // Handle element selection
        if (typeof element === 'string') {
            this.element = document.querySelector(element);
            if (!this.element) {
                throw new Error(`Element not found: ${element}`);
            }
        } else if (element instanceof HTMLElement) {
            this.element = element;
        } else {
            throw new Error('Element must be a CSS selector string or HTMLElement');
        }
        
        // Component configuration
        this.options = { ...this.getDefaultOptions(), ...options };
        
        // Component state
        this.state = {
            initialized: false,
            destroyed: false,
            loading: false,
            disabled: false,
            visible: true
        };
        
        // Event system
        this.events = {};
        this.boundEvents = new Map();
        
        // Component ID
        this.id = this.generateId();
        
        // Add component class
        this.element.classList.add('mivton-component');
        this.element.setAttribute('data-mivton-component', this.constructor.name);
        this.element.setAttribute('data-mivton-id', this.id);
        
        // Initialize component
        try {
            this.initialize();
            this.state.initialized = true;
            this.emit('initialized');
        } catch (error) {
            this.handleError(error, 'initialize');
        }
    }
    
    /**
     * Get default options for the component
     * Override in child classes
     */
    getDefaultOptions() {
        return {
            debug: false,
            autoDestroy: true,
            accessibility: true,
            animations: true
        };
    }
    
    /**
     * Initialize component
     * Override in child classes
     */
    initialize() {
        // Base initialization logic
        this.setupAccessibility();
        this.setupEventListeners();
    }
    
    /**
     * Setup accessibility features
     */
    setupAccessibility() {
        if (!this.options.accessibility) return;
        
        // Add ARIA attributes if not present
        if (!this.element.hasAttribute('role')) {
            this.element.setAttribute('role', 'widget');
        }
        
        // Add tabindex if focusable
        if (this.options.focusable && !this.element.hasAttribute('tabindex')) {
            this.element.setAttribute('tabindex', '0');
        }
    }
    
    /**
     * Setup base event listeners
     */
    setupEventListeners() {
        // Handle visibility changes
        if (typeof IntersectionObserver !== 'undefined') {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.target === this.element) {
                        this.handleVisibilityChange(entry.isIntersecting);
                    }
                });
            });
            this.intersectionObserver.observe(this.element);
        }
        
        // Handle resize events
        this.resizeObserver = new ResizeObserver(() => {
            this.handleResize();
        });
        this.resizeObserver.observe(this.element);
    }
    
    /**
     * Handle component visibility changes
     */
    handleVisibilityChange(isVisible) {
        this.state.visible = isVisible;
        this.emit('visibility-changed', { visible: isVisible });
    }
    
    /**
     * Handle component resize
     */
    handleResize() {
        this.emit('resize', {
            width: this.element.offsetWidth,
            height: this.element.offsetHeight
        });
    }
    
    /**
     * Event system - Add event listener
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        return this;
    }
    
    /**
     * Event system - Remove event listener
     */
    off(event, callback) {
        if (!this.events[event]) return this;
        
        if (callback) {
            const index = this.events[event].indexOf(callback);
            if (index > -1) {
                this.events[event].splice(index, 1);
            }
        } else {
            this.events[event] = [];
        }
        return this;
    }
    
    /**
     * Event system - Emit event
     */
    emit(event, data = null) {
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback.call(this, data);
                } catch (error) {
                    this.handleError(error, 'event-callback');
                }
            });
        }
        
        // Also emit as DOM event
        const customEvent = new CustomEvent(`mivton:${event}`, {
            detail: { component: this, data }
        });
        this.element.dispatchEvent(customEvent);
        
        return this;
    }
    
    /**
     * Add DOM event listener with automatic cleanup
     */
    addEventListener(element, event, callback, options = {}) {
        const target = typeof element === 'string' ? document.querySelector(element) : element;
        if (!target) return;
        
        const boundCallback = callback.bind(this);
        target.addEventListener(event, boundCallback, options);
        
        // Store for cleanup
        const key = `${target.tagName}-${event}-${Date.now()}`;
        this.boundEvents.set(key, {
            element: target,
            event,
            callback: boundCallback,
            options
        });
        
        return key;
    }
    
    /**
     * Remove DOM event listener
     */
    removeEventListener(key) {
        const listener = this.boundEvents.get(key);
        if (listener) {
            listener.element.removeEventListener(listener.event, listener.callback, listener.options);
            this.boundEvents.delete(key);
        }
    }
    
    /**
     * Set component state
     */
    setState(newState) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };
        this.emit('state-changed', { oldState, newState: this.state });
        this.updateUI();
        return this;
    }
    
    /**
     * Get component state
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * Update UI based on state
     * Override in child classes
     */
    updateUI() {
        // Update component classes based on state
        this.element.classList.toggle('loading', this.state.loading);
        this.element.classList.toggle('disabled', this.state.disabled);
        this.element.classList.toggle('hidden', !this.state.visible);
    }
    
    /**
     * Show loading state
     */
    showLoading(message = 'Loading...') {
        this.setState({ loading: true });
        this.emit('loading-start', { message });
        return this;
    }
    
    /**
     * Hide loading state
     */
    hideLoading() {
        this.setState({ loading: false });
        this.emit('loading-end');
        return this;
    }
    
    /**
     * Enable component
     */
    enable() {
        this.setState({ disabled: false });
        this.element.removeAttribute('disabled');
        this.emit('enabled');
        return this;
    }
    
    /**
     * Disable component
     */
    disable() {
        this.setState({ disabled: true });
        this.element.setAttribute('disabled', 'true');
        this.emit('disabled');
        return this;
    }
    
    /**
     * Show component
     */
    show() {
        this.setState({ visible: true });
        this.element.style.display = '';
        this.emit('shown');
        return this;
    }
    
    /**
     * Hide component
     */
    hide() {
        this.setState({ visible: false });
        this.element.style.display = 'none';
        this.emit('hidden');
        return this;
    }
    
    /**
     * Focus component
     */
    focus() {
        if (this.element.tabIndex >= 0) {
            this.element.focus();
        } else {
            // Find first focusable element
            const focusable = this.element.querySelector(
                'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusable) {
                focusable.focus();
            }
        }
        return this;
    }
    
    /**
     * Get component dimensions
     */
    getDimensions() {
        const rect = this.element.getBoundingClientRect();
        return {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
            bottom: rect.bottom,
            right: rect.right
        };
    }
    
    /**
     * Generate unique component ID
     */
    generateId() {
        return `mivton-${this.constructor.name.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Log debug messages
     */
    log(...args) {
        if (this.options.debug) {
            console.log(`[${this.constructor.name}:${this.id}]`, ...args);
        }
    }
    
    /**
     * Log warning messages
     */
    warn(...args) {
        if (this.options.debug) {
            console.warn(`[${this.constructor.name}:${this.id}]`, ...args);
        }
    }
    
    /**
     * Handle errors
     */
    handleError(error, context = 'unknown') {
        const errorData = {
            error,
            context,
            component: this.constructor.name,
            id: this.id
        };
        
        console.error(`[${this.constructor.name}:${this.id}] Error in ${context}:`, error);
        this.emit('error', errorData);
        
        // Don't let errors crash the component
        return false;
    }
    
    /**
     * Animate element
     */
    animate(keyframes, options = {}) {
        if (!this.options.animations) {
            return Promise.resolve();
        }
        
        const defaultOptions = {
            duration: 300,
            easing: 'ease',
            fill: 'both'
        };
        
        const animation = this.element.animate(keyframes, { ...defaultOptions, ...options });
        return animation.finished;
    }
    
    /**
     * Fade in animation
     */
    fadeIn(duration = 300) {
        return this.animate([
            { opacity: 0 },
            { opacity: 1 }
        ], { duration });
    }
    
    /**
     * Fade out animation
     */
    fadeOut(duration = 300) {
        return this.animate([
            { opacity: 1 },
            { opacity: 0 }
        ], { duration });
    }
    
    /**
     * Slide in animation
     */
    slideIn(direction = 'up', duration = 300) {
        const transforms = {
            up: ['translateY(20px)', 'translateY(0)'],
            down: ['translateY(-20px)', 'translateY(0)'],
            left: ['translateX(20px)', 'translateX(0)'],
            right: ['translateX(-20px)', 'translateX(0)']
        };
        
        return this.animate([
            { opacity: 0, transform: transforms[direction][0] },
            { opacity: 1, transform: transforms[direction][1] }
        ], { duration });
    }
    
    /**
     * Scale animation
     */
    scale(fromScale = 0.95, toScale = 1, duration = 200) {
        return this.animate([
            { opacity: 0, transform: `scale(${fromScale})` },
            { opacity: 1, transform: `scale(${toScale})` }
        ], { duration });
    }
    
    /**
     * Cleanup component resources
     */
    cleanup() {
        // Remove all DOM event listeners
        this.boundEvents.forEach((listener, key) => {
            this.removeEventListener(key);
        });
        
        // Remove observers
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        // Clear events
        this.events = {};
        
        // Remove component attributes
        this.element.removeAttribute('data-mivton-component');
        this.element.removeAttribute('data-mivton-id');
        this.element.classList.remove('mivton-component');
    }
    
    /**
     * Destroy component
     */
    destroy() {
        if (this.state.destroyed) {
            this.warn('Component already destroyed');
            return;
        }
        
        this.emit('before-destroy');
        
        // Call custom cleanup if exists
        if (typeof this.onDestroy === 'function') {
            try {
                this.onDestroy();
            } catch (error) {
                this.handleError(error, 'onDestroy');
            }
        }
        
        // Cleanup resources
        this.cleanup();
        
        // Mark as destroyed
        this.setState({ destroyed: true });
        this.emit('destroyed');
        
        // Remove reference to element
        this.element = null;
    }
    
    /**
     * Static method to create component from element
     */
    static create(element, options = {}) {
        return new this(element, options);
    }
    
    /**
     * Static method to get component from element
     */
    static getInstance(element) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) return null;
        
        const componentId = el.getAttribute('data-mivton-id');
        if (!componentId) return null;
        
        // Search in global component registry if available
        if (window.MivtonComponents && window.MivtonComponents.registry) {
            return window.MivtonComponents.registry.get(componentId);
        }
        
        return null;
    }
    
    /**
     * Utility method to debounce function calls
     */
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    
    /**
     * Utility method to throttle function calls
     */
    throttle(func, limit) {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    /**
     * Utility method to format numbers
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
    
    /**
     * Utility method to format dates
     */
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        
        return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options })
            .format(new Date(date));
    }
    
    /**
     * Utility method to format relative time
     */
    formatRelativeTime(date) {
        const now = new Date();
        const past = new Date(date);
        const diff = now - past;
        
        const minute = 60 * 1000;
        const hour = minute * 60;
        const day = hour * 24;
        const week = day * 7;
        const month = day * 30;
        const year = day * 365;
        
        if (diff < minute) return 'just now';
        if (diff < hour) return Math.floor(diff / minute) + 'm ago';
        if (diff < day) return Math.floor(diff / hour) + 'h ago';
        if (diff < week) return Math.floor(diff / day) + 'd ago';
        if (diff < month) return Math.floor(diff / week) + 'w ago';
        if (diff < year) return Math.floor(diff / month) + 'mo ago';
        return Math.floor(diff / year) + 'y ago';
    }
}

/**
 * Component Registry
 * Manages component instances globally
 */
class MivtonComponentRegistry {
    constructor() {
        this.components = new Map();
    }
    
    register(component) {
        this.components.set(component.id, component);
    }
    
    unregister(componentId) {
        this.components.delete(componentId);
    }
    
    get(componentId) {
        return this.components.get(componentId);
    }
    
    getAll() {
        return Array.from(this.components.values());
    }
    
    getByType(componentType) {
        return this.getAll().filter(component => 
            component.constructor.name === componentType
        );
    }
    
    destroyAll() {
        this.components.forEach(component => {
            try {
                component.destroy();
            } catch (error) {
                console.error('Error destroying component:', error);
            }
        });
        this.components.clear();
    }
}

/**
 * Global namespace setup
 */
if (typeof window !== 'undefined') {
    window.MivtonComponents = window.MivtonComponents || {};
    window.MivtonComponents.BaseComponent = MivtonBaseComponent;
    window.MivtonComponents.registry = new MivtonComponentRegistry();
    
    // Auto-cleanup on page unload
    window.addEventListener('beforeunload', () => {
        window.MivtonComponents.registry.destroyAll();
    });
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MivtonBaseComponent;
}
