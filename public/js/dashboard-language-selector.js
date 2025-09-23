/**
 * ==============================================
 * MIVTON - DASHBOARD LANGUAGE SELECTOR
 * Enhanced language selector for dashboard settings
 * ==============================================
 */

class MivtonDashboardLanguageSelector {
    constructor(selectElement, options = {}) {
        this.selectElement = selectElement;
        this.options = {
            placeholder: 'Select your native language...',
            showFlags: true,
            showNativeNames: true,
            apiEndpoint: '/api/user/languages',
            onLanguageChange: null,
            ...options
        };
        
        this.languages = [];
        this.currentLanguage = null;
        
        this.initialize();
    }
    
    async initialize() {
        try {
            await this.loadLanguages();
            this.createEnhancedSelector();
            this.bindEvents();
            console.log('✅ Dashboard language selector initialized');
        } catch (error) {
            console.error('❌ Failed to initialize dashboard language selector:', error);
            this.createFallbackSelector();
        }
    }
    
    async loadLanguages() {
        try {
            const response = await fetch(this.options.apiEndpoint);
            if (!response.ok) {
                throw new Error(`Failed to load languages: ${response.status}`);
            }
            
            const data = await response.json();
            this.languages = data.languages || [];
            
        } catch (error) {
            console.warn('Using fallback language list:', error);
            // Fallback to basic language list if API fails
            this.languages = this.getFallbackLanguages();
        }
    }
    
    createEnhancedSelector() {
        if (!this.selectElement) return;
        
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'enhanced-language-selector';
        
        // Create custom select
        const customSelect = document.createElement('div');
        customSelect.className = 'custom-select';
        customSelect.innerHTML = `
            <div class="select-display" data-select-display>
                <span class="selected-flag">🌐</span>
                <span class="selected-text">${this.options.placeholder}</span>
                <span class="select-arrow">▼</span>
            </div>
            <div class="select-dropdown" data-dropdown>
                <div class="dropdown-search">
                    <input type="text" placeholder="Search languages..." data-search>
                </div>
                <div class="dropdown-options" data-options>
                    ${this.createOptionsHTML()}
                </div>
            </div>
        `;
        
        wrapper.appendChild(customSelect);
        
        // Replace original select
        this.selectElement.style.display = 'none';
        this.selectElement.parentNode.insertBefore(wrapper, this.selectElement);
        
        // Cache elements
        this.wrapper = wrapper;
        this.customSelect = customSelect;
        this.selectDisplay = customSelect.querySelector('[data-select-display]');
        this.dropdown = customSelect.querySelector('[data-dropdown]');
        this.searchInput = customSelect.querySelector('[data-search]');
        this.optionsContainer = customSelect.querySelector('[data-options]');
        
        // Set current value if any
        const currentValue = this.selectElement.value;
        if (currentValue) {
            this.selectLanguage(currentValue, false);
        }
    }
    
    createOptionsHTML() {
        return this.languages.map(lang => {
            const flag = this.options.showFlags ? (lang.flag || this.getLanguageFlag(lang.code)) : '';
            const nativeName = this.options.showNativeNames && lang.nativeName ? ` (${lang.nativeName})` : '';
            
            return `
                <div class="dropdown-option" data-value="${lang.code}" data-searchable="${lang.name.toLowerCase()} ${lang.nativeName?.toLowerCase() || ''} ${lang.code.toLowerCase()}">
                    ${flag ? `<span class="option-flag">${flag}</span>` : ''}
                    <span class="option-text">${lang.name}${nativeName}</span>
                </div>
            `;
        }).join('');
    }
    
