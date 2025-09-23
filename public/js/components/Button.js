/**
 * ==============================================
 * MIVTON - BUTTON COMPONENT
 * Phase 2.2 - Modern UI Components
 * Button component with animations and interactions
 * ==============================================
 */

/**
 * Button Component Class
 * Extends BaseComponent with button-specific functionality
 */
class MivtonButton extends (window.MivtonComponents?.BaseComponent || class {}) {
    constructor(element, options = {}) {
        const defaultOptions = {
            className: 'mivton-btn',
            role: 'button',
            focusable: true,
            variant: 'primary',
            size: 'md',
            ripple: true,
            loading: false,
            disabled: false,
            icon: null,
            iconPosition: 'left',
            loadingText: '',
            ...options
        };
        
        super(element, defaultOptions);
    }
    
    /**
     * Custom initialization
     */
    onInit() {
        this.setupButton();
        this.setupRippleEffect();
        this.setupKeyboardHandling();
        this.applyVariant();
        this.applySize();
        
        if (this.options.loading) {
            this.setLoading(true);
        }
        
        if (this.options.disabled) {
            this.disable();
        }
        
        if (this.options.icon) {
            this.setIcon(this.options.icon, this.options.iconPosition);
        }
    }
    
    /**
     * Setup button-specific attributes and events
     */
    setupButton() {
        // Ensure proper button semantics
        if (this.element.tagName.toLowerCase() !== 'button' && 
            this.element.tagName.toLowerCase() !== 'a') {
            this.setAttribute('role', 'button');
            this.setAttribute('tabindex', '0');
        }
        
        // Add click handler
        this.on('click', this.handleClick.bind(this));
        
        // Add focus/blur handlers for accessibility
        this.on('focus', this.handleFocus.bind(this));
        this.on('blur', this.handleBlur.bind(this));
        
        // Prevent double-click issues
        this.clickTimeout = null;
    }
    
    /**
     * Setup ripple effect
     */
    setupRippleEffect() {
        if (!this.options.ripple) return;
        
        this.on('mousedown', this.createRipple.bind(this));
        this.on('touchstart', this.createRipple.bind(this), { passive: true });
    }
    
