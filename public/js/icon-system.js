/**
 * ==============================================
 * MIVTON - ICON SYSTEM
 * Phase 2.2 - Modern UI Components
 * Font Awesome 6 integration and icon management
 * ==============================================
 */

/**
 * Icon System Class
 * Manages icon loading, caching, and utilities
 */
class MivtonIconSystem {
    constructor() {
        this.loadedIcons = new Set();
        this.iconCache = new Map();
        this.observers = [];
        this.config = {
            version: '6.4.0',
            cdnUrl: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome',
            styles: ['solid', 'regular', 'brands'],
            loadStrategy: 'lazy', // 'eager', 'lazy', 'manual'
            ...this.getConfigFromData()
        };
        
        this.init();
    }
    
    /**
     * Get configuration from data attributes
     */
    getConfigFromData() {
        const configElement = document.querySelector('[data-mivton-icons-config]');
        if (!configElement) return {};
        
        try {
            return JSON.parse(configElement.dataset.mivtonIconsConfig);
        } catch (error) {
            console.warn('[MivtonIconSystem] Invalid icon config:', error);
            return {};
        }
    }
    
    /**
     * Initialize icon system
     */
    init() {
        // Load CSS based on strategy
        if (this.config.loadStrategy === 'eager') {
            this.loadAllStyles();
        } else if (this.config.loadStrategy === 'lazy') {
            this.setupLazyLoading();
        }
        
        // Setup icon replacement system
        this.setupIconReplacement();
        
        // Initialize existing icons
        this.processExistingIcons();
    }
    
    /**
     * Load all Font Awesome styles
     */
    loadAllStyles() {
        this.config.styles.forEach(style => {
            this.loadStyle(style);
        });
    }
    
