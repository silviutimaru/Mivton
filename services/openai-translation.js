/**
 * OpenAI Translation Service
 * Handles real-time translation of chat messages using OpenAI GPT models
 */

const OpenAI = require('openai');

class OpenAITranslationService {
    constructor() {
        this.openai = null;
        this.initializeOpenAI();
    }

    /**
     * Initialize OpenAI client
     */
    initializeOpenAI() {
        try {
            const apiKey = process.env.OPENAI_API_KEY;
            
            if (!apiKey) {
                console.warn('⚠️ OPENAI_API_KEY not found in environment variables');
                this.openai = null;
                return;
            }

            this.openai = new OpenAI({
                apiKey: apiKey,
                timeout: 30000, // 30 seconds timeout
                maxRetries: 3
            });

            console.log('✅ OpenAI Translation Service initialized');
        } catch (error) {
            console.error('❌ Failed to initialize OpenAI:', error);
            this.openai = null;
        }
    }

    /**
     * Check if the service is available
     */
    isAvailable() {
        return this.openai !== null;
    }

    /**
     * Get language name from language code
     */
    getLanguageName(langCode) {
        const languages = {
            'en': 'English',
            'ro': 'Romanian', 
            'hu': 'Hungarian',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'zh': 'Chinese',
            'ja': 'Japanese',
            'ko': 'Korean',
            'ar': 'Arabic',
            'hi': 'Hindi',
            'th': 'Thai',
            'vi': 'Vietnamese',
            'pl': 'Polish',
            'nl': 'Dutch',
            'sv': 'Swedish',
            'da': 'Danish',
            'no': 'Norwegian',
            'fi': 'Finnish',
            'cs': 'Czech',
            'sk': 'Slovak',
            'bg': 'Bulgarian',
            'hr': 'Croatian',
            'sr': 'Serbian',
            'sl': 'Slovenian',
            'et': 'Estonian',
            'lv': 'Latvian',
            'lt': 'Lithuanian',
            'uk': 'Ukrainian',
            'el': 'Greek',
            'tr': 'Turkish',
            'he': 'Hebrew',
            'fa': 'Persian',
            'ur': 'Urdu',
            'bn': 'Bengali',
            'ta': 'Tamil',
            'te': 'Telugu',
            'ml': 'Malayalam',
            'kn': 'Kannada',
            'gu': 'Gujarati',
            'pa': 'Punjabi',
            'or': 'Odia',
            'as': 'Assamese',
            'ne': 'Nepali',
            'si': 'Sinhala',
            'my': 'Burmese',
            'km': 'Khmer',
            'lo': 'Lao',
            'ka': 'Georgian',
            'am': 'Amharic',
            'sw': 'Swahili',
            'zu': 'Zulu',
            'af': 'Afrikaans',
            'sq': 'Albanian',
            'eu': 'Basque',
            'be': 'Belarusian',
            'bs': 'Bosnian',
            'ca': 'Catalan',
            'cy': 'Welsh',
            'is': 'Icelandic',
            'ga': 'Irish',
            'mk': 'Macedonian',
            'mt': 'Maltese',
            'gl': 'Galician'
        };
        
        return languages[langCode] || langCode.toUpperCase();
    }

    /**
     * Translate text from one language to another
     * @param {string} text - Text to translate
     * @param {string} fromLang - Source language code (ISO 639-1)
     * @param {string} toLang - Target language code (ISO 639-1)
     * @returns {Promise<Object>} Translation result
     */
    async translateText(text, fromLang, toLang) {
        if (!this.isAvailable()) {
            return {
                success: false,
                error: 'OpenAI service not available - API key not configured',
                fallback: text // Return original text as fallback
            };
        }

        // Don't translate if source and target languages are the same
        if (fromLang === toLang) {
            return {
                success: true,
                originalText: text,
                translatedText: text,
                fromLang: fromLang,
                toLang: toLang,
                fromLanguageName: this.getLanguageName(fromLang),
                toLanguageName: this.getLanguageName(toLang)
            };
        }

        try {
            const fromLanguageName = this.getLanguageName(fromLang);
            const toLanguageName = this.getLanguageName(toLang);

            const prompt = `Translate the following text from ${fromLanguageName} to ${toLanguageName}. 
Keep the original meaning, tone, and context. 
For chat messages, maintain casual conversation style.
Do not add any explanations or additional text - only return the translation.

Text to translate: "${text}"`;

            console.log(`🌐 Translating: ${fromLanguageName} -> ${toLanguageName}`);

            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional translator. Translate the given text accurately while preserving the original meaning, tone, and context. Return only the translation without any additional text or explanations.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 1000,
                temperature: 0.3,
                timeout: 20000
            });

            const translatedText = response.choices[0]?.message?.content?.trim();

            if (!translatedText) {
                throw new Error('No translation received from OpenAI');
            }

            console.log(`✅ Translation completed: "${text}" -> "${translatedText}"`);

            return {
                success: true,
                originalText: text,
                translatedText: translatedText,
                fromLang: fromLang,
                toLang: toLang,
                fromLanguageName: fromLanguageName,
                toLanguageName: toLanguageName,
                usage: response.usage
            };

        } catch (error) {
            console.error('❌ Translation failed:', error);
            
            return {
                success: false,
                error: error.message,
                originalText: text,
                translatedText: text, // Fallback to original text
                fromLang: fromLang,
                toLang: toLang,
                fromLanguageName: this.getLanguageName(fromLang),
                toLanguageName: this.getLanguageName(toLang)
            };
        }
    }

    /**
     * Detect language of a text
     * @param {string} text - Text to detect language for
     * @returns {Promise<Object>} Language detection result
     */
    async detectLanguage(text) {
        if (!this.isAvailable()) {
            return {
                success: false,
                error: 'OpenAI service not available - API key not configured',
                detectedLang: 'en', // Default fallback
                confidence: 0
            };
        }

        try {
            const prompt = `Detect the language of the following text and respond with only the ISO 639-1 language code (e.g., 'en', 'es', 'fr', 'ro', 'hu'). 
If you're unsure, return 'en' as default.

Text: "${text}"`;

            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a language detection expert. Respond with only the ISO 639-1 language code.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 10,
                temperature: 0.1,
                timeout: 10000
            });

            const detectedLang = response.choices[0]?.message?.content?.trim().toLowerCase();

            if (!detectedLang || detectedLang.length > 10) {
                throw new Error('Invalid language detection response');
            }

            console.log(`🔍 Language detected: "${text}" -> ${detectedLang}`);

            return {
                success: true,
                detectedLang: detectedLang,
                languageName: this.getLanguageName(detectedLang),
                confidence: 0.9 // GPT is generally reliable for language detection
            };

        } catch (error) {
            console.error('❌ Language detection failed:', error);
            
            return {
                success: false,
                error: error.message,
                detectedLang: 'en', // Default fallback
                languageName: 'English',
                confidence: 0
            };
        }
    }

    /**
     * Get service status and health
     */
    async getStatus() {
        if (!this.isAvailable()) {
            return {
                available: false,
                error: 'OpenAI API key not configured'
            };
        }

        try {
            // Test with a simple request
            await this.openai.models.list();
            
            return {
                available: true,
                service: 'OpenAI GPT',
                model: 'gpt-3.5-turbo',
                status: 'healthy'
            };
        } catch (error) {
            return {
                available: false,
                error: error.message,
                status: 'unhealthy'
            };
        }
    }
}

// Create singleton instance
const translationService = new OpenAITranslationService();

module.exports = translationService;
