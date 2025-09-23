/**
 * ==============================================
 * MIVTON - BASE COMPONENT CLASS
 * Phase 2.2 - Modern UI Components
 * Base component architecture with inheritance patterns
 * ==============================================
 */

/**
 * Base Component Class
 * Provides common functionality for all Mivton components
 * Following Phase 2.1 lessons: Global namespace management and defensive programming
 */
class MivtonBaseComponent {
    constructor(element, options = {}) {
        // Defensive programming - ensure element exists
        if (!element) {
            console.error('MivtonBaseComponent: Element is required');
            return null;
        }
        
        this.element = typeof element === 'string' ? document.querySelector(element) : element;
        
        if (!this.element) {
            console.error('MivtonBaseComponent: Element not found');
            return null;
        }
        
        // Default options with fallbacks
        this.options = {
            autoInit: true,
            debug: false,
            className: 'mivton-component',
            animations: true,
            accessibility: true,
            ...options
        };
        
        // Component state
        this.state = {
            initialized: false,
            disabled: false,
            visible: true,
            loading: false
        };
        
        // Event handlers storage
        this.handlers = new Map();
        
        // Initialize if auto-init is enabled
        if (this.options.autoInit) {
            this.init();
        }
    }
    
    /**
     * Initialize the component
     */
    init() {
        try {
            if (this.state.initialized) {
                this.log('Component already initialized');
                return this;
            }
            
            // Add base class
            this.addClass(this.options.className);
            
            // Setup accessibility if enabled
            if (this.options.accessibility) {
                this.setupAccessibility();
            }
            
            // Setup animations if enabled
            if (this.options.animations) {
                this.setupAnimations();
            }
            
            // Call custom initialization
            this.onInit();
            
            // Mark as initialized
            this.state.initialized = true;
            
            // Emit initialization event
            this.emit('init', { component: this });
            
            this.log('Component initialized successfully');
            return this;
            
        } catch (error) {
            console.error('MivtonBaseComponent init error:', error);
            this.handleError(error);
            return null;
        }
    }
    
    /**
     * Custom initialization hook - override in subclasses
     */
    onInit() {
        // Override in subclasses
    }
    
    /**
     * Setup accessibility features
     */
    setupAccessibility() {
        // Add ARIA attributes if not present
        if (!this.element.hasAttribute('role') && this.options.role) {
            this.element.setAttribute('role', this.options.role);
        }
        
        // Ensure focusable elements have tabindex
        if (this.options.focusable && !this.element.hasAttribute('tabindex')) {
            this.element.setAttribute('tabindex', '0');
        }
    }
    
