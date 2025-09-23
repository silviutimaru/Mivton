/**
 * ==============================================
 * MIVTON - CARD COMPONENT
 * Phase 2.2 - Modern UI Components
 * Card component with glassmorphism effects
 * ==============================================
 */

/**
 * Card Component Class
 * Extends BaseComponent with card-specific functionality
 */
class MivtonCard extends (window.MivtonComponents?.BaseComponent || class {}) {
    constructor(element, options = {}) {
        const defaultOptions = {
            className: 'mivton-card',
            variant: 'default',
            size: 'md',
            interactive: false,
            elevation: false,
            glass: false,
            bordered: false,
            loading: false,
            skeleton: false,
            ...options
        };
        
        super(element, defaultOptions);
    }
    
    /**
     * Custom initialization
     */
    onInit() {
        this.setupCard();
        this.applyVariant();
        this.applySize();
        this.setupInteractivity();
        
        if (this.options.loading || this.options.skeleton) {
            this.showSkeleton();
        }
    }
    
    /**
     * Setup card-specific features
     */
    setupCard() {
        // Apply card modifiers
        if (this.options.glass) {
            this.addClass('card-glass');
        }
        
        if (this.options.elevated) {
            this.addClass('card-elevated');
        }
        
        if (this.options.bordered) {
            this.addClass('card-bordered');
        }
        
        // Setup card structure if needed
        this.setupCardStructure();
    }
    
    /**
     * Setup card structure (header, body, footer)
     */
    setupCardStructure() {
        // Check if card already has structure
        const hasStructure = this.element.querySelector('.mivton-card-header, .mivton-card-body, .mivton-card-footer');
        
        if (!hasStructure && this.element.children.length > 0) {
            // Wrap existing content in card body
            const content = Array.from(this.element.children);
            const body = document.createElement('div');
            body.className = 'mivton-card-body';
            
            content.forEach(child => body.appendChild(child));
            this.element.appendChild(body);
        }
    }
    
    /**
     * Apply card variant
     */
    applyVariant() {
        const variants = ['default', 'primary', 'success', 'warning', 'error'];
        variants.forEach(variant => {
            this.removeClass(`card-${variant}`);
        });
        
        if (this.options.variant !== 'default') {
            this.addClass(`card-${this.options.variant}`);
        }
    }
    
    /**
     * Apply card size
     */
    applySize() {
        const sizes = ['sm', 'md', 'lg', 'xl'];
        sizes.forEach(size => {
            this.removeClass(`card-${size}`);
        });
        
        if (this.options.size !== 'md') {
            this.addClass(`card-${this.options.size}`);
        }
    }
    
    /**
     * Setup interactivity (hover effects, click handling)
     */
    setupInteractivity() {
        if (!this.options.interactive) return;
        
        this.addClass('card-interactive');
        
        // Add click handler
        this.on('click', this.handleClick.bind(this));
        
        // Add keyboard support
        this.setAttribute('tabindex', '0');
        this.on('keydown', this.handleKeydown.bind(this));
        
        // Add hover effects
        this.on('mouseenter', this.handleMouseEnter.bind(this));
        this.on('mouseleave', this.handleMouseLeave.bind(this));
    }
    
    /**
     * Handle card click
     */
    handleClick(event) {
        if (this.state.disabled || this.state.loading) {
            event.preventDefault();
            return;
        }
        
        this.emit('click', {
            originalEvent: event,
            card: this
        });
    }
    
