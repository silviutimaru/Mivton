// Mivton Frontend JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize app
    initializeApp();
    
    // Set up event listeners
    setupEventListeners();
    
    // Add loading animations
    addLoadingAnimations();
    
    // Initialize scroll effects
    initializeScrollEffects();
});

function initializeApp() {
    console.log('🚀 Mivton Phase 1.2 - Landing Page with Database Integration');
    
    // Add random animation delays to floating elements
    const floatingElements = document.querySelectorAll('.brand-icon, .feature-icon');
    floatingElements.forEach((el, index) => {
        el.style.animationDelay = `${index * 0.5}s`;
    });
    
    // Animate chat messages on load
    animateChatMessages();
}

function setupEventListeners() {
    // Waitlist modal triggers
    const waitlistButtons = document.querySelectorAll('#joinWaitlist, #finalCta, .nav-cta');
    const modal = document.getElementById('waitlistModal');
    const closeModal = document.getElementById('closeModal');
    const waitlistForm = document.getElementById('waitlistForm');
    
    // Open modal
    waitlistButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            showWaitlistModal();
        });
    });
    
    // Close modal
    closeModal.addEventListener('click', hideWaitlistModal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            hideWaitlistModal();
        }
    });
    
    // Handle form submission
    waitlistForm.addEventListener('submit', handleWaitlistSubmission);
    
    // Learn more button smooth scroll
    const learnMoreBtn = document.getElementById('learnMore');
    learnMoreBtn.addEventListener('click', function(e) {
        e.preventDefault();
        smoothScrollTo('#features');
    });
    
    // Navigation smooth scroll
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href');
            smoothScrollTo(target);
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function showWaitlistModal() {
    const modal = document.getElementById('waitlistModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Focus on email input
    setTimeout(() => {
        const emailInput = modal.querySelector('input[type="email"]');
        emailInput.focus();
    }, 300);
    
    // Add entrance animation
    const modalContent = modal.querySelector('.modal-content');
    modalContent.style.animation = 'modalSlide 0.3s ease-out';
}

function hideWaitlistModal() {
    const modal = document.getElementById('waitlistModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Reset form
    const form = document.getElementById('waitlistForm');
    form.reset();
}

async function handleWaitlistSubmission(e) {
    e.preventDefault();
    
    const form = e.target;
    const emailInput = form.querySelector('input[type="email"]');
    const submitBtn = form.querySelector('button[type="submit"]');
    const email = emailInput.value.trim();
    
    // Validate email
    if (!isValidEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    // Show loading state
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span>Joining...</span>';
    submitBtn.disabled = true;
    
    try {
        // ACTUAL API call to backend
        const response = await fetch('/api/waitlist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });
        
        const result = await response.json();
        
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        if (result.success) {
            // Show success message
            showNotification(`🎉 Welcome to the waitlist! We'll email you at ${email}`, 'success');
            
            // Hide modal
            hideWaitlistModal();
            
            // Log successful signup
            console.log('✅ Waitlist signup successful:', email);
        } else {
            // Show error message
            showNotification(result.message || 'Failed to join waitlist. Please try again.', 'error');
            console.error('❌ Waitlist signup failed:', result.message);
        }
        
    } catch (error) {
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        // Show error message
        showNotification('Network error. Please check your connection and try again.', 'error');
        console.error('❌ Waitlist network error:', error);
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add styles
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: '3000',
        padding: '16px 20px',
        borderRadius: '12px',
        color: 'white',
        fontWeight: '500',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        transform: 'translateX(400px)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        maxWidth: '400px',
        backdropFilter: 'blur(20px)'
    });
    
    // Set background based on type
    const backgrounds = {
        success: 'linear-gradient(135deg, #10b981, #059669)',
        error: 'linear-gradient(135deg, #ef4444, #dc2626)',
        info: 'linear-gradient(135deg, #6366f1, #4f46e5)'
    };
    notification.style.background = backgrounds[type] || backgrounds.info;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove after 5 seconds
    const autoRemove = setTimeout(() => {
        removeNotification(notification);
    }, 5000);
    
    // Manual close
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        clearTimeout(autoRemove);
        removeNotification(notification);
    });
    
    // Style close button
    Object.assign(closeBtn.style, {
        background: 'none',
        border: 'none',
        color: 'white',
        fontSize: '18px',
        cursor: 'pointer',
        marginLeft: '12px',
        opacity: '0.8',
        transition: 'opacity 0.2s'
    });
    
    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.opacity = '1';
    });
    
    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.opacity = '0.8';
    });
}

