/**
 * ==============================================
 * MIVTON - LANGUAGE SELECTOR COMPONENT
 * Phase 2.3 - User Interface Polish
 * Complete language selection interface with flags
 * ==============================================
 */

/**
 * Language Selector Component
 * Handles language selection with search, flags, and auto-detection
 */
class MivtonLanguageSelector extends MivtonBaseComponent {
    constructor(element, options = {}) {
        const defaultOptions = {
            currentLanguage: 'en',
            showPopular: true,
            showSearch: true,
            showAutoDetect: true,
            enableKeyboardNav: true,
            maxPopular: 8,
            searchPlaceholder: 'Search languages...',
            apiEndpoint: '/api/languages',
            onLanguageChange: null,
            ...options
        };
        
        super(element, defaultOptions);
        
        // Component state
        this.selectorState = {
            languages: [],
            popularLanguages: [],
            filteredLanguages: [],
            selectedLanguage: this.options.currentLanguage,
            searchQuery: '',
            loading: false,
            isOpen: false,
            autoDetectedLanguage: null
        };
        
        // Initialize component
        this.initializeSelector();
    }
    
    /**
     * Initialize language selector
     */
    initializeSelector() {
        try {
            this.createSelectorElements();
            this.setupEventListeners();
            this.loadLanguages();
            this.detectBrowserLanguage();
            
            this.log('Language selector initialized successfully');
        } catch (error) {
            this.handleError(error, 'initializeSelector');
        }
    }
    
    /**
     * Create selector UI elements
     */
    createSelectorElements() {
        if (!this.element) return;
        
        this.element.innerHTML = `
            <div class="language-selector">
                <div class="language-selector-header">
                    <div>
                        <div class="language-selector-title">
                            <i class="language-selector-icon fas fa-globe"></i>
                            Select Language
                        </div>
                        <div class="language-selector-subtitle">Choose your preferred language</div>
                    </div>
                </div>
                
                <div class="current-language-display">
                    <div class="current-language-flag" id="currentFlag">🌐</div>
                    <div class="current-language-info">
                        <div class="current-language-name" id="currentName">Loading...</div>
                        <div class="current-language-native" id="currentNative">Please wait...</div>
                    </div>
                    <button class="change-language-btn" id="changeLanguageBtn">
                        Change
                    </button>
                </div>
                
                ${this.options.showAutoDetect ? this.createAutoDetectHTML() : ''}
                
                ${this.options.showSearch ? this.createSearchHTML() : ''}
                
                ${this.options.showPopular ? this.createPopularLanguagesHTML() : ''}
                
                <div class="all-languages">
                    <div class="all-languages-title">
                        <i class="fas fa-list"></i>
                        All Languages
                    </div>
                    <div class="languages-grid" id="languagesGrid">
                        ${this.createLoadingHTML()}
                    </div>
                </div>
                
                <div class="language-selector-actions">
                    <button class="language-action-btn secondary" id="cancelBtn">
                        Cancel
                    </button>
                    <button class="language-action-btn primary" id="saveBtn" disabled>
                        Save Changes
                    </button>
                </div>
            </div>
        `;
        
        // Cache DOM elements
        this.currentFlag = this.element.querySelector('#currentFlag');
        this.currentName = this.element.querySelector('#currentName');
        this.currentNative = this.element.querySelector('#currentNative');
        this.changeBtn = this.element.querySelector('#changeLanguageBtn');
        this.searchInput = this.element.querySelector('#languageSearch');
        this.languagesGrid = this.element.querySelector('#languagesGrid');
        this.autoDetectBtn = this.element.querySelector('#autoDetectBtn');
        this.cancelBtn = this.element.querySelector('#cancelBtn');
        this.saveBtn = this.element.querySelector('#saveBtn');
    }
    
