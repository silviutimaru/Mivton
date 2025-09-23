/**
 * 🔧 MIVTON FRIENDS SYSTEM - COMPATIBILITY FIX
 * 
 * This fixes the MivtonBaseComponent dependency issue
 * Ensures friends system works even without the full component library
 */

// Create a minimal BaseComponent if it doesn't exist
if (typeof window !== 'undefined' && !window.MivtonBaseComponent) {
    console.log('🔧 Creating minimal BaseComponent for friends system...');
    
    class MivtonBaseComponent {
        constructor(element, options = {}) {
            this.element = element;
            this.options = options;
            this.state = {};
        }
        
        setState(newState) {
            this.state = { ...this.state, ...newState };
        }
        
        destroy() {
            // Basic cleanup
            if (this.element && this.element.mivtonComponent) {
                delete this.element.mivtonComponent;
            }
        }
        
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }
    
    // Make it globally available
    window.MivtonBaseComponent = MivtonBaseComponent;
    
    // Also add to MivtonComponents namespace
    window.MivtonComponents = window.MivtonComponents || {};
    window.MivtonComponents.BaseComponent = MivtonBaseComponent;
    
    console.log('✅ Minimal BaseComponent created');
}

// Create Toast component if it doesn't exist
if (typeof window !== 'undefined' && !window.MivtonComponents?.Toast) {
    window.MivtonComponents = window.MivtonComponents || {};
    window.MivtonComponents.Toast = {
        show: function(message, type = 'info') {
            console.log(`📱 Toast (${type}): ${message}`);
            
            // Create simple toast notification
            const toast = document.createElement('div');
            toast.className = `simple-toast toast-${type}`;
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                font-weight: 500;
                max-width: 300px;
                word-wrap: break-word;
            `;
            
            document.body.appendChild(toast);
            
            // Auto remove after 3 seconds
            setTimeout(() => {
                if (toast && toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 3000);
        }
    };
}

// Create Modal component if it doesn't exist
if (typeof window !== 'undefined' && !window.MivtonComponents?.Modal) {
    window.MivtonComponents = window.MivtonComponents || {};
    window.MivtonComponents.Modal = {
        create: function(options) {
            return {
                show: function() {
                    console.log('📱 Modal:', options.title);
                    // For now, use native confirm as fallback
                    const confirmed = confirm(`${options.title}\n\n${options.content.replace(/<[^>]*>/g, '')}`);
                    if (options.buttons) {
                        const confirmBtn = options.buttons.find(b => b.variant !== 'secondary');
                        const cancelBtn = options.buttons.find(b => b.variant === 'secondary');
                        
                        if (confirmed && confirmBtn) {
                            confirmBtn.action();
                        } else if (!confirmed && cancelBtn) {
                            cancelBtn.action();
                        }
                    }
                },
                close: function() {
                    // No-op for native confirm
                }
            };
        }
    };
}

console.log('🛠️ Friends system compatibility layer loaded');
