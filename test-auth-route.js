// Test auth route
const express = require('express');
const bcrypt = require('bcrypt');
const { getDb, query } = require('./database/connection');

const app = express();
app.use(express.json());

// Simple login route
app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('🔧 Login attempt:', req.body);
        
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find user by email
        const userResult = await query(
            'SELECT id, username, email, password_hash, full_name, gender, native_language, is_blocked, is_admin, admin_level FROM users WHERE email = ?',
            [email.toLowerCase()]
        );
        
        console.log('📊 Query result:', userResult.rows.length);
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const user = userResult.rows[0];
        console.log('👤 User found:', user.username);
        
        // Check if user is blocked
        if (user.is_blocked) {
            return res.status(403).json({ error: 'Account has been blocked' });
        }
        
        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        console.log('🔑 Password match:', passwordMatch);
        
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Update last login
        await query(
            'UPDATE users SET last_login = datetime("now"), status = ? WHERE id = ?',
            ['online', user.id]
        );
        
        console.log('✅ Login successful!');
        
        res.json({
            success: true,
            message: 'Login successful!',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.full_name
            }
        });
        
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Test auth server running on port ${PORT}`);
    console.log(`🔗 Test URL: http://localhost:${PORT}/api/auth/login`);
});
