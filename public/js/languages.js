/**
 * ==============================================
 * MIVTON - CENTRALIZED LANGUAGE CONFIGURATION
 * Comprehensive language support for all components
 * ==============================================
 */

/**
 * Complete list of supported languages
 * This is the single source of truth for all language-related features
 */
const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English', speakers: '1.5B speakers', family: 'Germanic', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', speakers: '500M speakers', family: 'Romance', flag: '🇪🇸' },
    { code: 'fr', name: 'French', nativeName: 'Français', speakers: '280M speakers', family: 'Romance', flag: '🇫🇷' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', speakers: '100M speakers', family: 'Germanic', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano', speakers: '65M speakers', family: 'Romance', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', speakers: '260M speakers', family: 'Romance', flag: '🇵🇹' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', speakers: '150M speakers', family: 'Slavic', flag: '🇷🇺' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', speakers: '125M speakers', family: 'Japonic', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', nativeName: '한국어', speakers: '77M speakers', family: 'Koreanic', flag: '🇰🇷' },
    { code: 'zh', name: 'Chinese', nativeName: '中文', speakers: '1.1B speakers', family: 'Sino-Tibetan', flag: '🇨🇳' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', speakers: '420M speakers', family: 'Semitic', flag: '🇸🇦' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', speakers: '600M speakers', family: 'Indo-European', flag: '🇮🇳' },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', speakers: '25M speakers', family: 'Germanic', flag: '🇳🇱' },
    { code: 'sv', name: 'Swedish', nativeName: 'Svenska', speakers: '10M speakers', family: 'Germanic', flag: '🇸🇪' },
    { code: 'no', name: 'Norwegian', nativeName: 'Norsk', speakers: '5M speakers', family: 'Germanic', flag: '🇳🇴' },
    { code: 'da', name: 'Danish', nativeName: 'Dansk', speakers: '6M speakers', family: 'Germanic', flag: '🇩🇰' },
    { code: 'fi', name: 'Finnish', nativeName: 'Suomi', speakers: '5M speakers', family: 'Finno-Ugric', flag: '🇫🇮' },
    { code: 'pl', name: 'Polish', nativeName: 'Polski', speakers: '45M speakers', family: 'Slavic', flag: '🇵🇱' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', speakers: '80M speakers', family: 'Turkic', flag: '🇹🇷' },
    { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', speakers: '13M speakers', family: 'Hellenic', flag: '🇬🇷' },
    { code: 'he', name: 'Hebrew', nativeName: 'עברית', speakers: '9M speakers', family: 'Semitic', flag: '🇮🇱' },
    { code: 'th', name: 'Thai', nativeName: 'ไทย', speakers: '70M speakers', family: 'Tai-Kadai', flag: '🇹🇭' },
    { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', speakers: '95M speakers', family: 'Austroasiatic', flag: '🇻🇳' },
    { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', speakers: '270M speakers', family: 'Austronesian', flag: '🇮🇩' },
    { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', speakers: '290M speakers', family: 'Austronesian', flag: '🇲🇾' },
    { code: 'tl', name: 'Filipino', nativeName: 'Filipino', speakers: '45M speakers', family: 'Austronesian', flag: '🇵🇭' },
    { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', speakers: '40M speakers', family: 'Slavic', flag: '🇺🇦' },
    { code: 'cs', name: 'Czech', nativeName: 'Čeština', speakers: '10M speakers', family: 'Slavic', flag: '🇨🇿' },
    { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', speakers: '5M speakers', family: 'Slavic', flag: '🇸🇰' },
    { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', speakers: '13M speakers', family: 'Finno-Ugric', flag: '🇭🇺' },
    { code: 'ro', name: 'Romanian', nativeName: 'Română', speakers: '24M speakers', family: 'Romance', flag: '🇷🇴' },
    { code: 'bg', name: 'Bulgarian', nativeName: 'Български', speakers: '9M speakers', family: 'Slavic', flag: '🇧🇬' },
    { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', speakers: '5M speakers', family: 'Slavic', flag: '🇭🇷' },
    { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', speakers: '2M speakers', family: 'Slavic', flag: '🇸🇮' },
    { code: 'et', name: 'Estonian', nativeName: 'Eesti', speakers: '1M speakers', family: 'Finno-Ugric', flag: '🇪🇪' },
    { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', speakers: '2M speakers', family: 'Baltic', flag: '🇱🇻' },
    { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', speakers: '3M speakers', family: 'Baltic', flag: '🇱🇹' }
];

/**
 * Popular languages (most commonly used)
 */
const POPULAR_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi'];

/**
 * Language utility functions
 */
class LanguageUtils {
    /**
     * Get all supported languages
     */
    static getAllLanguages() {
        return [...SUPPORTED_LANGUAGES];
    }

    /**
     * Get popular languages
     */
    static getPopularLanguages() {
        return SUPPORTED_LANGUAGES.filter(lang => POPULAR_LANGUAGES.includes(lang.code));
    }

    /**
     * Get language by code
     */
    static getLanguageByCode(code) {
        return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
    }

    /**
     * Get language name by code
     */
    static getLanguageName(code) {
        const language = this.getLanguageByCode(code);
        return language ? language.name : 'Unknown';
    }

    /**
     * Get language flag by code
     */
    static getLanguageFlag(code) {
        const language = this.getLanguageByCode(code);
        return language ? language.flag : '🌐';
    }

    /**
     * Get language native name by code
     */
    static getLanguageNativeName(code) {
        const language = this.getLanguageByCode(code);
        return language ? language.nativeName : 'Unknown';
    }

    /**
     * Check if language code is supported
     */
    static isSupported(code) {
        return SUPPORTED_LANGUAGES.some(lang => lang.code === code);
    }

    /**
     * Get languages as map for backend validation
     */
    static getLanguageMap() {
        const map = {};
        SUPPORTED_LANGUAGES.forEach(lang => {
            map[lang.code] = lang.name;
        });
        return map;
    }

    /**
     * Get languages formatted for select options
     */
    static getSelectOptions() {
        return SUPPORTED_LANGUAGES.map(lang => ({
            value: lang.code,
            label: lang.name,
            nativeLabel: lang.nativeName,
            flag: lang.flag
        }));
    }

    /**
     * Search languages by query
     */
    static searchLanguages(query) {
        if (!query) return this.getAllLanguages();
        
        const lowercaseQuery = query.toLowerCase();
        return SUPPORTED_LANGUAGES.filter(lang => 
            lang.name.toLowerCase().includes(lowercaseQuery) ||
            lang.nativeName.toLowerCase().includes(lowercaseQuery) ||
            lang.code.toLowerCase().includes(lowercaseQuery)
        );
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUPPORTED_LANGUAGES,
        POPULAR_LANGUAGES,
        LanguageUtils
    };
}

// Export for browser
if (typeof window !== 'undefined') {
    window.MivtonLanguages = {
        SUPPORTED_LANGUAGES,
        POPULAR_LANGUAGES,
        LanguageUtils
    };
}
