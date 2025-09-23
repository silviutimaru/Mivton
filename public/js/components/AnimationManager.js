/**
 * ==============================================
 * MIVTON - ANIMATION MANAGER
 * Phase 2.2 - Modern UI Components
 * Animation utilities and management system
 * ==============================================
 */

/**
 * Animation Manager Class
 * Handles complex animations, sequencing, and performance optimization
 */
class MivtonAnimationManager {
    constructor() {
        this.activeAnimations = new Map();
        this.observers = new Map();
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.setupIntersectionObserver();
        this.setupReducedMotionListener();
    }
    
    /**
     * Setup reduced motion preference listener
     */
    setupReducedMotionListener() {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        mediaQuery.addEventListener('change', (e) => {
            this.prefersReducedMotion = e.matches;
            if (e.matches) {
                this.pauseAllAnimations();
            }
        });
    }
    
    /**
     * Setup intersection observer for scroll-triggered animations
     */
    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.scrollObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const element = entry.target;
                    const animationName = element.dataset.scrollAnimation;
                    
                    if (entry.isIntersecting && animationName) {
                        this.animate(element, animationName);
                        // Stop observing after animation
                        this.scrollObserver.unobserve(element);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '50px'
            });
        }
    }
    
    /**
     * Animate element with specified animation
     */
    animate(element, animationName, options = {}) {
        if (this.prefersReducedMotion && !options.force) {
            return Promise.resolve();
        }
        
        const defaultOptions = {
            duration: 300,
            easing: 'ease-smooth',
            delay: 0,
            fill: 'forwards',
            cleanup: true,
            ...options
        };
        
        return new Promise((resolve) => {
            // Clean up any existing animation
            this.stopAnimation(element);
            
            // Apply animation class
            const animationClass = `animate-${animationName}`;
            element.classList.add(animationClass);
            
            // Apply custom properties if provided
            if (defaultOptions.duration !== 300) {
                element.style.animationDuration = `${defaultOptions.duration}ms`;
            }
            
            if (defaultOptions.delay > 0) {
                element.style.animationDelay = `${defaultOptions.delay}ms`;
            }
            
            // Create animation tracking object
            const animationData = {
                element,
                animationClass,
                startTime: Date.now(),
                duration: defaultOptions.duration,
                resolve
            };
            
            // Store animation
            this.activeAnimations.set(element, animationData);
            
            // Setup completion handler
            const handleComplete = () => {
                if (defaultOptions.cleanup) {
                    element.classList.remove(animationClass);
                    element.style.animationDuration = '';
                    element.style.animationDelay = '';
                }
                
                this.activeAnimations.delete(element);
                element.removeEventListener('animationend', handleComplete);
                element.removeEventListener('animationcancel', handleComplete);
                resolve();
            };
            
            element.addEventListener('animationend', handleComplete);
            element.addEventListener('animationcancel', handleComplete);
            
            // Fallback timeout
            setTimeout(handleComplete, defaultOptions.duration + defaultOptions.delay + 100);
        });
    }
    
    /**
     * Stop animation on element
     */
    stopAnimation(element) {
        const animationData = this.activeAnimations.get(element);
        if (animationData) {
            element.classList.remove(animationData.animationClass);
            element.style.animationDuration = '';
            element.style.animationDelay = '';
            this.activeAnimations.delete(element);
            
            if (animationData.resolve) {
                animationData.resolve();
            }
        }
    }
    
    /**
     * Pause all active animations
     */
    pauseAllAnimations() {
        this.activeAnimations.forEach((animationData) => {
            animationData.element.style.animationPlayState = 'paused';
        });
    }
    
    /**
     * Resume all paused animations
     */
    resumeAllAnimations() {
        this.activeAnimations.forEach((animationData) => {
            animationData.element.style.animationPlayState = 'running';
        });
    }
    
    /**
     * Animate sequence of elements
     */
    animateSequence(elements, animationName, options = {}) {
        const defaultOptions = {
            stagger: 100,
            ...options
        };
        
        const promises = [];
        
        elements.forEach((element, index) => {
            const delay = index * defaultOptions.stagger;
            const promise = this.animate(element, animationName, {
                ...defaultOptions,
                delay: delay + (defaultOptions.delay || 0)
            });
            promises.push(promise);
        });
        
        return Promise.all(promises);
    }
    
    /**
     * Stagger animation with custom timing
     */
    staggerAnimation(selector, animationName, options = {}) {
        const elements = typeof selector === 'string' ? 
            document.querySelectorAll(selector) : 
            Array.from(selector);
            
        return this.animateSequence(elements, animationName, options);
    }
    
    /**
     * Add scroll-triggered animation
     */
    onScroll(element, animationName, options = {}) {
        if (!this.scrollObserver) return;
        
        element.dataset.scrollAnimation = animationName;
        
        if (options.once !== false) {
            // Default behavior: animate once
            this.scrollObserver.observe(element);
        } else {
            // Custom observer for repeating animations
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
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
     * Get component instance from element
     */
    getInstance(element, componentName = null) {
        if (componentName) {
            return element[`_mivton${componentName}`] || null;
        }
        return this.instances.get(element) || null;
    }
    
    /**
     * Get all instances of a component
     */
    getAllInstances(componentName) {
        const componentInfo = this.components.get(componentName);
        if (!componentInfo) return [];
        
        const elements = document.querySelectorAll(componentInfo.selector);
        const instances = [];
        
        elements.forEach(element => {
            const instance = this.instances.get(element);
            if (instance) {
                instances.push(instance);
            }
        });
        
        return instances;
    }
    
    /**
     * Destroy component instance
     */
    destroyInstance(element) {
        const instance = this.instances.get(element);
        if (instance && typeof instance.destroy === 'function') {
            try {
                instance.destroy();
                this.instances.delete(element);
                
                // Remove element references
                Object.keys(element).forEach(key => {
                    if (key.startsWith('_mivton')) {
                        delete element[key];
                    }
                });
                
                return true;
            } catch (error) {
                console.error('[MivtonComponentLoader] Error destroying instance:', error);
            }
        }
        return false;
    }
    
    /**
     * Destroy all instances of a component
     */
    destroyAllInstances(componentName) {
        const instances = this.getAllInstances(componentName);
        let destroyedCount = 0;
        
        instances.forEach(instance => {
            if (instance.element && this.destroyInstance(instance.element)) {
                destroyedCount++;
            }
        });
        
        return destroyedCount;
    }
    
    /**
     * Reinitialize components in container
     */
    reinitialize(container = document) {
        // First destroy existing instances in container
        const elements = container.querySelectorAll('[class*="mivton-"]');
        elements.forEach(element => {
            this.destroyInstance(element);
        });
        
        // Then reinitialize
        this.components.forEach((componentInfo, name) => {
            if (componentInfo.autoInit) {
                this.initializeComponent(name, container);
            }
        });
    }
    
    /**
     * Create component programmatically
     */
    create(componentName, container, options = {}) {
        const componentInfo = this.components.get(componentName);
        if (!componentInfo) {
            console.error(`[MivtonComponentLoader] Component '${componentName}' not registered`);
            return null;
        }
        
        try {
            // Create element if needed
            let element;
            if (typeof container === 'string') {
                element = document.querySelector(container);
                if (!element) {
                    console.error(`[MivtonComponentLoader] Container '${container}' not found`);
                    return null;
                }
            } else if (container instanceof HTMLElement) {
                element = container;
            } else {
                console.error('[MivtonComponentLoader] Invalid container provided');
                return null;
            }
            
            // Add component attribute
            element.setAttribute('data-mivton-component', componentName);
            
            // Set options as data attributes
            Object.keys(options).forEach(key => {
                const attrName = `data-mivton-${componentName.toLowerCase()}-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
                const value = typeof options[key] === 'object' ? JSON.stringify(options[key]) : options[key];
                element.setAttribute(attrName, value);
            });
            
            // Initialize component
            const instances = this.initializeComponent(componentName, element.parentElement || document);
            return instances.length > 0 ? instances[0] : null;
            
        } catch (error) {
            console.error(`[MivtonComponentLoader] Error creating component '${componentName}':`, error);
            return null;
        }
    }
    
    /**
     * Load component dynamically
     */
    async loadComponent(name, url, options = {}) {
        try {
            // Load component script
            const script = document.createElement('script');
            script.src = url;
            
            return new Promise((resolve, reject) => {
                script.onload = () => {
                    // Component should register itself
                    const componentInfo = this.components.get(name);
                    if (componentInfo) {
                        resolve(componentInfo);
                    } else {
                        reject(new Error(`Component '${name}' did not register itself`));
                    }
                };
                
                script.onerror = () => {
                    reject(new Error(`Failed to load component from '${url}'`));
                };
                
                document.head.appendChild(script);
            });
            
        } catch (error) {
            console.error(`[MivtonComponentLoader] Error loading component '${name}':`, error);
            throw error;
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
     * Get loader statistics
     */
    getStats() {
        const stats = {
            registeredComponents: this.components.size,
            activeInstances: 0,
            componentStats: {}
        };
        
        this.components.forEach((componentInfo, name) => {
            const instances = this.getAllInstances(name);
            stats.componentStats[name] = {
                selector: componentInfo.selector,
                instances: instances.length,
                autoInit: componentInfo.autoInit,
                singleton: componentInfo.singleton
            };
            stats.activeInstances += instances.length;
        });
        
        return stats;
    }
    
    /**
     * Cleanup and destroy loader
     */
    destroy() {
        // Destroy all component instances
        this.components.forEach((componentInfo, name) => {
            this.destroyAllInstances(name);
        });
        
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
    
    // Register built-in components if available
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
                        this.animate(element, animationName, options);
                    }
                });
            }, {
                threshold: options.threshold || 0.1,
                rootMargin: options.rootMargin || '50px'
            });
            
            observer.observe(element);
            this.observers.set(element, observer);
        }
    }
    
    /**
     * Remove scroll animation observer
     */
    removeScrollAnimation(element) {
        if (this.scrollObserver) {
            this.scrollObserver.unobserve(element);
        }
        
        const observer = this.observers.get(element);
        if (observer) {
            observer.disconnect();
            this.observers.delete(element);
        }
        
        delete element.dataset.scrollAnimation;
    }
    
    /**
     * Create a morphing animation between two elements
     */
    morph(fromElement, toElement, options = {}) {
        if (this.prefersReducedMotion) return Promise.resolve();
        
        const defaultOptions = {
            duration: 500,
            easing: 'ease-smooth',
            ...options
        };
        
        return new Promise((resolve) => {
            // Get element positions
            const fromRect = fromElement.getBoundingClientRect();
            const toRect = toElement.getBoundingClientRect();
            
            // Create morphing element
            const morphElement = fromElement.cloneNode(true);
            morphElement.style.position = 'fixed';
            morphElement.style.top = `${fromRect.top}px`;
            morphElement.style.left = `${fromRect.left}px`;
            morphElement.style.width = `${fromRect.width}px`;
            morphElement.style.height = `${fromRect.height}px`;
            morphElement.style.zIndex = '9999';
            morphElement.style.pointerEvents = 'none';
            morphElement.style.transition = `all ${defaultOptions.duration}ms var(--ease-${defaultOptions.easing})`;
            
            document.body.appendChild(morphElement);
            
            // Hide original elements
            fromElement.style.opacity = '0';
            toElement.style.opacity = '0';
            
            // Trigger animation
            requestAnimationFrame(() => {
                morphElement.style.top = `${toRect.top}px`;
                morphElement.style.left = `${toRect.left}px`;
                morphElement.style.width = `${toRect.width}px`;
                morphElement.style.height = `${toRect.height}px`;
            });
            
            // Clean up after animation
            setTimeout(() => {
                document.body.removeChild(morphElement);
                fromElement.style.opacity = '';
                toElement.style.opacity = '';
                resolve();
            }, defaultOptions.duration);
        });
    }
    
    /**
     * Create particle effect
     */
    createParticles(element, options = {}) {
        if (this.prefersReducedMotion) return;
        
        const defaultOptions = {
            count: 20,
            colors: ['#6366f1', '#8b5cf6', '#06b6d4'],
            size: 4,
            spread: 100,
            duration: 1000,
            ...options
        };
        
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        for (let i = 0; i < defaultOptions.count; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'fixed';
            particle.style.left = `${centerX}px`;
            particle.style.top = `${centerY}px`;
            particle.style.width = `${defaultOptions.size}px`;
            particle.style.height = `${defaultOptions.size}px`;
            particle.style.backgroundColor = defaultOptions.colors[Math.floor(Math.random() * defaultOptions.colors.length)];
            particle.style.borderRadius = '50%';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '9999';
            
            const angle = (Math.PI * 2 * i) / defaultOptions.count;
            const distance = Math.random() * defaultOptions.spread;
            const endX = centerX + Math.cos(angle) * distance;
            const endY = centerY + Math.sin(angle) * distance;
            
            particle.style.transition = `all ${defaultOptions.duration}ms ease-out`;
            
            document.body.appendChild(particle);
            
            requestAnimationFrame(() => {
                particle.style.left = `${endX}px`;
                particle.style.top = `${endY}px`;
                particle.style.opacity = '0';
                particle.style.transform = 'scale(0)';
            });
            
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, defaultOptions.duration);
        }
    }
    
    /**
     * Get element's current animation state
     */
    getAnimationState(element) {
        return this.activeAnimations.get(element) || null;
    }
    
    /**
     * Check if element is currently animating
     */
    isAnimating(element) {
        return this.activeAnimations.has(element);
    }
    
    /**
     * Cleanup all animations and observers
     */
    destroy() {
        // Stop all active animations
        this.activeAnimations.forEach((animationData) => {
            this.stopAnimation(animationData.element);
        });
        
        // Disconnect all observers
        if (this.scrollObserver) {
            this.scrollObserver.disconnect();
        }
        
        this.observers.forEach(observer => {
            observer.disconnect();
        });
        
        // Clear maps
        this.activeAnimations.clear();
        this.observers.clear();
    }
}

/**
 * Register globally and create singleton instance
 */
if (typeof window !== 'undefined') {
    window.MivtonComponents = window.MivtonComponents || {};
    
    // Create singleton instance
    window.MivtonComponents.AnimationManager = new MivtonAnimationManager();
    
    // Add convenient global methods
    window.animate = {
        element: (element, animation, options) => window.MivtonComponents.AnimationManager.animate(element, animation, options),
        sequence: (elements, animation, options) => window.MivtonComponents.AnimationManager.animateSequence(elements, animation, options),
        stagger: (selector, animation, options) => window.MivtonComponents.AnimationManager.staggerAnimation(selector, animation, options),
        onScroll: (element, animation, options) => window.MivtonComponents.AnimationManager.onScroll(element, animation, options),
        morph: (from, to, options) => window.MivtonComponents.AnimationManager.morph(from, to, options),
        particles: (element, options) => window.MivtonComponents.AnimationManager.createParticles(element, options)
    };
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MivtonAnimationManager;
}
