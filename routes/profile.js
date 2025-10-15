/**
 * PROFILE MANAGEMENT API
 * Handles profile picture upload, bio updates, and user preferences
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const { getDb } = require('../database/connection');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../public/uploads/profiles');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: userId-timestamp.ext
        const userId = req.session.userId;
        const ext = path.extname(file.originalname);
        const filename = `${userId}-${Date.now()}${ext}`;
        cb(null, filename);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    },
    fileFilter: (req, file, cb) => {
        // Only allow image files
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimeType = allowedTypes.test(file.mimetype);

        if (ext && mimeType) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
        }
    }
});

// Upload profile picture
router.post('/picture', requireAuth, upload.single('profile_picture'), async (req, res) => {
    try {
        const userId = req.session.userId;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const db = getDb();
        const pictureUrl = `/uploads/profiles/${req.file.filename}`;

        // Delete old profile picture if exists
        try {
            const oldPicResult = await db.query(
                'SELECT profile_picture_url FROM users WHERE id = $1',
                [userId]
            );

            if (oldPicResult.rows[0]?.profile_picture_url) {
                const oldPath = path.join(__dirname, '../public', oldPicResult.rows[0].profile_picture_url);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
        } catch (deleteError) {
            console.log('⚠️ Could not delete old profile picture:', deleteError.message);
        }

        // Update database
        await db.query(
            'UPDATE users SET profile_picture_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [pictureUrl, userId]
        );

        console.log(`✅ Profile picture updated for user ${userId}: ${pictureUrl}`);

        res.json({
            success: true,
            pictureUrl: pictureUrl,
            message: 'Profile picture updated successfully'
        });

    } catch (error) {
        console.error('❌ Profile picture upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload profile picture'
        });
    }
});

// Update bio
router.put('/bio', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { bio } = req.body;

        if (bio && bio.length > 500) {
            return res.status(400).json({
                success: false,
                error: 'Bio must be 500 characters or less'
            });
        }

        const db = getDb();
        await db.query(
            'UPDATE users SET bio = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [bio || null, userId]
        );

        console.log(`✅ Bio updated for user ${userId}`);

        res.json({
            success: true,
            bio: bio,
            message: 'Bio updated successfully'
        });

    } catch (error) {
        console.error('❌ Bio update error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update bio'
        });
    }
});

// Update notification preferences
router.put('/preferences/notifications', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const preferences = req.body;

        const db = getDb();
        await db.query(
            'UPDATE users SET notification_preferences = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [JSON.stringify(preferences), userId]
        );

        console.log(`✅ Notification preferences updated for user ${userId}`);

        res.json({
            success: true,
            preferences: preferences,
            message: 'Notification preferences updated'
        });

    } catch (error) {
        console.error('❌ Preferences update error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update preferences'
        });
    }
});

// Update privacy settings
router.put('/preferences/privacy', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const settings = req.body;

        const db = getDb();
        await db.query(
            'UPDATE users SET privacy_settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [JSON.stringify(settings), userId]
        );

        console.log(`✅ Privacy settings updated for user ${userId}`);

        res.json({
            success: true,
            settings: settings,
            message: 'Privacy settings updated'
        });

    } catch (error) {
        console.error('❌ Privacy settings update error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update privacy settings'
        });
    }
});

// Get user profile (including picture, bio, preferences)
router.get('/me', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const db = getDb();

        const result = await db.query(
            `SELECT
                id, username, email, full_name, gender, native_language,
                profile_picture_url, bio,
                notification_preferences, privacy_settings,
                is_verified, created_at
            FROM users
            WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            profile: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile'
        });
    }
});

module.exports = router;
