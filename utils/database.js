const { query, getClient } = require('../database/connection');

// User utilities
const userUtils = {
  // Find user by email
  async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  },

  // Find user by username
  async findByUsername(username) {
    const result = await query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0] || null;
  },

  // Find user by ID
  async findById(id) {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  // Create new user
  async create(userData) {
    const {
      username,
      email,
      password_hash,
      full_name,
      gender,
      native_language = 'en'
    } = userData;

    const result = await query(
      `INSERT INTO users (username, email, password_hash, full_name, gender, native_language)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [username, email, password_hash, full_name, gender, native_language]
    );
    return result.rows[0];
  },

  // Update user status
  async updateStatus(userId, status) {
    const result = await query(
      'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, userId]
    );
    return result.rows[0] || null;
  },

  // Update last login
  async updateLastLogin(userId) {
    const result = await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [userId]
    );
    return result.rows[0] || null;
  },

  // Get user stats
  async getStats() {
    const result = await query('SELECT * FROM user_stats');
    return result.rows[0] || null;
  }
};

// General database utilities
const dbUtils = {
  // Check if table exists
  async tableExists(tableName) {
    const result = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [tableName]
    );
    return result.rows[0].exists;
  },

  // Get table row count
  async getRowCount(tableName) {
    // Validate table name to prevent SQL injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new Error('Invalid table name');
    }
    
    const result = await query(`SELECT COUNT(*) as count FROM ${tableName}`);
    return parseInt(result.rows[0].count);
  },

  // Transaction helper
  async withTransaction(callback) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Validate user input for database operations
  validateUser(userData) {
    const errors = [];
    
    if (!userData.username || userData.username.length < 3 || userData.username.length > 20) {
      errors.push('Username must be 3-20 characters');
    }
    
    if (!userData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push('Valid email is required');
    }
    
    if (!userData.full_name || userData.full_name.length < 1 || userData.full_name.length > 100) {
      errors.push('Full name must be 1-100 characters');
    }
    
    if (!userData.gender || !['male', 'female', 'other', 'prefer_not'].includes(userData.gender)) {
      errors.push('Valid gender is required');
    }
    
    return errors;
  },

  // Sanitize user data for safe database insertion
  sanitizeUser(userData) {
    return {
      username: userData.username?.trim().toLowerCase(),
      email: userData.email?.trim().toLowerCase(),
      full_name: userData.full_name?.trim(),
      gender: userData.gender?.trim().toLowerCase(),
      native_language: userData.native_language?.trim().toLowerCase() || 'en'
    };
  }
};

// Pagination helper
const pagination = {
  // Calculate offset and limit for pagination
  getOffsetLimit(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    return { offset, limit };
  },

  // Get paginated results with metadata
  async paginate(baseQuery, countQuery, params, page = 1, limit = 20) {
    const { offset, limit: actualLimit } = this.getOffsetLimit(page, limit);
    
    // Get total count
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Get paginated data
    const dataQuery = `${baseQuery} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const dataResult = await query(dataQuery, [...params, actualLimit, offset]);
    
    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit: actualLimit,
        total,
        pages: Math.ceil(total / actualLimit),
        hasNext: page < Math.ceil(total / actualLimit),
        hasPrev: page > 1
      }
    };
  }
};

module.exports = {
  userUtils,
  dbUtils,
  pagination
};