function removeNotification(notification) {
    notification.style.transform = 'translateX(400px)';
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

function smoothScrollTo(target) {
    const element = document.querySelector(target);
    if (element) {
        const navHeight = document.querySelector('.navbar').offsetHeight;
        const elementPosition = element.offsetTop - navHeight - 20;
        
        window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
        });
    }
}

function handleKeyboardShortcuts(e) {
    // ESC to close modal
    if (e.key === 'Escape') {
        hideWaitlistModal();
    }
    
    // Ctrl/Cmd + K to open waitlist (like Discord)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        showWaitlistModal();
    }
}

function addLoadingAnimations() {
    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease-out forwards';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.feature-card, .about-content, .cta-content');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        observer.observe(el);
    });
    
    // Add fadeInUp animation
    if (!document.querySelector('#fadeInUpStyle')) {
        const style = document.createElement('style');
        style.id = 'fadeInUpStyle';
        style.textContent = `
            @keyframes fadeInUp {
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }
}

function animateChatMessages() {
    const messages = document.querySelectorAll('.message');
    messages.forEach((message, index) => {
        setTimeout(() => {
            message.style.animation = 'messageSlide 0.5s ease-out forwards';
        }, index * 1000);
    });
}

function initializeScrollEffects() {
    // Navbar background on scroll
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(15, 23, 42, 0.95)';
        } else {
            navbar.style.background = 'rgba(15, 23, 42, 0.8)';
        }
    });
    
    // Parallax effect for hero section
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const hero = document.querySelector('.hero');
        if (hero) {
            hero.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
    });
}

// Easter eggs and fun interactions
function addEasterEggs() {
    // Konami code easter egg
    let konamiCode = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
    let konamiIndex = 0;
    
    document.addEventListener('keydown', (e) => {
        if (e.keyCode === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                triggerEasterEgg();
                konamiIndex = 0;
            }
        } else {
            konamiIndex = 0;
        }
    });
}

function triggerEasterEgg() {
    // Add rainbow colors to brand text
    const brandText = document.querySelector('.brand-text');
    if (brandText) {
        brandText.style.background = 'linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)';
        brandText.style.backgroundSize = '200% auto';
        brandText.style.animation = 'rainbow 2s linear infinite';
        brandText.style.webkitBackgroundClip = 'text';
        brandText.style.webkitTextFillColor = 'transparent';
        
        // Add rainbow keyframes if not exists
        if (!document.querySelector('#rainbowStyle')) {
            const style = document.createElement('style');
            style.id = 'rainbowStyle';
            style.textContent = `
                @keyframes rainbow {
                    to { background-position: 200% center; }
                }
            `;
            document.head.appendChild(style);
        }
        
        showNotification('🌈 You found the secret! Mivton loves curious users!', 'info');
    }
}

// Initialize easter eggs
addEasterEggs();

// Global error handling
window.addEventListener('error', (e) => {
    console.error('Frontend error:', e.error);
    // In production, you might want to send this to an error tracking service
});

// Performance monitoring
window.addEventListener('load', () => {
    const loadTime = performance.now();
    console.log(`🚀 Mivton Phase 1.2 loaded in ${Math.round(loadTime)}ms`);
    
    // Mark as loaded for potential analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'page_load_time', {
            value: Math.round(loadTime)
        });
    }
});