const { query } = require('../database/connection');

// Waitlist utilities
const waitlistUtils = {
  // Add email to waitlist
  async addEmail(emailData) {
    const { email, referrer, user_agent, ip_address } = emailData;
    
    try {
      const result = await query(
        `INSERT INTO waitlist (email, referrer, user_agent, ip_address)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [email, referrer || null, user_agent || null, ip_address || null]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        return { success: false, error: 'Email already exists in waitlist' };
      }
      throw error;
    }
  },

  // Check if email exists in waitlist
  async emailExists(email) {
    const result = await query(
      'SELECT id FROM waitlist WHERE email = $1',
      [email]
    );
    return result.rows.length > 0;
  },

  // Get waitlist statistics
  async getStats() {
    const result = await query(`
      SELECT 
        COUNT(*) as total_signups,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as signups_today,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as signups_week,
        COUNT(*) FILTER (WHERE notified = true) as notified_count
      FROM waitlist
    `);
    return result.rows[0];
  },

  // Get all waitlist emails (for admin)
  async getAllEmails(limit = 100, offset = 0) {
    const result = await query(
      `SELECT email, created_at, referrer, notified 
       FROM waitlist 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }
};

module.exports = {
  waitlistUtils
};