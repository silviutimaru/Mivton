/**
 * 🚀 MIVTON BASE COMPONENT
 * Base class for all Mivton UI components
 * Provides common functionality and state management
 */

class MivtonBaseComponent {
    constructor(element, options = {}) {
        if (!element) {
            throw new Error('MivtonBaseComponent requires a DOM element');
        }

        this.element = element;
        this.options = {
            debug: false,
            autoUpdate: true,
            ...options
        };

        this.state = {};
        this.events = new Map();
        this.initialized = false;
        
        // Mark element as having a component
        this.element.mivtonComponent = this;
        
        if (this.options.debug) {
            console.log(`🔧 ${this.constructor.name} created for element:`, element);
        }
    }

    /**
     * Set component state and optionally trigger re-render
     * @param {Object} newState - State updates
     * @param {boolean} shouldRender - Whether to trigger render after state change
     */
    setState(newState, shouldRender = true) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };
        
        if (this.options.debug) {
            console.log(`📊 ${this.constructor.name} state updated:`, {
                old: oldState,
                new: this.state,
                changes: newState
            });
        }

        // Trigger state change event
        this.emit('stateChange', {
            oldState,
            newState: this.state,
            changes: newState
        });

        // Auto-render if enabled
        if (shouldRender && this.options.autoUpdate && this.render) {
            this.render();
        }

        return this;
    }

    /**
     * Get current state or specific state property
     * @param {string} key - Optional key to get specific state property
     * @returns {*} State object or specific property
     */
    getState(key = null) {
        return key ? this.state[key] : this.state;
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @returns {MivtonBaseComponent} this for chaining
     */
    on(event, handler) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(handler);
        return this;
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} handler - Specific handler to remove (optional)
     * @returns {MivtonBaseComponent} this for chaining
     */
    off(event, handler = null) {
        if (!this.events.has(event)) return this;

        if (handler) {
            const handlers = this.events.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        } else {
            this.events.set(event, []);
        }
        return this;
    }

    /**
     * Emit event to all listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     * @returns {MivtonBaseComponent} this for chaining
     */
    emit(event, data = null) {
        if (!this.events.has(event)) return this;

        const handlers = this.events.get(event);
        handlers.forEach(handler => {
            try {
                handler.call(this, data);
            } catch (error) {
                console.error(`❌ Error in ${this.constructor.name} event handler for '${event}':`, error);
            }
        });
        return this;
    }

    /**
     * Show loading state
     * @param {string} message - Loading message
     */
    showLoading(message = 'Loading...') {
        this.setState({ loading: true, loadingMessage: message });
        this.emit('loadingStart', { message });
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.setState({ loading: false, loadingMessage: null });
        this.emit('loadingEnd');
    }

    /**
     * Show error state
     * @param {string} message - Error message
     * @param {Error} error - Original error object
     */
    showError(message, error = null) {
        this.setState({ 
            error: message,
            hasError: true,
            loading: false 
        });
        
        this.emit('error', { message, error });
        
        if (this.options.debug && error) {
            console.error(`❌ ${this.constructor.name} error:`, error);
        }
    }

    /**
     * Clear error state
     */
    clearError() {
        this.setState({ 
            error: null,
            hasError: false 
        });
        this.emit('errorCleared');
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Create DOM element with attributes
     * @param {string} tag - HTML tag name
     * @param {Object} attributes - Element attributes
     * @param {string} content - Element content
     * @returns {HTMLElement} Created element
     */
    createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key.startsWith('data-')) {
                element.setAttribute(key, value);
            } else {
                element[key] = value;
            }
        });
        
        if (content) {
            element.innerHTML = content;
        }
        
        return element;
    }

    /**
     * Find elements within component scope
     * @param {string} selector - CSS selector
     * @returns {NodeList} Found elements
     */
    findAll(selector) {
        return this.element.querySelectorAll(selector);
    }

    /**
     * Find single element within component scope
     * @param {string} selector - CSS selector
     * @returns {Element|null} Found element
     */
    find(selector) {
        return this.element.querySelector(selector);
    }

    /**
     * Add CSS class to component element
     * @param {string} className - Class name to add
     * @returns {MivtonBaseComponent} this for chaining
     */
    addClass(className) {
        this.element.classList.add(className);
        return this;
    }

    /**
     * Remove CSS class from component element
     * @param {string} className - Class name to remove
     * @returns {MivtonBaseComponent} this for chaining
     */
    removeClass(className) {
        this.element.classList.remove(className);
        return this;
    }

    /**
     * Toggle CSS class on component element
     * @param {string} className - Class name to toggle
     * @returns {MivtonBaseComponent} this for chaining
     */
    toggleClass(className) {
        this.element.classList.toggle(className);
        return this;
    }

    /**
     * Check if component element has CSS class
     * @param {string} className - Class name to check
     * @returns {boolean} Whether element has class
     */
    hasClass(className) {
        return this.element.classList.contains(className);
    }

    /**
     * Make API request with error handling
     * @param {string} url - API endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise} API response
     */
    async apiRequest(url, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            this.showLoading('Making request...');
            
            const response = await fetch(url, defaultOptions);
            
            // Check if response is ok
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            this.hideLoading();
            
            return data;
            
        } catch (error) {
            this.hideLoading();
            this.showError('Request failed', error);
            throw error;
        }
    }

    /**
     * Debounced function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * Throttled function execution
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
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
     * Clean up component resources
     */
    destroy() {
        // Clear all event listeners
        this.events.clear();
        
        // Remove component reference from element
        if (this.element.mivtonComponent === this) {
            delete this.element.mivtonComponent;
        }
        
        // Emit destroy event
        this.emit('destroy');
        
        if (this.options.debug) {
            console.log(`🗑️ ${this.constructor.name} destroyed`);
        }
    }

    /**
     * Get component info for debugging
     * @returns {Object} Component info
     */
    getInfo() {
        return {
            name: this.constructor.name,
            element: this.element,
            state: this.state,
            options: this.options,
            events: Array.from(this.events.keys()),
            initialized: this.initialized
        };
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.MivtonBaseComponent = MivtonBaseComponent;
}

// Also expose in MivtonComponents namespace
if (typeof window !== 'undefined') {
    window.MivtonComponents = window.MivtonComponents || {};
    window.MivtonComponents.BaseComponent = MivtonBaseComponent;
}

console.log('✅ MivtonBaseComponent loaded successfully');
