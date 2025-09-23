// Load environment variables FIRST
require('dotenv').config();

const { waitlistUtils } = require('./utils/waitlist');

// Test waitlist functionality directly
const testWaitlist = async () => {
  console.log('🧪 Testing waitlist functionality...');
  
  try {
    // Test adding an email
    const testEmail = 'test@mivton.com';
    console.log(`📧 Adding test email: ${testEmail}`);
    
    const emailData = {
      email: testEmail,
      referrer: 'test-script',
      user_agent: 'Node.js test',
      ip_address: '127.0.0.1'
    };
    
    const result = await waitlistUtils.addEmail(emailData);
    console.log('📊 Add email result:', result);
    
    if (result.success) {
      console.log('✅ Email added successfully');
      
      // Test getting stats
      console.log('📊 Getting waitlist stats...');
      const stats = await waitlistUtils.getStats();
      console.log('📈 Stats:', stats);
      
      // Test getting all emails
      console.log('📧 Getting all emails...');
      const emails = await waitlistUtils.getAllEmails();
      console.log('📋 All emails:', emails);
      
    } else {
      console.log('❌ Failed to add email:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
};

testWaitlist();