    /**
     * Setup animation support
     */
    setupAnimations() {
        this.addClass('animate-optimized');
        
        // Check for reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.options.animations = false;
        }
    }
    
    /**
     * Add CSS class with error handling
     */
    addClass(className) {
        if (!className || !this.element) return this;
        
        try {
            this.element.classList.add(className);
        } catch (error) {
            this.log('Error adding class:', error);
        }
        return this;
    }
    
    /**
     * Remove CSS class with error handling
     */
    removeClass(className) {
        if (!className || !this.element) return this;
        
        try {
            this.element.classList.remove(className);
        } catch (error) {
            this.log('Error removing class:', error);
        }
        return this;
    }
    
    /**
     * Toggle CSS class
     */
    toggleClass(className, force = null) {
        if (!className || !this.element) return this;
        
        try {
            if (force !== null) {
                this.element.classList.toggle(className, force);
            } else {
                this.element.classList.toggle(className);
            }
        } catch (error) {
            this.log('Error toggling class:', error);
        }
        return this;
    }
    
    /**
     * Check if element has class
     */
    hasClass(className) {
        if (!className || !this.element) return false;
        return this.element.classList.contains(className);
    }
    
    /**
     * Set attribute with error handling
     */
    setAttribute(name, value) {
        if (!name || !this.element) return this;
        
        try {
            this.element.setAttribute(name, value);
        } catch (error) {
            this.log('Error setting attribute:', error);
        }
        return this;
    }
    
    /**
     * Get attribute with fallback
     */
    getAttribute(name, fallback = null) {
        if (!name || !this.element) return fallback;
        return this.element.getAttribute(name) || fallback;
    }
    
    /**
     * Add event listener with cleanup tracking
     */
    on(event, handler, options = {}) {
        if (!event || !handler || !this.element) return this;
        
        try {
            // Store handler for cleanup
            if (!this.handlers.has(event)) {
                this.handlers.set(event, []);
            }
            this.handlers.get(event).push({ handler, options });
            
            // Add event listener
            this.element.addEventListener(event, handler, options);
            
        } catch (error) {
            this.log('Error adding event listener:', error);
        }
        return this;
    }
    
    /**
     * Remove event listener
     */
    off(event, handler) {
        if (!event || !handler || !this.element) return this;
        
        try {
            this.element.removeEventListener(event, handler);
            
            // Remove from tracking
            if (this.handlers.has(event)) {
                const handlers = this.handlers.get(event);
                const index = handlers.findIndex(h => h.handler === handler);
                if (index !== -1) {
                    handlers.splice(index, 1);
                }
            }
            
        } catch (error) {
            this.log('Error removing event listener:', error);
        }
        return this;
    }
    
    /**
     * Emit custom event
     */
    emit(eventName, detail = {}) {
        if (!eventName || !this.element) return this;
        
        try {
            const event = new CustomEvent(`mivton:${eventName}`, {
                detail,
                bubbles: true,
                cancelable: true
            });
            this.element.dispatchEvent(event);
        } catch (error) {
            this.log('Error emitting event:', error);
        }
        return this;
    }
    
    /**
     * Show component with optional animation
     */
    show(animation = null) {
        if (!this.element) return this;
        
        try {
            this.state.visible = true;
            this.removeClass('hidden');
            
            if (animation && this.options.animations) {
                this.addClass(`animate-${animation}`);
            }
            
            this.emit('show');
        } catch (error) {
            this.handleError(error);
        }
        return this;
    }
    
    /**
     * Hide component with optional animation
     */
    hide(animation = null) {
        if (!this.element) return this;
        
        try {
            this.state.visible = false;
            
            if (animation && this.options.animations) {
                this.addClass(`animate-${animation}`);
                // Hide after animation completes
                setTimeout(() => {
                    this.addClass('hidden');
                    this.removeClass(`animate-${animation}`);
                }, 300);
            } else {
                this.addClass('hidden');
            }
            
            this.emit('hide');
        } catch (error) {
            this.handleError(error);
        }
        return this;
    }
    
    /**
     * Enable component
     */
    enable() {
        if (!this.element) return this;
        
        this.state.disabled = false;
        this.removeClass('disabled');
        this.element.removeAttribute('disabled');
        this.emit('enable');
        return this;
    }
    
    /**
     * Disable component
     */
    disable() {
        if (!this.element) return this;
        
        this.state.disabled = true;
        this.addClass('disabled');
        this.setAttribute('disabled', 'disabled');
        this.emit('disable');
        return this;
    }
    
    /**
     * Set loading state
     */
    setLoading(loading = true) {
        if (!this.element) return this;
        
        this.state.loading = loading;
        this.toggleClass('loading', loading);
        
        if (loading) {
            this.setAttribute('aria-busy', 'true');
            this.emit('loading-start');
        } else {
            this.element.removeAttribute('aria-busy');
            this.emit('loading-end');
        }
        return this;
    }
    
    /**
     * Get component state
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * Update component options
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        this.emit('options-updated', { options: this.options });
        return this;
    }
    
    /**
     * Animate component
     */
    animate(animationName, options = {}) {
        if (!this.element || !this.options.animations) return this;
        
        const className = `animate-${animationName}`;
        const duration = options.duration || 300;
        
        return new Promise((resolve) => {
            const handleAnimationEnd = () => {
                this.removeClass(className);
                this.element.removeEventListener('animationend', handleAnimationEnd);
                resolve(this);
            };
            
            this.element.addEventListener('animationend', handleAnimationEnd);
            this.addClass(className);
            
            // Fallback timeout
            setTimeout(() => {
                handleAnimationEnd();
            }, duration + 100);
        });
    }
    
    /**
     * Error handling
     */
    handleError(error, context = 'unknown') {
        const errorData = {
            error,
            context,
            component: this.constructor.name,
            element: this.element
        };
        
        this.log('Component error:', errorData);
        this.emit('error', errorData);
        
        // Show user-friendly message if needed
        if (this.options.showErrors) {
            this.showErrorMessage('Something went wrong. Please try again.');
        }
    }
    
    /**
     * Show error message to user
     */
    showErrorMessage(message) {
        // This would typically use the toast system
        if (window.MivtonComponents && window.MivtonComponents.Toast) {
            window.MivtonComponents.Toast.error(message);
        } else {
            console.error('Toast system not available:', message);
        }
    }
    
    /**
     * Debug logging
     */
    log(...args) {
        if (this.options.debug) {
            console.log(`[${this.constructor.name}]`, ...args);
        }
    }
    
    /**
     * Clean up component
     */
    destroy() {
        try {
            // Remove all event listeners
            this.handlers.forEach((handlers, event) => {
                handlers.forEach(({ handler }) => {
                    this.element.removeEventListener(event, handler);
                });
            });
            this.handlers.clear();
            
            // Remove component classes
            this.removeClass(this.options.className);
            this.removeClass('loading');
            this.removeClass('disabled');
            
            // Call custom cleanup
            this.onDestroy();
            
            // Emit destroy event
            this.emit('destroy');
            
            // Clear references
            this.element = null;
            this.options = null;
            this.state = null;
            
            this.log('Component destroyed successfully');
            
        } catch (error) {
            console.error('Error destroying component:', error);
        }
    }
    
    /**
     * Custom destroy hook - override in subclasses
     */
    onDestroy() {
        // Override in subclasses
    }
    
    /**
     * Static method to create component from data attributes
     */
    static fromElement(element, options = {}) {
        if (!element) return null;
        
        // Get options from data attributes
        const dataOptions = {};
        Array.from(element.attributes).forEach(attr => {
            if (attr.name.startsWith('data-mivton-')) {
                const key = attr.name.replace('data-mivton-', '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                let value = attr.value;
                
                // Try to parse as JSON for complex values
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    // Keep as string if not valid JSON
                }
                
                dataOptions[key] = value;
            }
        });
        
        const finalOptions = { ...dataOptions, ...options };
        return new this(element, finalOptions);
    }
}

