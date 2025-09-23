const express = require('express');
const app = express();

// Test endpoint to verify the server is working
app.get('/test-search', async (req, res) => {
    try {
        // Test basic functionality
        res.json({
            success: true,
            message: 'Search API is working',
            timestamp: new Date().toISOString(),
            query: req.query
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.listen(3001, () => {
    console.log('Test server running on port 3001');
});
