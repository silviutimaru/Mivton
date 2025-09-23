/**
 * 🚀 MIVTON - COMPLETE DATABASE SCHEMA INITIALIZER
 * Initializes Phase 3.1 and 3.2 database schemas
 */

const { initializeFriendsSchema, isSchemaInitialized } = require('./database/init-friends');
const { initializeRealtimeSchema, isRealtimeSchemaInitialized } = require('./database/init-realtime');
const { initializeAdvancedSocial, isAdvancedSocialSchemaInitialized } = require('./database/init-advanced-social');

async function initializeAllSchemas() {
    try {
        console.log('🚀 Initializing all Mivton database schemas...');
        console.log('');
        
        let schemasInitialized = 0;
        
        // Phase 3.1 - Friends System
        console.log('📋 Phase 3.1 - Friends System Schema');
        const friendsExists = await isSchemaInitialized();
        if (!friendsExists) {
            console.log('🔄 Initializing friends schema...');
            await initializeFriendsSchema();
            schemasInitialized++;
            console.log('✅ Friends schema initialized');
        } else {
            console.log('✅ Friends schema already exists');
        }
        console.log('');
        
        // Phase 3.2 - Real-Time Features
        console.log('📋 Phase 3.2 - Real-Time Features Schema');
        const realtimeExists = await isRealtimeSchemaInitialized();
        if (!realtimeExists) {
            console.log('🔄 Initializing real-time schema...');
            await initializeRealtimeSchema();
            schemasInitialized++;
            console.log('✅ Real-time schema initialized');
        } else {
            console.log('✅ Real-time schema already exists');
        }
        console.log('');
        
        // Phase 3.3 - Advanced Social Features
        console.log('📋 Phase 3.3 - Advanced Social Features Schema');
        try {
            const advancedExists = await isAdvancedSocialSchemaInitialized();
            if (!advancedExists) {
                console.log('🔄 Initializing advanced social schema...');
                await initializeAdvancedSocial();
                schemasInitialized++;
                console.log('✅ Advanced social schema initialized');
            } else {
                console.log('✅ Advanced social schema already exists');
            }
        } catch (error) {
            console.log('⚠️ Advanced social schema not available (optional)');
        }
        
        console.log('');
        if (schemasInitialized > 0) {
            console.log(`🎉 Successfully initialized ${schemasInitialized} database schema(s)!`);
            console.log('');
            console.log('✅ Your Mivton platform now has:');
            console.log('   - Friends system (add/remove friends, requests)');
            console.log('   - Real-time notifications');
            console.log('   - User presence tracking');
            console.log('   - Activity feeds');
            console.log('   - Socket connection management');
            console.log('   - Advanced social analytics');
            console.log('');
            console.log('🔄 Please restart your server to activate all features.');
        } else {
            console.log('✅ All schemas already initialized - no changes needed');
        }
        
    } catch (error) {
        console.error('❌ Schema initialization failed:', error);
        console.error('');
        console.error('💡 Troubleshooting:');
        console.error('   1. Check database connection');
        console.error('   2. Verify user permissions');
        console.error('   3. Check for conflicting tables');
        process.exit(1);
    }
}

// Run initialization if called directly
if (require.main === module) {
    initializeAllSchemas();
}

module.exports = { initializeAllSchemas };