    /**
     * Handle keyboard interaction
     */
    handleKeydown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.handleClick(event);
        }
    }
    
    /**
     * Handle mouse enter
     */
    handleMouseEnter(event) {
        this.emit('hover-start', {
            originalEvent: event,
            card: this
        });
    }
    
    /**
     * Handle mouse leave
     */
    handleMouseLeave(event) {
        this.emit('hover-end', {
            originalEvent: event,
            card: this
        });
    }
    
    /**
     * Set card variant
     */
    setVariant(variant) {
        this.options.variant = variant;
        this.applyVariant();
        this.emit('variant-changed', { variant });
        return this;
    }
    
    /**
     * Set card size
     */
    setSize(size) {
        this.options.size = size;
        this.applySize();
        this.emit('size-changed', { size });
        return this;
    }
    
    /**
     * Set card header
     */
    setHeader(title, subtitle = null, actions = null) {
        // Remove existing header
        const existingHeader = this.element.querySelector('.mivton-card-header');
        if (existingHeader) {
            existingHeader.remove();
        }
        
        // Create new header
        const header = document.createElement('div');
        header.className = 'mivton-card-header';
        
        // Create title section
        const titleSection = document.createElement('div');
        
        if (typeof title === 'string') {
            const titleElement = document.createElement('h3');
            titleElement.className = 'mivton-card-title';
            titleElement.textContent = title;
            titleSection.appendChild(titleElement);
            
            if (subtitle) {
                const subtitleElement = document.createElement('p');
                subtitleElement.className = 'mivton-card-subtitle';
                subtitleElement.textContent = subtitle;
                titleSection.appendChild(subtitleElement);
            }
        } else if (title instanceof HTMLElement) {
            titleSection.appendChild(title);
        }
        
        header.appendChild(titleSection);
        
        // Add actions if provided
        if (actions) {
            const actionsElement = document.createElement('div');
            actionsElement.className = 'mivton-card-actions';
            
            if (Array.isArray(actions)) {
                actions.forEach(action => {
                    if (action instanceof HTMLElement) {
                        actionsElement.appendChild(action);
                    }
                });
            } else if (actions instanceof HTMLElement) {
                actionsElement.appendChild(actions);
            }
            
            header.appendChild(actionsElement);
        }
        
        // Insert header at the beginning
        this.element.insertBefore(header, this.element.firstChild);
        
        this.emit('header-changed', { title, subtitle, actions });
        return this;
    }
    
    /**
     * Set card body content
     */
    setBody(content) {
        let body = this.element.querySelector('.mivton-card-body');
        
        if (!body) {
            body = document.createElement('div');
            body.className = 'mivton-card-body';
            
            // Insert after header or at beginning
            const header = this.element.querySelector('.mivton-card-header');
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
        
        this.emit('body-changed', { content });
        return this;
    }
    
    /**
     * Set card footer
     */
    setFooter(content, alignment = 'end') {
        // Remove existing footer
        const existingFooter = this.element.querySelector('.mivton-card-footer');
        if (existingFooter) {
            existingFooter.remove();
        }
        
        if (!content) return this;
        
        // Create new footer
        const footer = document.createElement('div');
        footer.className = `mivton-card-footer`;
        
        // Set alignment
        if (alignment === 'center') {
            footer.classList.add('actions-center');
        } else if (alignment === 'start') {
            footer.style.justifyContent = 'flex-start';
        }
        
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
        
        this.emit('footer-changed', { content, alignment });
        return this;
    }
    
    /**
     * Add badge to card
     */
    addBadge(text, variant = 'primary') {
        // Remove existing badge
        const existingBadge = this.element.querySelector('.mivton-card-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // Create badge
        const badge = document.createElement('span');
        badge.className = `mivton-card-badge badge-${variant}`;
        badge.textContent = text;
        
        this.element.appendChild(badge);
        
        this.emit('badge-added', { text, variant });
        return this;
    }
    
    /**
     * Remove badge from card
     */
    removeBadge() {
        const badge = this.element.querySelector('.mivton-card-badge');
        if (badge) {
            badge.remove();
            this.emit('badge-removed');
        }
        return this;
    }
    
    /**
     * Add image to card
     */
    setImage(src, alt = '', size = 'md') {
        // Remove existing image
        const existingImage = this.element.querySelector('.mivton-card-image');
        if (existingImage) {
            existingImage.remove();
        }
        
        if (!src) return this;
        
        // Create image
        const img = document.createElement('img');
        img.className = `mivton-card-image card-image-${size}`;
        img.src = src;
        img.alt = alt;
        
        // Insert image at the beginning (before header)
        this.element.insertBefore(img, this.element.firstChild);
        
        this.emit('image-set', { src, alt, size });
        return this;
    }
    
    /**
     * Show skeleton loading state
     */
    showSkeleton() {
        // Store original content
        this.originalContent = this.element.innerHTML;
        
        // Clear content and add skeleton
        this.element.innerHTML = '';
        this.addClass('card-skeleton');
        
        // Create skeleton structure
        const skeletonHTML = `
            <div class="mivton-card-skeleton-avatar"></div>
            <div class="mivton-card-skeleton-line line-lg"></div>
            <div class="mivton-card-skeleton-line line-medium"></div>
            <div class="mivton-card-skeleton-line line-short"></div>
        `;
        
        this.element.innerHTML = skeletonHTML;
        
        this.state.loading = true;
        this.emit('skeleton-show');
        return this;
    }
    
    /**
     * Hide skeleton and restore content
     */
    hideSkeleton() {
        this.removeClass('card-skeleton');
        
        if (this.originalContent) {
            this.element.innerHTML = this.originalContent;
            this.originalContent = null;
        }
        
        this.state.loading = false;
        this.emit('skeleton-hide');
        return this;
    }
    
    /**
     * Set card as interactive
     */
    setInteractive(interactive = true) {
        this.options.interactive = interactive;
        
        if (interactive) {
            this.setupInteractivity();
        } else {
            this.removeClass('card-interactive');
            this.element.removeAttribute('tabindex');
            this.off('click', this.handleClick);
            this.off('keydown', this.handleKeydown);
        }
        
        this.emit('interactive-changed', { interactive });
        return this;
    }
    
    /**
     * Flip card (for card with front/back content)
     */
    flip() {
        if (!this.hasClass('card-flippable')) {
            console.warn('Card is not configured as flippable');
            return this;
        }
        
        const isFlipped = this.hasClass('card-flipped');
        this.toggleClass('card-flipped', !isFlipped);
        
        this.emit('flip', { flipped: !isFlipped });
        return this;
    }
    
    /**
     * Custom destroy cleanup
     */
    onDestroy() {
        // Restore original content if showing skeleton
        if (this.originalContent) {
            this.element.innerHTML = this.originalContent;
            this.originalContent = null;
        }
    }
    
    /**
     * Static method to create card from data
     */
    static fromData(data, container, options = {}) {
        if (!data || !container) {
            console.error('MivtonCard.fromData: Invalid parameters');
            return null;
        }
        
        // Create card element
        const cardElement = document.createElement('div');
        cardElement.className = 'mivton-card';
        
        // Create card instance
        const cardOptions = {
            variant: data.variant || 'default',
            size: data.size || 'md',
            interactive: data.interactive || false,
            glass: data.glass || false,
            ...options
        };
        
        const card = new MivtonCard(cardElement, cardOptions);
        
        // Set card content
        if (data.image) {
            card.setImage(data.image.src, data.image.alt, data.image.size);
        }
        
        if (data.header) {
            card.setHeader(data.header.title, data.header.subtitle, data.header.actions);
        }
        
        if (data.body) {
            card.setBody(data.body);
        }
        
        if (data.footer) {
            card.setFooter(data.footer.content, data.footer.alignment);
        }
        
        if (data.badge) {
            card.addBadge(data.badge.text, data.badge.variant);
        }
        
        // Add click handler if provided
        if (data.onClick) {
            card.on('click', data.onClick);
        }
        
        // Add to container
        if (typeof container === 'string') {
            const containerElement = document.querySelector(container);
            if (containerElement) {
                containerElement.appendChild(cardElement);
            }
        } else {
            container.appendChild(cardElement);
        }
        
        return card;
    }
    
    /**
     * Static method to create card grid
     */
    static createGrid(cards, container, options = {}) {
        if (!cards || !Array.isArray(cards) || !container) {
            console.error('MivtonCard.createGrid: Invalid parameters');
            return null;
        }
        
        // Create grid container
        const gridElement = document.createElement('div');
        gridElement.className = `mivton-card-grid ${options.size ? `grid-${options.size}` : ''}`;
        
        if (options.className) {
            gridElement.classList.add(options.className);
        }
        
        // Create cards
        const cardInstances = [];
        cards.forEach(cardData => {
            const cardInstance = MivtonCard.fromData(cardData, gridElement, options.cardOptions);
            if (cardInstance) {
                cardInstances.push(cardInstance);
            }
        });
        
        // Add grid to container
        if (typeof container === 'string') {
            const containerElement = document.querySelector(container);
            if (containerElement) {
                containerElement.appendChild(gridElement);
            }
        } else {
            container.appendChild(gridElement);
        }
        
        return {
            grid: gridElement,
            cards: cardInstances
        };
    }
}

/**
 * Register component globally
 */
if (typeof window !== 'undefined') {
    window.MivtonComponents = window.MivtonComponents || {};
    window.MivtonComponents.Card = MivtonCard;
    
    // Auto-initialize cards with data attributes
    const initCards = () => {
        const cards = document.querySelectorAll('[data-mivton-component="Card"], .mivton-card[data-mivton-auto]');
        cards.forEach(card => {
            if (!card._mivtonCard) {
                card._mivtonCard = MivtonCard.fromElement(card);
            }
        });
    };
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCards);
    } else {
        initCards();
    }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MivtonCard;
}