    /**
     * Create auto-detect section HTML
     */
    createAutoDetectHTML() {
        return `
            <div class="auto-detect-section" id="autoDetectSection" style="display: none;">
                <div class="auto-detect-icon">🔍</div>
                <div class="auto-detect-content">
                    <div class="auto-detect-title">Auto-detected Language</div>
                    <div class="auto-detect-description">We detected your browser language</div>
                    <div class="auto-detect-result" id="autoDetectResult"></div>
                </div>
                <button class="auto-detect-btn" id="autoDetectBtn">
                    Use This
                </button>
            </div>
        `;
    }
    
    /**
     * Create search section HTML
     */
    createSearchHTML() {
        return `
            <div class="language-search">
                <input type="text" 
                       class="language-search-input" 
                       id="languageSearch"
                       placeholder="${this.options.searchPlaceholder}"
                       autocomplete="off"
                       spellcheck="false">
                <i class="language-search-icon fas fa-search"></i>
            </div>
        `;
    }
    
    /**
     * Create popular languages section HTML
     */
    createPopularLanguagesHTML() {
        return `
            <div class="popular-languages" id="popularLanguages">
                <div class="popular-languages-title">
                    <i class="fas fa-star"></i>
                    Popular Languages
                </div>
                <div class="popular-languages-grid" id="popularGrid">
                    ${this.createLoadingHTML()}
                </div>
            </div>
        `;
    }
    
    /**
     * Create loading HTML
     */
    createLoadingHTML() {
        return `
            <div class="language-loading">
                <div class="language-loading-spinner"></div>
                <span>Loading languages...</span>
            </div>
        `;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Change button
        if (this.changeBtn) {
            this.changeBtn.addEventListener('click', () => {
                this.toggleSelector();
            });
        }
        
        // Search input
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
            
            this.searchInput.addEventListener('keydown', (e) => {
                if (this.options.enableKeyboardNav) {
                    this.handleSearchKeydown(e);
                }
            });
        }
        
        // Auto-detect button
        if (this.autoDetectBtn) {
            this.autoDetectBtn.addEventListener('click', () => {
                this.selectLanguage(this.selectorState.autoDetectedLanguage);
            });
        }
        
        // Languages grid
        if (this.languagesGrid) {
            this.languagesGrid.addEventListener('click', (e) => {
                this.handleLanguageClick(e);
            });
            
            if (this.options.enableKeyboardNav) {
                this.languagesGrid.addEventListener('keydown', (e) => {
                    this.handleGridKeydown(e);
                });
            }
        }
        
