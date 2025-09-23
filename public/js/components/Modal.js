/**
 * ==============================================
 * MIVTON - MODAL COMPONENT
 * Phase 2.2 - Modern UI Components
 * Modal component with blur backgrounds
 * ==============================================
 */

/**
 * Modal Component Class
 * Full-featured modal with backdrop, animations, and accessibility
 */
class MivtonModal extends (window.MivtonComponents?.BaseComponent || class {}) {
    constructor(element, options = {}) {
        const defaultOptions = {
            className: 'mivton-modal',
            size: 'md',
            backdrop: true,
            keyboard: true,
            focus: true,
            closable: true,
            animation: 'scale',
            glass: false,
            centered: true,
            scrollable: false,
            static: false,
            ...options
        };
        
        super(element, defaultOptions);
        
        // Modal-specific properties
        this.overlay = null;
        this.isOpen = false;
        this.focusableElements = [];
        this.lastFocusedElement = null;
        this.focusIndex = 0;
    }
    
    /**
     * Custom initialization
     */
    onInit() {
        this.buildModal();
        this.setupEvents();
        this.setupAccessibility();
    }
    
    /**
     * Build modal structure
     */
    buildModal() {
        // Create overlay if it doesn't exist
        if (!this.overlay) {
            this.overlay = document.createElement('div');
            this.overlay.className = 'mivton-modal-overlay';
            
            // Move modal into overlay
            if (this.element.parentNode) {
                this.element.parentNode.insertBefore(this.overlay, this.element);
            }
            this.overlay.appendChild(this.element);
        }
        
        // Apply modal size
        this.applySize();
        
        // Apply modal options
        if (this.options.glass) {
            this.addClass('modal-glass');
        }
        
        if (this.options.scrollable) {
            this.addClass('modal-scrollable');
        }
        
        // Ensure modal structure
        this.ensureModalStructure();
        
        // Hide modal initially
        this.overlay.style.display = 'none';
    }
    
    /**
     * Apply modal size
     */
    applySize() {
        const sizes = ['sm', 'md', 'lg', 'xl', 'full'];
        sizes.forEach(size => {
            this.removeClass(`modal-${size}`);
        });
        
        if (this.options.size !== 'md') {
            this.addClass(`modal-${this.options.size}`);
        }
    }
    
    /**
     * Ensure proper modal structure (header, body, footer)
     */
    ensureModalStructure() {
        const hasHeader = this.element.querySelector('.mivton-modal-header');
        const hasBody = this.element.querySelector('.mivton-modal-body');
        const hasFooter = this.element.querySelector('.mivton-modal-footer');
        
        // If no structure exists, wrap content in body
        if (!hasHeader && !hasBody && !hasFooter && this.element.children.length > 0) {
            const content = Array.from(this.element.children);
            const body = document.createElement('div');
            body.className = 'mivton-modal-body';
            
            content.forEach(child => body.appendChild(child));
            this.element.appendChild(body);
        }
    }
    