    /**
     * Setup keyboard handling
     */
    setupKeyboardHandling() {
        this.on('keydown', (event) => {
            // Activate button with Enter or Space
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.handleClick(event);
            }
        });
    }
    
    /**
     * Handle button click
     */
    handleClick(event) {
        // Prevent multiple rapid clicks
        if (this.clickTimeout) {
            event.preventDefault();
            return;
        }
        
        // Prevent click if disabled or loading
        if (this.state.disabled || this.state.loading) {
            event.preventDefault();
            return;
        }
        
        // Set click timeout
        this.clickTimeout = setTimeout(() => {
            this.clickTimeout = null;
        }, 300);
        
        // Add click animation
        if (this.options.animations) {
            this.addClass('btn-clicking');
            setTimeout(() => {
                this.removeClass('btn-clicking');
            }, 150);
        }
        
        // Emit click event
        this.emit('click', { 
            originalEvent: event,
            button: this 
        });
    }
    
    /**
     * Handle focus
     */
    handleFocus(event) {
        this.addClass('btn-focused');
        this.emit('focus', { 
            originalEvent: event,
            button: this 
        });
    }
    
    /**
     * Handle blur
     */
    handleBlur(event) {
        this.removeClass('btn-focused');
        this.emit('blur', { 
            originalEvent: event,
            button: this 
        });
    }
    
    /**
     * Create ripple effect
     */
    createRipple(event) {
        if (!this.options.ripple || this.state.disabled) return;
        
        const rect = this.element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = (event.clientX || event.touches[0].clientX) - rect.left - size / 2;
        const y = (event.clientY || event.touches[0].clientY) - rect.top - size / 2;
        
        const ripple = document.createElement('span');
        ripple.className = 'btn-ripple';
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.6);
            transform: scale(0);
            animation: ripple 0.6s linear;
            left: ${x}px;
            top: ${y}px;
            width: ${size}px;
            height: ${size}px;
            pointer-events: none;
        `;
        
        this.element.appendChild(ripple);
        
        // Remove ripple after animation
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    }
    
    /**
     * Apply button variant
     */
    applyVariant() {
        // Remove existing variant classes
        const variants = ['primary', 'secondary', 'success', 'warning', 'danger', 'ghost', 'glass'];
        variants.forEach(variant => {
            this.removeClass(`btn-${variant}`);
        });
        
        // Add new variant class
        this.addClass(`btn-${this.options.variant}`);
    }
    
    /**
     * Apply button size
     */
    applySize() {
        // Remove existing size classes
        const sizes = ['sm', 'md', 'lg', 'xl'];
        sizes.forEach(size => {
            this.removeClass(`btn-${size}`);
        });
        
        // Add new size class (md is default, no class needed)
        if (this.options.size !== 'md') {
            this.addClass(`btn-${this.options.size}`);
        }
    }
    
    /**
     * Set button variant
     */
    setVariant(variant) {
        this.options.variant = variant;
        this.applyVariant();
        this.emit('variant-changed', { variant });
        return this;
    }
    
    /**
     * Set button size
     */
    setSize(size) {
        this.options.size = size;
        this.applySize();
        this.emit('size-changed', { size });
        return this;
    }
    
    /**
     * Set button text
     */
    setText(text) {
        if (!text) return this;
        
        // Find text node or create one
        let textNode = null;
        for (let node of this.element.childNodes) {
            if (node.nodeType === Node.TEXT_NODE || 
                (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('btn-icon'))) {
                textNode = node;
                break;
            }
        }
        
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            textNode.textContent = text;
        } else if (textNode) {
            textNode.textContent = text;
        } else {
            this.element.appendChild(document.createTextNode(text));
        }
        
        this.emit('text-changed', { text });
        return this;
    }
    
    /**
     * Set button icon
     */
    setIcon(iconClass, position = 'left') {
        if (!iconClass) return this;
        
        // Remove existing icon
        const existingIcon = this.element.querySelector('.btn-icon');
        if (existingIcon) {
            existingIcon.remove();
        }
        
        // Create new icon
        const icon = document.createElement('i');
        icon.className = `btn-icon ${iconClass}`;
        
        // Position icon
        if (position === 'right') {
            this.element.appendChild(icon);
        } else {
            this.element.insertBefore(icon, this.element.firstChild);
        }
        
        this.options.icon = iconClass;
        this.options.iconPosition = position;
        
        this.emit('icon-changed', { icon: iconClass, position });
        return this;
    }
    
    /**
     * Remove button icon
     */
    removeIcon() {
        const existingIcon = this.element.querySelector('.btn-icon');
        if (existingIcon) {
            existingIcon.remove();
        }
        
        this.options.icon = null;
        this.emit('icon-removed');
        return this;
    }
    
    /**
     * Set loading state with spinner
     */
    setLoading(loading = true) {
        super.setLoading(loading);
        
        if (loading) {
            // Store original content
            this.originalContent = this.element.innerHTML;
            
            // Add loading spinner
            const spinner = document.createElement('i');
            spinner.className = 'btn-icon fas fa-spinner fa-spin';
            
            // Clear content and add spinner
            this.element.innerHTML = '';
            this.element.appendChild(spinner);
            
            // Add loading text if specified
            if (this.options.loadingText) {
                this.element.appendChild(document.createTextNode(this.options.loadingText));
            }
            
        } else {
            // Restore original content
            if (this.originalContent) {
                this.element.innerHTML = this.originalContent;
                this.originalContent = null;
            }
        }
        
        return this;
    }
    
    /**
     * Get button text
     */
    getText() {
        return this.element.textContent.trim();
    }
    
    /**
     * Set button as block (full width)
     */
    setBlock(isBlock = true) {
        this.toggleClass('btn-block', isBlock);
        this.options.block = isBlock;
        this.emit('block-changed', { block: isBlock });
        return this;
    }
    
    /**
     * Set button as rounded
     */
    setRounded(isRounded = true) {
        this.toggleClass('btn-rounded', isRounded);
        this.options.rounded = isRounded;
        this.emit('rounded-changed', { rounded: isRounded });
        return this;
    }
    
    /**
     * Set button as icon-only
     */
    setIconOnly(isIconOnly = true) {
        this.toggleClass('btn-icon-only', isIconOnly);
        this.options.iconOnly = isIconOnly;
        this.emit('icon-only-changed', { iconOnly: isIconOnly });
        return this;
    }
    
    /**
     * Programmatically click the button
     */
    click() {
        if (!this.state.disabled && !this.state.loading) {
            this.element.click();
        }
        return this;
    }
    
    /**
     * Focus the button
     */
    focus() {
        if (this.element && typeof this.element.focus === 'function') {
            this.element.focus();
        }
        return this;
    }
    
    /**
     * Blur the button
     */
    blur() {
        if (this.element && typeof this.element.blur === 'function') {
            this.element.blur();
        }
        return this;
    }
    
    /**
     * Custom destroy cleanup
     */
    onDestroy() {
        // Clear click timeout
        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
            this.clickTimeout = null;
        }
        
        // Clean up ripple effects
        const ripples = this.element.querySelectorAll('.btn-ripple');
        ripples.forEach(ripple => ripple.remove());
        
        // Restore original content if in loading state
        if (this.originalContent) {
            this.element.innerHTML = this.originalContent;
            this.originalContent = null;
        }
    }
    
    /**
     * Static factory method for creating button groups
     */
    static createGroup(buttons, container, options = {}) {
        if (!container || !buttons || !Array.isArray(buttons)) {
            console.error('MivtonButton.createGroup: Invalid parameters');
            return null;
        }
        
        // Create group container
        const groupElement = document.createElement('div');
        groupElement.className = 'mivton-btn-group';
        
        // Add group options
        if (options.className) {
            groupElement.classList.add(options.className);
        }
        
        // Create buttons
        const buttonInstances = [];
        buttons.forEach((buttonConfig, index) => {
            const buttonElement = document.createElement('button');
            buttonElement.className = 'mivton-btn';
            
            // Apply button configuration
            if (buttonConfig.text) {
                buttonElement.textContent = buttonConfig.text;
            }
            
            if (buttonConfig.icon) {
                const icon = document.createElement('i');
                icon.className = `btn-icon ${buttonConfig.icon}`;
                if (buttonConfig.iconPosition === 'right') {
                    buttonElement.appendChild(icon);
                } else {
                    buttonElement.insertBefore(icon, buttonElement.firstChild);
                }
            }
            
            // Create button instance
            const buttonOptions = {
                variant: buttonConfig.variant || options.variant || 'primary',
                size: buttonConfig.size || options.size || 'md',
                ...buttonConfig.options
            };
            
            const buttonInstance = new MivtonButton(buttonElement, buttonOptions);
            
            // Add click handler if provided
            if (buttonConfig.onClick) {
                buttonInstance.on('click', buttonConfig.onClick);
            }
            
            groupElement.appendChild(buttonElement);
            buttonInstances.push(buttonInstance);
        });
        
        // Add group to container
        if (typeof container === 'string') {
            const containerElement = document.querySelector(container);
            if (containerElement) {
                containerElement.appendChild(groupElement);
            }
        } else {
            container.appendChild(groupElement);
        }
        
        return {
            group: groupElement,
            buttons: buttonInstances
        };
    }
}

// CSS for ripple effect (injected if not present)
if (typeof document !== 'undefined' && !document.querySelector('#mivton-button-styles')) {
    const style = document.createElement('style');
    style.id = 'mivton-button-styles';
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        .mivton-btn {
            position: relative;
            overflow: hidden;
        }
        
        .mivton-btn.btn-clicking {
            transform: scale(0.98);
        }
        
        .mivton-btn.btn-focused {
            outline: 2px solid var(--primary);
            outline-offset: 2px;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Register component globally
 */
if (typeof window !== 'undefined') {
    window.MivtonComponents = window.MivtonComponents || {};
    window.MivtonComponents.Button = MivtonButton;
    
    // Auto-initialize buttons with data attributes
    const initButtons = () => {
        const buttons = document.querySelectorAll('[data-mivton-component="Button"], .mivton-btn[data-mivton-auto]');
        buttons.forEach(button => {
            if (!button._mivtonButton) {
                button._mivtonButton = MivtonButton.fromElement(button);
            }
        });
    };
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initButtons);
    } else {
        initButtons();
    }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MivtonButton;
}
