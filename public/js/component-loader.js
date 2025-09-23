/**
 * ==============================================
 * MIVTON - COMPONENT LOADER SYSTEM
 * Phase 2.2 - Modern UI Components
 * Component initialization and management system
 * ==============================================
 */

/**
 * Component Loader Class
 * Handles component registration, initialization, and lifecycle management
 * Following Phase 2.1 lessons: Global namespace management and defensive programming
 */
class MivtonComponentLoader {
    constructor() {
        this.components = new Map();
        this.instances = new WeakMap();
        this.autoInitialized = new Set();
        this.observers = new Map();
        this.isInitialized = false;
        
        // Bind methods to maintain context
        this.handleDOMContentLoaded = this.handleDOMContentLoaded.bind(this);
        this.handleMutation = this.handleMutation.bind(this);
        
        this.init();
    }
    
    /**
     * Initialize the component loader
     */
    init() {
        if (this.isInitialized) return;
        
        // Setup DOM ready handler
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.handleDOMContentLoaded);
        } else {
            // DOM already ready
            setTimeout(this.handleDOMContentLoaded, 0);
        }
        
        // Setup mutation observer for dynamic content
        this.setupMutationObserver();
        
        this.isInitialized = true;
    }
    
    /**
     * Handle DOM content loaded
     */
    handleDOMContentLoaded() {
        try {
            // Auto-initialize components
            this.autoInitializeComponents();
            
            // Setup scroll animations
            this.setupScrollAnimations();
            
            // Initialize intersection observers
            this.setupIntersectionObservers();
            
            console.log('[MivtonComponentLoader] Components auto-initialized successfully');
            
        } catch (error) {
            console.error('[MivtonComponentLoader] Error during initialization:', error);
        }
    }
    
    /**
     * Register a component class
     */
    register(name, ComponentClass, options = {}) {
        if (!name || !ComponentClass) {
            console.error('[MivtonComponentLoader] Invalid component registration:', { name, ComponentClass });
            return false;
        }
        
        const componentInfo = {
            name,
            ComponentClass,
            selector: options.selector || `[data-mivton-component="${name}"]`,
            autoInit: options.autoInit !== false,
            singleton: options.singleton || false,
            dependencies: options.dependencies || [],
            ...options
        };
        
        this.components.set(name, componentInfo);
        
        // Auto-initialize if DOM is ready and component supports it
        if (document.readyState !== 'loading' && componentInfo.autoInit) {
            this.initializeComponent(name);
        }
        
        return true;
    }
    
    /**
     * Get registered component info
     */
    getComponent(name) {
        return this.components.get(name);
    }
    
    /**
     * Initialize a specific component
     */
    initializeComponent(name, container = document) {
        const componentInfo = this.components.get(name);
        if (!componentInfo) {
            console.warn(`[MivtonComponentLoader] Component '${name}' not registered`);
            return [];
        }
        
        try {
            // Check dependencies
            if (!this.checkDependencies(componentInfo.dependencies)) {
                console.warn(`[MivtonComponentLoader] Dependencies not met for component '${name}'`);
                return [];
            }
            
            const elements = container.querySelectorAll(componentInfo.selector);
            const instances = [];
            
            elements.forEach(element => {
                // Skip if already initialized
                if (this.instances.has(element)) {
                    instances.push(this.instances.get(element));
                    return;
                }
                
                // Handle singleton pattern
                if (componentInfo.singleton) {
                    const existingInstance = this.findExistingInstance(name);
                    if (existingInstance) {
                        console.warn(`[MivtonComponentLoader] Singleton component '${name}' already exists`);
                        instances.push(existingInstance);
                        return;
                    }
                }
                
                // Create component instance
                const instance = this.createComponentInstance(componentInfo, element);
                if (instance) {
                    this.instances.set(element, instance);
                    instances.push(instance);
                    
                    // Store reference on element
                    element[`_mivton${name}`] = instance;
                    
                    this.log(`Component '${name}' initialized on element`, element);
                }
            });
            
            return instances;
            
        } catch (error) {
            console.error(`[MivtonComponentLoader] Error initializing component '${name}':`, error);
            return [];
        }
    }
    
    /**
     * Create component instance with error handling
     */
    createComponentInstance(componentInfo, element) {
        try {
            // Extract options from data attributes
            const options = this.extractDataOptions(element, componentInfo.name);
            
            // Create instance using factory method or constructor
            let instance;
            if (componentInfo.ComponentClass.fromElement) {
                instance = componentInfo.ComponentClass.fromElement(element, options);
            } else {
                instance = new componentInfo.ComponentClass(element, options);
            }
            
            return instance;
            
        } catch (error) {
            console.error(`[MivtonComponentLoader] Error creating instance of '${componentInfo.name}':`, error);
            return null;
        }
    }
    
    /**
     * Extract options from data attributes
     */
    extractDataOptions(element, componentName) {
        const options = {};
        const prefix = `data-mivton-${componentName.toLowerCase()}-`;
        
        Array.from(element.attributes).forEach(attr => {
            if (attr.name.startsWith(prefix)) {
                const key = attr.name.replace(prefix, '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                let value = attr.value;
                
                // Try to parse as JSON for complex values
                try {
                    if (value === 'true') value = true;
                    else if (value === 'false') value = false;
                    else if (value === 'null') value = null;
                    else if (!isNaN(value) && value !== '') value = Number(value);
                    else if (value.startsWith('{') || value.startsWith('[')) {
                        value = JSON.parse(value);
                    }
                } catch (e) {
                    // Keep as string if parsing fails
                }
                
                options[key] = value;
            }
        });
        
        return options;
    }
    
    /**
     * Check if dependencies are met
     */
    checkDependencies(dependencies) {
        if (!dependencies || dependencies.length === 0) return true;
        
        return dependencies.every(dep => {
            if (typeof dep === 'string') {
                // Check if component is registered
                return this.components.has(dep);
            } else if (typeof dep === 'object') {
                // Check custom dependency
                if (dep.global) {
                    return typeof window[dep.global] !== 'undefined';
                }
                if (dep.selector) {
                    return document.querySelector(dep.selector) !== null;
                }
            }
            return false;
        });
    }
    
    /**
     * Find existing singleton instance
     */
    findExistingInstance(componentName) {
        const componentInfo = this.components.get(componentName);
        if (!componentInfo) return null;
        
        const elements = document.querySelectorAll(componentInfo.selector);
        for (const element of elements) {
            const instance = this.instances.get(element);
            if (instance) return instance;
        }
        return null;
    }
    
    /**
     * Auto-initialize all registered components
     */
    autoInitializeComponents() {
        this.components.forEach((componentInfo, name) => {
            if (componentInfo.autoInit) {
                this.initializeComponent(name);
            }
        });
    }
    
    /**
     * Setup mutation observer for dynamic content
     */
    setupMutationObserver() {
        if (!window.MutationObserver) return;
        
        this.mutationObserver = new MutationObserver(this.handleMutation);
        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    /**
     * Handle DOM mutations
     */
    handleMutation(mutations) {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.initializeInElement(node);
                    }
                });
            }
        });
    }
    
    /**
     * Initialize components within a specific element
     */
    initializeInElement(container) {
        this.components.forEach((componentInfo, name) => {
            if (componentInfo.autoInit) {
                // Check if container itself matches
                if (container.matches && container.matches(componentInfo.selector)) {
                    this.initializeComponent(name, container.parentElement || document);
                }
                // Check children
                if (container.querySelector) {
                    this.initializeComponent(name, container);
                }
            }
        });
    }
    
    /**
     * Setup scroll animations
     */
    setupScrollAnimations() {
        if (!window.MivtonComponents?.AnimationManager) return;
        
        const animationManager = window.MivtonComponents.AnimationManager;
        const scrollElements = document.querySelectorAll('[data-scroll-animation]');
        
        scrollElements.forEach(element => {
            const animationName = element.dataset.scrollAnimation;
            const options = {
                threshold: parseFloat(element.dataset.scrollThreshold) || 0.1,
                once: element.dataset.scrollOnce !== 'false'
            };
            
            animationManager.onScroll(element, animationName, options);
        });
    }
    
    /**
     * Setup intersection observers for lazy loading
     */
    setupIntersectionObservers() {
        if (!window.IntersectionObserver) return;
        
        // Lazy load images
        const lazyImages = document.querySelectorAll('img[data-src]');
        if (lazyImages.length > 0) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            lazyImages.forEach(img => imageObserver.observe(img));
            this.observers.set('lazyImages', imageObserver);
        }
        
        // Lazy load components
        const lazyComponents = document.querySelectorAll('[data-lazy-component]');
        if (lazyComponents.length > 0) {
            const componentObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const element = entry.target;
                        const componentName = element.dataset.lazyComponent;
                        
                        if (this.components.has(componentName)) {
                            this.initializeComponent(componentName, element.parentElement);
                            element.removeAttribute('data-lazy-component');
                            componentObserver.unobserve(element);
                        }
                    }
                });
            });
            
            lazyComponents.forEach(element => componentObserver.observe(element));
            this.observers.set('lazyComponents', componentObserver);
        }
    }
    
    /**
     * Debug logging
     */
    log(...args) {
        if (window.MivtonComponents?.debug) {
            console.log(`[MivtonComponentLoader]`, ...args);
        }
    }
    
    /**
     * Cleanup and destroy loader
     */
    destroy() {
        // Disconnect observers
        this.observers.forEach(observer => {
            observer.disconnect();
        });
        
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
        
        // Clear maps and sets
        this.components.clear();
        this.instances = new WeakMap();
        this.autoInitialized.clear();
        this.observers.clear();
        
        // Remove event listeners
        document.removeEventListener('DOMContentLoaded', this.handleDOMContentLoaded);
        
        this.isInitialized = false;
    }
}