    /**
     * Setup event handlers
     */
    setupEvents() {
        // Backdrop click
        if (this.options.backdrop && !this.options.static) {
            this.overlay.addEventListener('click', (event) => {
                if (event.target === this.overlay) {
                    this.close();
                }
            });
        }
        
        // Keyboard events
        if (this.options.keyboard) {
            document.addEventListener('keydown', this.handleKeydown.bind(this));
        }
        
        // Close button
        const closeBtn = this.element.querySelector('.mivton-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // Window resize
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    /**
     * Setup accessibility features
     */
    setupAccessibility() {
        // Set ARIA attributes
        this.element.setAttribute('role', 'dialog');
        this.element.setAttribute('aria-modal', 'true');
        this.element.setAttribute('tabindex', '-1');
        
        // Set aria-labelledby if title exists
        const title = this.element.querySelector('.mivton-modal-title');
        if (title) {
            if (!title.id) {
                title.id = `modal-title-${Date.now()}`;
            }
            this.element.setAttribute('aria-labelledby', title.id);
        }
        
        // Set aria-describedby if body exists
        const body = this.element.querySelector('.mivton-modal-body');
        if (body) {
            if (!body.id) {
                body.id = `modal-body-${Date.now()}`;
            }
            this.element.setAttribute('aria-describedby', body.id);
        }
    }
    
    /**
     * Handle keyboard events
     */
    handleKeydown(event) {
        if (!this.isOpen) return;
        
        switch (event.key) {
            case 'Escape':
                if (this.options.keyboard && !this.options.static) {
                    event.preventDefault();
                    this.close();
                }
                break;
                
            case 'Tab':
                this.handleTabKey(event);
                break;
        }
    }
    
    /**
     * Handle tab key for focus trapping
     */
    handleTabKey(event) {
        const focusableElements = this.getFocusableElements();
        
        if (focusableElements.length === 0) {
            event.preventDefault();
            return;
        }
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (event.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab
            if (document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }
    }
    
    /**
     * Get focusable elements within modal
     */
    getFocusableElements() {
        const selectors = [
            'button',
            '[href]',
            'input',
            'select',
            'textarea',
            '[tabindex]:not([tabindex="-1"])'
        ];
        
        const elements = this.element.querySelectorAll(selectors.join(', '));
        return Array.from(elements).filter(el => {
            return !el.disabled && !el.hidden && el.offsetWidth > 0 && el.offsetHeight > 0;
        });
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        if (this.isOpen) {
            this.updatePosition();
        }
    }
    
    /**
     * Update modal position
     */
    updatePosition() {
        // This method can be extended for custom positioning logic
        // Currently handled by CSS
    }
    
    /**
     * Open modal
     */
    open() {
        if (this.isOpen) return this;
        
        // Store last focused element
        this.lastFocusedElement = document.activeElement;
        
        // Show overlay
        this.overlay.style.display = 'flex';
        
        // Trigger reflow
        this.overlay.offsetHeight;
        
        // Add show class
        this.overlay.classList.add('modal-show');
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Focus modal
        if (this.options.focus) {
            this.focusModal();
        }
        
        // Update state
        this.isOpen = true;
        
        // Emit event
        this.emit('open');
        
        return this;
    }
    
    /**
     * Close modal
     */
    close() {
        if (!this.isOpen) return this;
        
        // Remove show class
        this.overlay.classList.remove('modal-show');
        
        // Hide after animation
        setTimeout(() => {
            this.overlay.style.display = 'none';
            
            // Restore body scroll
            document.body.style.overflow = '';
            
            // Restore focus
            if (this.lastFocusedElement) {
                this.lastFocusedElement.focus();
                this.lastFocusedElement = null;
            }
            
            // Update state
            this.isOpen = false;
            
            // Emit event
            this.emit('close');
            
        }, 300);
        
        return this;
    }
    
    /**
     * Toggle modal
     */
    toggle() {
        return this.isOpen ? this.close() : this.open();
    }
    
    /**
     * Focus modal
     */
    focusModal() {
        const focusableElements = this.getFocusableElements();
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        } else {
            this.element.focus();
        }
    }
    
    /**
     * Set modal title
     */
    setTitle(title) {
        let header = this.element.querySelector('.mivton-modal-header');
        
        if (!header) {
            header = document.createElement('div');
            header.className = 'mivton-modal-header';
            this.element.insertBefore(header, this.element.firstChild);
        }
        
        let titleElement = header.querySelector('.mivton-modal-title');
        
        if (!titleElement) {
            titleElement = document.createElement('h3');
            titleElement.className = 'mivton-modal-title';
            
            // Add close button if closable
            if (this.options.closable) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'mivton-modal-close';
                closeBtn.innerHTML = '×';
                closeBtn.setAttribute('aria-label', 'Close modal');
                closeBtn.addEventListener('click', () => this.close());
                
                header.appendChild(titleElement);
                header.appendChild(closeBtn);
            } else {
                header.appendChild(titleElement);
            }
        }
        
        titleElement.textContent = title;
        
        // Update accessibility
        if (!titleElement.id) {
            titleElement.id = `modal-title-${Date.now()}`;
        }
        this.element.setAttribute('aria-labelledby', titleElement.id);
        
        this.emit('title-changed', { title });
        return this;
    }
    
    /**
     * Set modal body content
     */
    setBody(content) {
        let body = this.element.querySelector('.mivton-modal-body');
        
        if (!body) {
            body = document.createElement('div');
            body.className = 'mivton-modal-body';
            
            // Insert after header or at beginning
            const header = this.element.querySelector('.mivton-modal-header');
            if (header) {
                header.insertAdjacentElement('afterend', body);
            } else {
                this.element.insertBefore(body, this.element.firstChild);
            }
        }
        
        // Set content
        if (typeof content === 'string') {
            body.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            body.innerHTML = '';
            body.appendChild(content);
        }
        
        // Update accessibility
        if (!body.id) {
            body.id = `modal-body-${Date.now()}`;
        }
        this.element.setAttribute('aria-describedby', body.id);
        
        this.emit('body-changed', { content });
        return this;
    }
    
    /**
     * Set modal footer
     */
    setFooter(content) {
        // Remove existing footer
        const existingFooter = this.element.querySelector('.mivton-modal-footer');
        if (existingFooter) {
            existingFooter.remove();
        }
        
        if (!content) return this;
        
        // Create new footer
        const footer = document.createElement('div');
        footer.className = 'mivton-modal-footer';
        
        // Set content
        if (typeof content === 'string') {
            footer.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            footer.appendChild(content);
        } else if (Array.isArray(content)) {
            content.forEach(item => {
                if (item instanceof HTMLElement) {
                    footer.appendChild(item);
                }
            });
        }
        
        // Append footer
        this.element.appendChild(footer);
        
        this.emit('footer-changed', { content });
        return this;
    }
    
    /**
     * Set modal size
     */
    setSize(size) {
        this.options.size = size;
        this.applySize();
        this.emit('size-changed', { size });
        return this;
    }
    
    /**
     * Set modal as static (cannot be closed by clicking backdrop or pressing ESC)
     */
    setStatic(isStatic = true) {
        this.options.static = isStatic;
        this.emit('static-changed', { static: isStatic });
        return this;
    }
    
    /**
     * Custom destroy cleanup
     */
    onDestroy() {
        // Close modal if open
        if (this.isOpen) {
            this.close();
        }
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeydown);
        window.removeEventListener('resize', this.handleResize);
        
        // Remove overlay from DOM
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Restore focus
        if (this.lastFocusedElement) {
            this.lastFocusedElement.focus();
        }
    }
    