/**
 * Global namespace setup - Following Phase 2.1 pattern
 */
if (typeof window !== 'undefined') {
    // Initialize global namespace if it doesn't exist
    if (!window.MivtonComponents) {
        window.MivtonComponents = {};
    }
    
    // Register base component
    window.MivtonComponents.BaseComponent = MivtonBaseComponent;
    
    // Utility function for creating components
    window.MivtonComponents.create = function(ComponentClass, selector, options = {}) {
        const elements = typeof selector === 'string' ? 
            document.querySelectorAll(selector) : 
            [selector];
        
        const instances = [];
        elements.forEach(element => {
            if (element) {
                const instance = new ComponentClass(element, options);
                if (instance) {
                    instances.push(instance);
                }
            }
        });
        
        return instances.length === 1 ? instances[0] : instances;
    };
    
    // Auto-initialization system
    window.MivtonComponents.autoInit = function() {
        const components = document.querySelectorAll('[data-mivton-component]');
        components.forEach(element => {
            const componentName = element.getAttribute('data-mivton-component');
            const ComponentClass = window.MivtonComponents[componentName];
            
            if (ComponentClass && typeof ComponentClass === 'function') {
                ComponentClass.fromElement(element);
            }
        });
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                if (typeof window.MivtonComponents.autoInit === 'function') {
                    window.MivtonComponents.autoInit();
                }
            }, 100);
        });
    } else {
        // DOM already ready
        setTimeout(() => {
            if (typeof window.MivtonComponents.autoInit === 'function') {
                window.MivtonComponents.autoInit();
            }
        }, 100);
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MivtonBaseComponent;
}
