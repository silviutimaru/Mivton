// Enhanced handleSaveProfile function with comprehensive debugging
// Replace the handleSaveProfile function in dashboard.js with this version

async handleSaveProfile() {
    console.log('💾 === SAVE PROFILE DEBUG START ===');
    
    try {
        // Debug: Check if elements exist
        const fullNameInput = document.getElementById('fullNameInput');
        const languageSelect = document.getElementById('nativeLanguageSelect');
        const genderSelect = document.getElementById('genderSelect');
        
        console.log('🔍 Form elements found:');
        console.log('- Full Name Input:', fullNameInput, fullNameInput?.value);
        console.log('- Language Select:', languageSelect, languageSelect?.value);
        console.log('- Gender Select:', genderSelect, genderSelect?.value);
        
        if (!fullNameInput || !languageSelect) {
            throw new Error('Required form elements not found!');
        }
        
        if (window.loading) {
            window.loading.show('Saving profile...');
        }

        const formData = {
            full_name: fullNameInput.value || '',
            native_language: languageSelect.value || 'en'
            // Note: Removed gender - will be read-only
        };
        
        console.log('📤 Sending profile data:', formData);
        console.log('🌐 Making API request to: /api/dashboard/profile');

        const response = await fetch('/api/dashboard/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        console.log('📡 API Response:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
        });

        if (response.ok) {
            const responseData = await response.json();
            console.log('✅ API Response Data:', responseData);
            
            // Update current user with the response
            if (responseData.user) {
                this.currentUser = { ...this.currentUser, ...responseData.user };
                console.log('👤 Updated current user:', this.currentUser);
            } else {
                this.currentUser = { ...this.currentUser, ...formData };
                console.log('👤 Updated current user with form data:', this.currentUser);
            }
            
            // Update UI display
            this.updateUserDisplay();
            this.updateLanguageDisplay();
            
            if (window.toast) {
                window.toast.success('Profile updated successfully!');
            }
            
            console.log('✅ Profile save completed successfully');
            
        } else {
            const errorData = await response.text();
            console.error('❌ API Error Response:', errorData);
            throw new Error(`API Error: ${response.status} - ${errorData}`);
        }

    } catch (error) {
        console.error('❌ Save profile error:', error);
        console.error('❌ Error stack:', error.stack);
        
        if (window.toast) {
            window.toast.error('Failed to save profile: ' + error.message);
        } else {
            alert('Failed to save profile: ' + error.message);
        }
    } finally {
        if (window.loading) {
            window.loading.hide();
        }
        console.log('💾 === SAVE PROFILE DEBUG END ===');
    }
}