    createFallbackSelector() {
        // If enhanced selector fails, populate the original select with all languages
        if (!this.selectElement) return;
        
        // Clear existing options except the first one (placeholder)
        const placeholder = this.selectElement.querySelector('option[value=""]');
        this.selectElement.innerHTML = '';
        
        if (placeholder) {
            this.selectElement.appendChild(placeholder);
        } else {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select Language';
            this.selectElement.appendChild(defaultOption);
        }
        
        // Add all languages
        this.getFallbackLanguages().forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = `${lang.flag || ''} ${lang.name}`.trim();
            this.selectElement.appendChild(option);
        });
        
        console.log('✅ Fallback language selector created');
    }
    
    bindEvents() {
        if (!this.customSelect) return;
        
        // Toggle dropdown
        this.selectDisplay.addEventListener('click', () => {
            this.toggleDropdown();
        });
        
        // Search functionality
        this.searchInput.addEventListener('input', (e) => {
            this.filterOptions(e.target.value);
        });
        
        // Option selection
        this.optionsContainer.addEventListener('click', (e) => {
            const option = e.target.closest('.dropdown-option');
            if (option) {
                this.selectLanguage(option.dataset.value);
                this.closeDropdown();
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.closeDropdown();
            }
        });
        
        // Keyboard navigation
        this.customSelect.addEventListener('keydown', (e) => {
            this.handleKeyNavigation(e);
        });
    }
    
    toggleDropdown() {
        const isOpen = this.dropdown.classList.contains('open');
        if (isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }
    
    openDropdown() {
        this.dropdown.classList.add('open');
        this.searchInput.focus();
    }
    
    closeDropdown() {
        this.dropdown.classList.remove('open');
        this.searchInput.value = '';
        this.filterOptions('');
    }
    
    filterOptions(query) {
        const options = this.optionsContainer.querySelectorAll('.dropdown-option');
        const lowercaseQuery = query.toLowerCase();
        
        options.forEach(option => {
            const searchable = option.dataset.searchable;
            const isVisible = !query || searchable.includes(lowercaseQuery);
            option.style.display = isVisible ? 'flex' : 'none';
        });
    }
    
    selectLanguage(languageCode, triggerChange = true) {
        const language = this.languages.find(lang => lang.code === languageCode);
        if (!language) return;
        
        this.currentLanguage = language;
        
        // Update display
        const flagElement = this.selectDisplay.querySelector('.selected-flag');
        const textElement = this.selectDisplay.querySelector('.selected-text');
        
        if (flagElement) {
            flagElement.textContent = this.options.showFlags ? (language.flag || this.getLanguageFlag(language.code)) : '';
        }
        
        if (textElement) {
            const displayText = this.options.showNativeNames && language.nativeName ? 
                `${language.name} (${language.nativeName})` : 
                language.name;
            textElement.textContent = displayText;
        }
        
        // Update original select
        this.selectElement.value = languageCode;
        
        // Update option states
        this.optionsContainer.querySelectorAll('.dropdown-option').forEach(option => {
            option.classList.toggle('selected', option.dataset.value === languageCode);
        });
        
        // Trigger change event
        if (triggerChange) {
            const event = new Event('change', { bubbles: true });
            this.selectElement.dispatchEvent(event);
            
            if (this.options.onLanguageChange) {
                this.options.onLanguageChange(language);
            }
        }
    }
    
    handleKeyNavigation(e) {
        const isOpen = this.dropdown.classList.contains('open');
        
        switch (e.key) {
            case 'Enter':
            case ' ':
                if (!isOpen) {
                    e.preventDefault();
                    this.openDropdown();
                }
                break;
            case 'Escape':
                if (isOpen) {
                    e.preventDefault();
                    this.closeDropdown();
                }
                break;
            case 'ArrowDown':
            case 'ArrowUp':
                if (isOpen) {
                    e.preventDefault();
                    this.navigateOptions(e.key === 'ArrowDown' ? 1 : -1);
                }
                break;
        }
    }
    
    navigateOptions(direction) {
        const visibleOptions = Array.from(this.optionsContainer.querySelectorAll('.dropdown-option:not([style*="display: none"])'));
        const currentIndex = visibleOptions.findIndex(option => option.classList.contains('highlighted'));
        
        // Remove current highlight
        visibleOptions.forEach(option => option.classList.remove('highlighted'));
        
        // Calculate new index
        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = visibleOptions.length - 1;
        if (newIndex >= visibleOptions.length) newIndex = 0;
        
        // Highlight new option
        if (visibleOptions[newIndex]) {
            visibleOptions[newIndex].classList.add('highlighted');
            visibleOptions[newIndex].scrollIntoView({ block: 'nearest' });
        }
    }
    
    getLanguageFlag(languageCode) {
        const flags = {
            en: '🇺🇸', es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹',
            pt: '🇵🇹', ru: '🇷🇺', ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳',
            ar: '🇸🇦', hi: '🇮🇳', nl: '🇳🇱', sv: '🇸🇪', no: '🇳🇴',
            da: '🇩🇰', fi: '🇫🇮', pl: '🇵🇱', tr: '🇹🇷', el: '🇬🇷',
            he: '🇮🇱', th: '🇹🇭', vi: '🇻🇳', id: '🇮🇩', ms: '🇲🇾',
            tl: '🇵🇭', uk: '🇺🇦', cs: '🇨🇿', sk: '🇸🇰', hu: '🇭🇺',
            ro: '🇷🇴', bg: '🇧🇬', hr: '🇭🇷', sl: '🇸🇮', et: '🇪🇪',
            lv: '🇱🇻', lt: '🇱🇹'
        };
        return flags[languageCode] || '🌐';
    }
    
    getFallbackLanguages() {
        return [
            { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
            { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
            { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
            { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
            { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
            { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
            { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
            { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
            { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
            { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
            { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
            { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
            { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
            { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
            { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
            { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
            { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
            { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
            { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
            { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
            { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱' },
            { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
            { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
            { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
            { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
            { code: 'tl', name: 'Filipino', nativeName: 'Filipino', flag: '🇵🇭' },
            { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
            { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿' },
            { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰' },
            { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺' },
            { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
            { code: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬' },
            { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷' },
            { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮' },
            { code: 'et', name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪' },
            { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻' },
            { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹' }
        ];
    }
    
    // Public API
    getCurrentLanguage() {
        return this.currentLanguage;
    }
    
    setLanguage(languageCode) {
        this.selectLanguage(languageCode);
    }
    
    refresh() {
        this.loadLanguages().then(() => {
            if (this.optionsContainer) {
                this.optionsContainer.innerHTML = this.createOptionsHTML();
            }
        });
    }
    
    destroy() {
        if (this.wrapper) {
            this.wrapper.remove();
            this.selectElement.style.display = '';
        }
    }
}

// Auto-initialize dashboard language selectors
document.addEventListener('DOMContentLoaded', () => {
    const languageSelects = document.querySelectorAll('#nativeLanguageSelect, #languageFilter');
    languageSelects.forEach(select => {
        if (!select.mivtonLanguageSelector) {
            select.mivtonLanguageSelector = new MivtonDashboardLanguageSelector(select, {
                apiEndpoint: select.id === 'languageFilter' ? '/api/user/languages' : '/api/user/languages'
            });
        }
    });
});

// Export for global use
if (typeof window !== 'undefined') {
    window.MivtonDashboardLanguageSelector = MivtonDashboardLanguageSelector;
}