    /**
     * Load specific Font Awesome style
     */
    loadStyle(style) {
        if (this.loadedIcons.has(style)) return Promise.resolve();
        
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `${this.config.cdnUrl}/${this.config.version}/css/${style}.min.css`;
            
            link.onload = () => {
                this.loadedIcons.add(style);
                console.log(`[MivtonIconSystem] Loaded ${style} icons`);\n                resolve();\n            };\n            \n            link.onerror = () => {\n                console.error(`[MivtonIconSystem] Failed to load ${style} icons`);\n                reject(new Error(`Failed to load ${style} icons`));\n            };\n            \n            document.head.appendChild(link);\n        });\n    }\n    \n    /**\n     * Setup lazy loading for icons\n     */\n    setupLazyLoading() {\n        if (!window.IntersectionObserver) {\n            // Fallback: load all styles if no IntersectionObserver\n            this.loadAllStyles();\n            return;\n        }\n        \n        // Observer for icon elements\n        const iconObserver = new IntersectionObserver((entries) => {\n            entries.forEach(entry => {\n                if (entry.isIntersecting) {\n                    const icon = entry.target;\n                    this.processIcon(icon);\n                    iconObserver.unobserve(icon);\n                }\n            });\n        }, {\n            rootMargin: '50px'\n        });\n        \n        this.observers.push(iconObserver);\n        \n        // Observe existing icons\n        this.observeIcons(iconObserver);\n        \n        // Observe new icons via mutation observer\n        if (window.MutationObserver) {\n            const mutationObserver = new MutationObserver((mutations) => {\n                mutations.forEach(mutation => {\n                    mutation.addedNodes.forEach(node => {\n                        if (node.nodeType === Node.ELEMENT_NODE) {\n                            this.observeIconsInElement(node, iconObserver);\n                        }\n                    });\n                });\n            });\n            \n            mutationObserver.observe(document.body, {\n                childList: true,\n                subtree: true\n            });\n            \n            this.observers.push(mutationObserver);\n        }\n    }\n    \n    /**\n     * Observe icons with intersection observer\n     */\n    observeIcons(observer) {\n        const icons = document.querySelectorAll('i[class*=\"fa-\"], .icon[data-icon]');\n        icons.forEach(icon => observer.observe(icon));\n    }\n    \n    /**\n     * Observe icons within specific element\n     */\n    observeIconsInElement(element, observer) {\n        // Check element itself\n        if (element.matches && element.matches('i[class*=\"fa-\"], .icon[data-icon]')) {\n            observer.observe(element);\n        }\n        \n        // Check children\n        const icons = element.querySelectorAll('i[class*=\"fa-\"], .icon[data-icon]');\n        icons.forEach(icon => observer.observe(icon));\n    }\n    \n    /**\n     * Setup icon replacement system\n     */\n    setupIconReplacement() {\n        // Replace data-icon attributes with Font Awesome classes\n        this.replaceDataIcons();\n        \n        // Setup mutation observer for dynamic icons\n        if (window.MutationObserver) {\n            const observer = new MutationObserver((mutations) => {\n                mutations.forEach(mutation => {\n                    mutation.addedNodes.forEach(node => {\n                        if (node.nodeType === Node.ELEMENT_NODE) {\n                            this.replaceDataIconsInElement(node);\n                        }\n                    });\n                });\n            });\n            \n            observer.observe(document.body, {\n                childList: true,\n                subtree: true\n            });\n            \n            this.observers.push(observer);\n        }\n    }\n    \n    /**\n     * Process existing icons on page\n     */\n    processExistingIcons() {\n        const icons = document.querySelectorAll('i[class*=\"fa-\"]');\n        icons.forEach(icon => this.processIcon(icon));\n    }\n    \n    /**\n     * Process individual icon\n     */\n    processIcon(icon) {\n        const classes = Array.from(icon.classList);\n        const iconStyle = this.getIconStyle(classes);\n        \n        if (iconStyle && !this.loadedIcons.has(iconStyle)) {\n            this.loadStyle(iconStyle).then(() => {\n                icon.classList.add(`fa-${iconStyle}-loaded`);\n            });\n        }\n    }\n    \n    /**\n     * Get icon style from classes\n     */\n    getIconStyle(classes) {\n        if (classes.includes('fas')) return 'solid';\n        if (classes.includes('far')) return 'regular';\n        if (classes.includes('fab')) return 'brands';\n        if (classes.includes('fal')) return 'light';\n        if (classes.includes('fat')) return 'thin';\n        if (classes.includes('fad')) return 'duotone';\n        \n        // Default to solid for fa- classes\n        const hasIcon = classes.some(cls => cls.startsWith('fa-') && cls !== 'fa');\n        return hasIcon ? 'solid' : null;\n    }\n    \n    /**\n     * Replace data-icon attributes with Font Awesome classes\n     */\n    replaceDataIcons() {\n        const elements = document.querySelectorAll('[data-icon]');\n        elements.forEach(element => this.replaceDataIcon(element));\n    }\n    \n    /**\n     * Replace data-icon attributes in specific element\n     */\n    replaceDataIconsInElement(container) {\n        // Check container itself\n        if (container.hasAttribute && container.hasAttribute('data-icon')) {\n            this.replaceDataIcon(container);\n        }\n        \n        // Check children\n        const elements = container.querySelectorAll('[data-icon]');\n        elements.forEach(element => this.replaceDataIcon(element));\n    }\n    \n    /**\n     * Replace single data-icon attribute\n     */\n    replaceDataIcon(element) {\n        const iconName = element.dataset.icon;\n        const iconStyle = element.dataset.iconStyle || 'solid';\n        const iconSize = element.dataset.iconSize;\n        \n        if (!iconName) return;\n        \n        // Create icon element if needed\n        let iconElement = element;\n        if (element.tagName.toLowerCase() !== 'i') {\n            iconElement = document.createElement('i');\n            element.appendChild(iconElement);\n        }\n        \n        // Add Font Awesome classes\n        const styleClass = this.getStyleClass(iconStyle);\n        iconElement.classList.add(styleClass, `fa-${iconName}`);\n        \n        // Add size class if specified\n        if (iconSize) {\n            iconElement.classList.add(`fa-${iconSize}`);\n        }\n        \n        // Remove data attributes\n        element.removeAttribute('data-icon');\n        element.removeAttribute('data-icon-style');\n        element.removeAttribute('data-icon-size');\n        \n        // Process the icon\n        this.processIcon(iconElement);\n    }\n    \n    /**\n     * Get Font Awesome style class\n     */\n    getStyleClass(style) {\n        const styleMap = {\n            solid: 'fas',\n            regular: 'far',\n            brands: 'fab',\n            light: 'fal',\n            thin: 'fat',\n            duotone: 'fad'\n        };\n        \n        return styleMap[style] || 'fas';\n    }\n    \n    /**\n     * Create icon element programmatically\n     */\n    createIcon(iconName, options = {}) {\n        const {\n            style = 'solid',\n            size = null,\n            className = '',\n            spin = false,\n            pulse = false,\n            fixedWidth = false,\n            ...attributes\n        } = options;\n        \n        const icon = document.createElement('i');\n        const styleClass = this.getStyleClass(style);\n        \n        // Add base classes\n        icon.classList.add(styleClass, `fa-${iconName}`);\n        \n        // Add size class\n        if (size) {\n            icon.classList.add(`fa-${size}`);\n        }\n        \n        // Add animation classes\n        if (spin) icon.classList.add('fa-spin');\n        if (pulse) icon.classList.add('fa-pulse');\n        if (fixedWidth) icon.classList.add('fa-fw');\n        \n        // Add custom classes\n        if (className) {\n            className.split(' ').forEach(cls => {\n                if (cls.trim()) icon.classList.add(cls.trim());\n            });\n        }\n        \n        // Add custom attributes\n        Object.entries(attributes).forEach(([key, value]) => {\n            icon.setAttribute(key, value);\n        });\n        \n        // Ensure style is loaded\n        this.loadStyle(style);\n        \n        return icon;\n    }\n    \n    /**\n     * Get icon element by name\n     */\n    getIcon(iconName, style = 'solid') {\n        const selector = `.${this.getStyleClass(style)}.fa-${iconName}`;\n        return document.querySelector(selector);\n    }\n    \n    /**\n     * Check if icon exists\n     */\n    hasIcon(iconName, style = 'solid') {\n        return this.getIcon(iconName, style) !== null;\n    }\n    \n    /**\n     * Load specific icons on demand\n     */\n    loadIcons(iconNames, style = 'solid') {\n        // Ensure style is loaded\n        return this.loadStyle(style).then(() => {\n            // Icons are available after style is loaded\n            return iconNames.map(name => ({\n                name,\n                style,\n                loaded: true\n            }));\n        });\n    }\n    \n    /**\n     * Get available icon styles\n     */\n    getAvailableStyles() {\n        return Array.from(this.loadedIcons);\n    }\n    \n    /**\n     * Check if style is loaded\n     */\n    isStyleLoaded(style) {\n        return this.loadedIcons.has(style);\n    }\n    \n    /**\n     * Update icon\n     */\n    updateIcon(element, iconName, options = {}) {\n        if (!element) return;\n        \n        const { style = 'solid', ...otherOptions } = options;\n        \n        // Remove old icon classes\n        const oldClasses = Array.from(element.classList).filter(cls => \n            cls.startsWith('fa-') || ['fas', 'far', 'fab', 'fal', 'fat', 'fad'].includes(cls)\n        );\n        oldClasses.forEach(cls => element.classList.remove(cls));\n        \n        // Add new classes\n        const styleClass = this.getStyleClass(style);\n        element.classList.add(styleClass, `fa-${iconName}`);\n        \n        // Apply other options\n        Object.entries(otherOptions).forEach(([key, value]) => {\n            if (key === 'size' && value) {\n                element.classList.add(`fa-${value}`);\n            } else if (key === 'spin' && value) {\n                element.classList.add('fa-spin');\n            } else if (key === 'pulse' && value) {\n                element.classList.add('fa-pulse');\n            } else if (key === 'fixedWidth' && value) {\n                element.classList.add('fa-fw');\n            }\n        });\n        \n        // Ensure style is loaded\n        this.loadStyle(style);\n    }\n    \n    /**\n     * Cleanup and destroy\n     */\n    destroy() {\n        // Disconnect observers\n        this.observers.forEach(observer => {\n            if (observer.disconnect) {\n                observer.disconnect();\n            }\n        });\n        \n        // Clear caches\n        this.loadedIcons.clear();\n        this.iconCache.clear();\n        this.observers = [];\n    }\n}\n\n/**\n * Register globally and create singleton instance\n */\nif (typeof window !== 'undefined') {\n    window.MivtonComponents = window.MivtonComponents || {};\n    \n    // Create singleton instance\n    window.MivtonComponents.IconSystem = new MivtonIconSystem();\n    \n    // Add convenient global methods\n    window.icon = {\n        create: (name, options) => window.MivtonComponents.IconSystem.createIcon(name, options),\n        load: (names, style) => window.MivtonComponents.IconSystem.loadIcons(names, style),\n        update: (element, name, options) => window.MivtonComponents.IconSystem.updateIcon(element, name, options),\n        loadStyle: (style) => window.MivtonComponents.IconSystem.loadStyle(style),\n        isLoaded: (style) => window.MivtonComponents.IconSystem.isStyleLoaded(style)\n    };\n}\n\n// Export for modules\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = MivtonIconSystem;\n}"