        // Action buttons
        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', () => {
                this.cancelSelection();
            });
        }
        
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => {
                this.saveSelection();
            });
        }
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target) && this.selectorState.isOpen) {
                this.closeSelector();
            }
        });
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.selectorState.isOpen) {
                this.closeSelector();
            }
        });
    }
    
    /**
     * Load languages from API
     */
    async loadLanguages() {
        try {
            this.setLoadingState(true);
            
            // Load all languages
            const response = await fetch(this.options.apiEndpoint);
            if (!response.ok) {
                throw new Error(`Failed to load languages: ${response.status}`);
            }
            
            const data = await response.json();
            this.selectorState.languages = data.languages || this.getDefaultLanguages();
            this.selectorState.popularLanguages = data.popular || this.getPopularLanguages();
            
            // Set initial filtered languages
            this.selectorState.filteredLanguages = [...this.selectorState.languages];
            
            // Update current language display
            this.updateCurrentLanguageDisplay();
            
            // Render languages
            this.renderLanguages();
            
            this.emit('languages-loaded', { 
                languages: this.selectorState.languages,
                popular: this.selectorState.popularLanguages
            });
            
        } catch (error) {
            this.handleLoadError(error);
        } finally {
            this.setLoadingState(false);
        }
    }
    
    /**
     * Detect browser language
     */
    detectBrowserLanguage() {
        if (!this.options.showAutoDetect) return;
        
        try {
            const browserLang = navigator.language || navigator.userLanguage;
            const langCode = browserLang.split('-')[0].toLowerCase();
            
            // Check if we support this language
            const language = this.getLanguageByCode(langCode);
            if (language && langCode !== this.selectorState.selectedLanguage) {
                this.selectorState.autoDetectedLanguage = langCode;
                this.showAutoDetect(language);
            }
        } catch (error) {
            this.log('Failed to detect browser language:', error);
        }
    }
    
    /**
     * Show auto-detect section
     */
    showAutoDetect(language) {
        const autoDetectSection = this.element.querySelector('#autoDetectSection');
        const autoDetectResult = this.element.querySelector('#autoDetectResult');
        
        if (autoDetectSection && autoDetectResult) {
            autoDetectResult.innerHTML = `
                <span class="language-flag">${this.getLanguageFlag(language.code)}</span>
                <span>${language.name} (${language.nativeName})</span>
            `;
            autoDetectSection.style.display = 'flex';
        }
    }
    
    /**
     * Handle search input
     */
    handleSearch(query) {
        this.selectorState.searchQuery = query.toLowerCase();
        this.filterLanguages();
    }
    
    /**
     * Filter languages based on search
     */
    filterLanguages() {
        const query = this.selectorState.searchQuery;
        
        if (!query) {
            this.selectorState.filteredLanguages = [...this.selectorState.languages];
        } else {
            this.selectorState.filteredLanguages = this.selectorState.languages.filter(lang => 
                lang.name.toLowerCase().includes(query) ||
                lang.nativeName.toLowerCase().includes(query) ||
                lang.code.toLowerCase().includes(query)
            );
        }
        
        this.renderLanguages();
    }
    
    /**
     * Render languages grid
     */
    renderLanguages() {
        if (!this.languagesGrid) return;
        
        // Render popular languages if enabled and no search
        if (this.options.showPopular && !this.selectorState.searchQuery) {
            this.renderPopularLanguages();
        }
        
        // Render all languages
        if (this.selectorState.filteredLanguages.length === 0) {
            this.renderEmptyState();
        } else {
            this.renderLanguagesList();
        }
    }
    
    /**
     * Render popular languages
     */
    renderPopularLanguages() {
        const popularGrid = this.element.querySelector('#popularGrid');
        if (!popularGrid) return;
        
        const popularHTML = this.selectorState.popularLanguages
            .slice(0, this.options.maxPopular)
            .map(lang => this.createPopularLanguageItem(lang))
            .join('');
            
        popularGrid.innerHTML = popularHTML;
    }
    
    /**
     * Create popular language item
     */
    createPopularLanguageItem(language) {
        const isSelected = language.code === this.selectorState.selectedLanguage;
        
        return `
            <div class="popular-language-item ${isSelected ? 'selected' : ''}"
                 data-language="${language.code}"
                 tabindex="0"
                 role="button"
                 aria-label="Select ${language.name}">
                <div class="popular-language-flag">${this.getLanguageFlag(language.code)}</div>
                <div class="popular-language-info">
                    <div class="popular-language-name">${language.name}</div>
                    <div class="popular-language-native">${language.nativeName}</div>
                    <div class="popular-language-speakers">${language.speakers || ''}</div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render languages list
     */
    renderLanguagesList() {
        const languagesHTML = this.selectorState.filteredLanguages
            .map(lang => this.createLanguageItem(lang))
            .join('');
            
        this.languagesGrid.innerHTML = languagesHTML;
    }
    
    /**
     * Create language item
     */
    createLanguageItem(language) {
        const isSelected = language.code === this.selectorState.selectedLanguage;
        
        return `
            <div class="language-item ${isSelected ? 'selected' : ''}"
                 data-language="${language.code}"
                 data-code="${language.code}"
                 tabindex="0"
                 role="button"
                 aria-label="Select ${language.name}">
                <div class="language-flag">${this.getLanguageFlag(language.code)}</div>
                <div class="language-info">
                    <div class="language-name">${language.name}</div>
                    <div class="language-native-name">${language.nativeName}</div>
                    <div class="language-meta">
                        <span class="language-code">${language.code.toUpperCase()}</span>
                        ${language.speakers ? `<span class="language-speakers">${language.speakers}</span>` : ''}
                        ${language.family ? `<span class="language-family">${language.family}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render empty state
     */
    renderEmptyState() {
        this.languagesGrid.innerHTML = `
            <div class="language-empty-state">
                <div class="language-empty-icon">🔍</div>
                <h3 class="language-empty-title">No languages found</h3>
                <p class="language-empty-text">
                    No languages match "${this.selectorState.searchQuery}". 
                    Try a different search term.
                </p>
            </div>
        `;
    }
    
    /**
     * Handle language item click
     */
    handleLanguageClick(event) {
        const languageItem = event.target.closest('.language-item, .popular-language-item');
        if (!languageItem) return;
        
        const languageCode = languageItem.dataset.language;
        if (languageCode) {
            this.selectLanguage(languageCode);
        }
    }
    
    /**
     * Select a language
     */
    selectLanguage(languageCode) {
        if (!languageCode) return;
        
        // Update selected language
        this.selectorState.selectedLanguage = languageCode;
        
        // Update UI
        this.updateSelectedLanguageUI();
        this.updateCurrentLanguageDisplay();
        
        // Enable save button
        if (this.saveBtn) {
            this.saveBtn.disabled = false;
        }
        
        // Emit event
        this.emit('language-selected', { 
            language: this.getLanguageByCode(languageCode) 
        });
    }
    
    /**
     * Update selected language UI
     */
    updateSelectedLanguageUI() {
        // Remove selection from all items
        this.element.querySelectorAll('.language-item, .popular-language-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selection to current language
        this.element.querySelectorAll(`[data-language="${this.selectorState.selectedLanguage}"]`).forEach(item => {
            item.classList.add('selected');
        });
    }
    
    /**
     * Update current language display
     */
    updateCurrentLanguageDisplay() {
        const language = this.getLanguageByCode(this.selectorState.selectedLanguage);
        if (!language) return;
        
        if (this.currentFlag) {
            this.currentFlag.textContent = this.getLanguageFlag(language.code);
        }
        
        if (this.currentName) {
            this.currentName.textContent = language.name;
        }
        
        if (this.currentNative) {
            this.currentNative.textContent = language.nativeName;
        }
    }
    
    /**
     * Handle search keydown
     */
    handleSearchKeydown(event) {
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.focusFirstLanguage();
                break;
            case 'Escape':
                event.preventDefault();
                this.clearSearch();
                break;
        }
    }
    
    /**
     * Handle grid keydown
     */
    handleGridKeydown(event) {
        const focusedItem = document.activeElement;
        if (!focusedItem || !focusedItem.classList.contains('language-item') && !focusedItem.classList.contains('popular-language-item')) {
            return;
        }
        
        const items = Array.from(this.languagesGrid.querySelectorAll('.language-item, .popular-language-item'));
        const currentIndex = items.indexOf(focusedItem);
        let nextIndex = currentIndex;
        
        switch (event.key) {
            case 'ArrowDown':
                nextIndex = Math.min(currentIndex + 1, items.length - 1);
                break;
            case 'ArrowUp':
                nextIndex = Math.max(currentIndex - 1, 0);
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                this.handleLanguageClick({ target: focusedItem });
                return;
            case 'Escape':
                event.preventDefault();
                this.searchInput?.focus();
                return;
            default:
                return;
        }
        
        event.preventDefault();
        items[nextIndex]?.focus();
    }
    
    /**
     * Focus first language item
     */
    focusFirstLanguage() {
        const firstItem = this.languagesGrid.querySelector('.language-item, .popular-language-item');
        if (firstItem) {
            firstItem.focus();
        }
    }
    
    /**
     * Clear search
     */
    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
            this.handleSearch('');
            this.searchInput.focus();
        }
    }
    
    /**
     * Toggle selector open/closed
     */
    toggleSelector() {
        if (this.selectorState.isOpen) {
            this.closeSelector();
        } else {
            this.openSelector();
        }
    }
    
    /**
     * Open selector
     */
    openSelector() {
        this.selectorState.isOpen = true;
        this.element.classList.add('selector-open');
        
        // Focus search input if available
        if (this.searchInput) {
            setTimeout(() => this.searchInput.focus(), 100);
        }
        
        this.emit('selector-opened');
    }
    
    /**
     * Close selector
     */
    closeSelector() {
        this.selectorState.isOpen = false;
        this.element.classList.remove('selector-open');
        
        // Reset search
        this.clearSearch();
        
        // Reset save button
        if (this.saveBtn) {
            this.saveBtn.disabled = true;
        }
        
        this.emit('selector-closed');
    }
    
    /**
     * Cancel selection
     */
    cancelSelection() {
        // Reset to original language
        this.selectorState.selectedLanguage = this.options.currentLanguage;
        this.updateSelectedLanguageUI();
        this.updateCurrentLanguageDisplay();
        this.closeSelector();
        
        this.emit('selection-cancelled');
    }
    
    /**
     * Save selection
     */
    async saveSelection() {
        try {
            this.setLoadingState(true);
            
            const language = this.getLanguageByCode(this.selectorState.selectedLanguage);
            
            // Call API to save language preference
            const response = await fetch('/api/user/language', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    language: this.selectorState.selectedLanguage 
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to save language preference');
            }
            
            // Update current language
            this.options.currentLanguage = this.selectorState.selectedLanguage;
            
            // Close selector
            this.closeSelector();
            
            // Show success message
            if (window.MivtonComponents?.Toast) {
                window.MivtonComponents.Toast.success(`Language changed to ${language.name}`);
            }
            
            // Call callback if provided
            if (this.options.onLanguageChange) {
                this.options.onLanguageChange(language);
            }
            
            // Emit event
            this.emit('language-changed', { language });
            
        } catch (error) {
            if (window.MivtonComponents?.Toast) {
                window.MivtonComponents.Toast.error('Failed to save language preference');
            }
            
            this.handleError(error, 'saveSelection');
        } finally {
            this.setLoadingState(false);
        }
    }
    
    /**
     * Set loading state
     */
    setLoadingState(loading) {
        this.selectorState.loading = loading;
        
        if (loading) {
            this.element.classList.add('loading');
            if (this.saveBtn) {
                this.saveBtn.disabled = true;
                this.saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            }
        } else {
            this.element.classList.remove('loading');
            if (this.saveBtn) {
                this.saveBtn.innerHTML = 'Save Changes';
                this.saveBtn.disabled = this.selectorState.selectedLanguage === this.options.currentLanguage;
            }
        }
    }
    
    /**
     * Handle load error
     */
    handleLoadError(error) {
        this.log('Failed to load languages:', error);
        
        // Use default languages
        this.selectorState.languages = this.getDefaultLanguages();
        this.selectorState.popularLanguages = this.getPopularLanguages();
        this.selectorState.filteredLanguages = [...this.selectorState.languages];
        
        this.updateCurrentLanguageDisplay();
        this.renderLanguages();
        
        if (window.MivtonComponents?.Toast) {
            window.MivtonComponents.Toast.warning('Using offline language list');
        }
    }
    
    /**
     * Get language by code
     */
    getLanguageByCode(code) {
        return this.selectorState.languages.find(lang => lang.code === code);
    }
    
    /**
     * Get language flag emoji
     */
    getLanguageFlag(languageCode) {
        const flags = {
            en: '🇺🇸', es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹',
            pt: '🇵🇹', ru: '🇷🇺', ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳',
            ar: '🇸🇦', hi: '🇮🇳', nl: '🇳🇱', sv: '🇸🇪', no: '🇳🇴',
            da: '🇩🇰', fi: '🇫🇮', pl: '🇵🇱', tr: '🇹🇷', el: '🇬🇷',
            he: '🇮🇱', th: '🇹🇭', vi: '🇻🇳', id: '🇮🇩', ms: '🇲🇾',
            tl: '🇵🇭', uk: '🇺🇦', cs: '🇨🇿', sk: '🇸🇰', hu: '🇭🇺',
            ro: '🇷🇴', bg: '🇧🇬', hr: '🇭🇷', sl: '🇸🇮', et: '🇪🇪',
            lv: '🇱🇻', lt: '🇱🇹', mt: '🇲🇹', is: '🇮🇸', ga: '🇮🇪',
            cy: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', eu: '🏴󠁥󠁳󠁰󠁶󠁿', ca: '🏴󠁥󠁳󠁣󠁴󠁿', gl: '🏴󠁥󠁳󠁧󠁡󠁿',
            br: '🇧🇷', mx: '🇲🇽'
        };
        return flags[languageCode] || '🌐';
    }
    
    /**
     * Get default languages (fallback)
     */
    getDefaultLanguages() {
        return [
            { code: 'en', name: 'English', nativeName: 'English', speakers: '1.5B speakers', family: 'Germanic' },
            { code: 'es', name: 'Spanish', nativeName: 'Español', speakers: '500M speakers', family: 'Romance' },
            { code: 'fr', name: 'French', nativeName: 'Français', speakers: '280M speakers', family: 'Romance' },
            { code: 'de', name: 'German', nativeName: 'Deutsch', speakers: '100M speakers', family: 'Germanic' },
            { code: 'it', name: 'Italian', nativeName: 'Italiano', speakers: '65M speakers', family: 'Romance' },
            { code: 'pt', name: 'Portuguese', nativeName: 'Português', speakers: '260M speakers', family: 'Romance' },
            { code: 'ru', name: 'Russian', nativeName: 'Русский', speakers: '150M speakers', family: 'Slavic' },
            { code: 'ja', name: 'Japanese', nativeName: '日本語', speakers: '125M speakers', family: 'Japonic' },
            { code: 'ko', name: 'Korean', nativeName: '한국어', speakers: '77M speakers', family: 'Koreanic' },
            { code: 'zh', name: 'Chinese', nativeName: '中文', speakers: '1.1B speakers', family: 'Sino-Tibetan' },
            { code: 'ar', name: 'Arabic', nativeName: 'العربية', speakers: '420M speakers', family: 'Semitic' },
            { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', speakers: '600M speakers', family: 'Indo-European' },
            { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', speakers: '25M speakers', family: 'Germanic' },
            { code: 'sv', name: 'Swedish', nativeName: 'Svenska', speakers: '10M speakers', family: 'Germanic' },
            { code: 'no', name: 'Norwegian', nativeName: 'Norsk', speakers: '5M speakers', family: 'Germanic' },
            { code: 'da', name: 'Danish', nativeName: 'Dansk', speakers: '6M speakers', family: 'Germanic' },
            { code: 'fi', name: 'Finnish', nativeName: 'Suomi', speakers: '5M speakers', family: 'Finno-Ugric' },
            { code: 'pl', name: 'Polish', nativeName: 'Polski', speakers: '45M speakers', family: 'Slavic' },
            { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', speakers: '80M speakers', family: 'Turkic' },
            { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', speakers: '13M speakers', family: 'Hellenic' },
            { code: 'he', name: 'Hebrew', nativeName: 'עברית', speakers: '9M speakers', family: 'Semitic' },
            { code: 'th', name: 'Thai', nativeName: 'ไทย', speakers: '70M speakers', family: 'Tai-Kadai' },
            { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', speakers: '95M speakers', family: 'Austroasiatic' },
            { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', speakers: '270M speakers', family: 'Austronesian' },
            { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', speakers: '290M speakers', family: 'Austronesian' },
            { code: 'tl', name: 'Filipino', nativeName: 'Filipino', speakers: '45M speakers', family: 'Austronesian' },
            { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', speakers: '40M speakers', family: 'Slavic' },
            { code: 'cs', name: 'Czech', nativeName: 'Čeština', speakers: '10M speakers', family: 'Slavic' },
            { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', speakers: '5M speakers', family: 'Slavic' },
            { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', speakers: '13M speakers', family: 'Finno-Ugric' },
            { code: 'ro', name: 'Romanian', nativeName: 'Română', speakers: '24M speakers', family: 'Romance' },
            { code: 'bg', name: 'Bulgarian', nativeName: 'Български', speakers: '9M speakers', family: 'Slavic' },
            { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', speakers: '5M speakers', family: 'Slavic' },
            { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', speakers: '2M speakers', family: 'Slavic' },
            { code: 'et', name: 'Estonian', nativeName: 'Eesti', speakers: '1M speakers', family: 'Finno-Ugric' },
            { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', speakers: '2M speakers', family: 'Baltic' },
            { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', speakers: '3M speakers', family: 'Baltic' }
        ];
    }
    
    /**
     * Get popular languages
     */
    getPopularLanguages() {
        const popularCodes = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi'];
        return this.selectorState.languages.filter(lang => popularCodes.includes(lang.code));
    }
    
    /**
     * Public API: Set current language
     */
    setCurrentLanguage(languageCode) {
        this.options.currentLanguage = languageCode;
        this.selectorState.selectedLanguage = languageCode;
        this.updateCurrentLanguageDisplay();
        this.updateSelectedLanguageUI();
    }
    
    /**
     * Public API: Get current language
     */
    getCurrentLanguage() {
        return this.getLanguageByCode(this.selectorState.selectedLanguage);
    }
    
    /**
     * Public API: Open selector programmatically
     */
    open() {
        this.openSelector();
    }
    
    /**
     * Public API: Close selector programmatically
     */
    close() {
        this.closeSelector();
    }
    
    /**
     * Public API: Add custom language
     */
    addLanguage(language) {
        if (!language.code || !language.name || !language.nativeName) {
            throw new Error('Language must have code, name, and nativeName');
        }
        
        // Check if language already exists
        const existingIndex = this.selectorState.languages.findIndex(lang => lang.code === language.code);
        if (existingIndex !== -1) {
            // Update existing language
            this.selectorState.languages[existingIndex] = { ...this.selectorState.languages[existingIndex], ...language };
        } else {
            // Add new language
            this.selectorState.languages.push(language);
        }
        
        // Update filtered languages and re-render
        this.filterLanguages();
    }
    
    /**
     * Public API: Remove language
     */
    removeLanguage(languageCode) {
        this.selectorState.languages = this.selectorState.languages.filter(lang => lang.code !== languageCode);
        this.selectorState.popularLanguages = this.selectorState.popularLanguages.filter(lang => lang.code !== languageCode);
        this.filterLanguages();
    }
    
    /**
     * Public API: Get all languages
     */
    getAllLanguages() {
        return [...this.selectorState.languages];
    }
    
    /**
     * Component cleanup
     */
    onDestroy() {
        // Remove event listeners
        document.removeEventListener('click', this.handleOutsideClick);
        document.removeEventListener('keydown', this.handleEscapeKey);
        
        // Clear state
        this.selectorState = null;
    }
}

/**
 * Register component globally
 */
if (typeof window !== 'undefined') {
    window.MivtonComponents = window.MivtonComponents || {};
    window.MivtonComponents.LanguageSelector = MivtonLanguageSelector;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MivtonLanguageSelector;
}