/**
 * Register globally and create singleton instance
 */
if (typeof window !== 'undefined') {
    window.MivtonComponents = window.MivtonComponents || {};
    
    // Create singleton instance
    window.MivtonComponents.Loader = new MivtonComponentLoader();
    
    // Register built-in components when they become available
    const registerBuiltInComponents = () => {
        const builtInComponents = {
            Button: window.MivtonComponents.Button,
            Card: window.MivtonComponents.Card,
            Modal: window.MivtonComponents.Modal,
            Toast: window.MivtonComponents.Toast
        };
        
        Object.entries(builtInComponents).forEach(([name, ComponentClass]) => {
            if (ComponentClass) {
                window.MivtonComponents.Loader.register(name, ComponentClass, {
                    autoInit: true
                });
            }
        });
    };
    
    // Register components when available
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', registerBuiltInComponents);
    } else {
        setTimeout(registerBuiltInComponents, 0);
    }
    
    // Add convenient global methods
    window.MivtonComponents.register = (name, ComponentClass, options) => {
        return window.MivtonComponents.Loader.register(name, ComponentClass, options);
    };
    
    window.MivtonComponents.create = (componentName, container, options) => {
        return window.MivtonComponents.Loader.create(componentName, container, options);
    };
    
    window.MivtonComponents.getInstance = (element, componentName) => {
        return window.MivtonComponents.Loader.getInstance(element, componentName);
    };
    
    window.MivtonComponents.stats = () => {
        return window.MivtonComponents.Loader.getStats();
    };
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MivtonComponentLoader;
}