    /**
     * Static method to create and show modal
     */
    static show(options = {}) {
        // Create modal element
        const modalElement = document.createElement('div');
        modalElement.className = 'mivton-modal';
        
        // Create modal instance
        const modal = new MivtonModal(modalElement, options);
        
        // Set content if provided
        if (options.title) {
            modal.setTitle(options.title);
        }
        
        if (options.body) {
            modal.setBody(options.body);
        }
        
        if (options.footer) {
            modal.setFooter(options.footer);
        }
        
        // Add to document
        document.body.appendChild(modal.overlay);
        
        // Show modal
        modal.open();
        
        return modal;
    }
    
    /**
     * Static method to create confirmation modal
     */
    static confirm(options = {}) {
        const defaultOptions = {
            title: 'Confirm Action',
            body: 'Are you sure you want to proceed?',
            confirmText: 'Confirm',
            cancelText: 'Cancel',
            confirmVariant: 'primary',
            cancelVariant: 'ghost',
            size: 'sm',
            ...options
        };
        
        return new Promise((resolve) => {
            // Create footer with buttons
            const footer = document.createElement('div');
            footer.className = 'mivton-confirm-actions';
            
            // Cancel button
            const cancelBtn = document.createElement('button');
            cancelBtn.className = `mivton-btn btn-${defaultOptions.cancelVariant}`;
            cancelBtn.textContent = defaultOptions.cancelText;
            cancelBtn.addEventListener('click', () => {
                modal.close();
                resolve(false);
            });
            
            // Confirm button
            const confirmBtn = document.createElement('button');
            confirmBtn.className = `mivton-btn btn-${defaultOptions.confirmVariant}`;
            confirmBtn.textContent = defaultOptions.confirmText;
            confirmBtn.addEventListener('click', () => {
                modal.close();
                resolve(true);
            });
            
            footer.appendChild(cancelBtn);
            footer.appendChild(confirmBtn);
            
            // Create modal
            const modal = MivtonModal.show({
                ...defaultOptions,
                footer,
                keyboard: false,
                backdrop: false
            });
            
            // Handle modal close without button click
            modal.on('close', () => {
                resolve(false);
            });
        });
    }
    
    /**
     * Static method to create alert modal
     */
    static alert(message, title = 'Alert', options = {}) {
        const defaultOptions = {
            title,
            body: message,
            size: 'sm',
            ...options
        };
        
        return new Promise((resolve) => {
            // Create footer with OK button
            const footer = document.createElement('div');
            footer.className = 'mivton-confirm-actions';
            footer.style.justifyContent = 'center';
            
            const okBtn = document.createElement('button');
            okBtn.className = 'mivton-btn btn-primary';
            okBtn.textContent = 'OK';
            okBtn.addEventListener('click', () => {
                modal.close();
                resolve(true);
            });
            
            footer.appendChild(okBtn);
            
            // Create modal
            const modal = MivtonModal.show({
                ...defaultOptions,
                footer
            });
            
            // Handle modal close
            modal.on('close', () => {
                resolve(true);
            });
        });
    }
    
    /**
     * Get all open modals
     */
    static getOpenModals() {
        const overlays = document.querySelectorAll('.mivton-modal-overlay.modal-show');
        return Array.from(overlays).map(overlay => {
            const modal = overlay.querySelector('.mivton-modal');
            return modal._mivtonModal;
        }).filter(Boolean);
    }
    
    /**
     * Close all open modals
     */
    static closeAll() {
        const openModals = this.getOpenModals();
        openModals.forEach(modal => modal.close());
    }
}

/**
 * Register component globally
 */
if (typeof window !== 'undefined') {
    window.MivtonComponents = window.MivtonComponents || {};
    window.MivtonComponents.Modal = MivtonModal;
    
    // Add global modal methods for convenience
    window.modal = {
        show: (options) => MivtonModal.show(options),
        confirm: (options) => MivtonModal.confirm(options),
        alert: (message, title, options) => MivtonModal.alert(message, title, options),
        closeAll: () => MivtonModal.closeAll()
    };
    
    // Auto-initialize modals with data attributes
    const initModals = () => {
        const modals = document.querySelectorAll('[data-mivton-component="Modal"], .mivton-modal[data-mivton-auto]');
        modals.forEach(modal => {
            if (!modal._mivtonModal) {
                modal._mivtonModal = MivtonModal.fromElement(modal);
            }
        });
    };
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initModals);
    } else {
        initModals();
    }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MivtonModal;
}
