const fs = require('fs');
const path = require('path');

// Create a simple ICO file data
// This is a minimal 16x16 ICO file with a blue 'M' favicon
const icoData = Buffer.from([
    // ICO Header
    0x00, 0x00, // Reserved
    0x01, 0x00, // Type: ICO
    0x01, 0x00, // Number of images
    
    // Image Directory Entry
    0x10, // Width: 16
    0x10, // Height: 16
    0x00, // Color palette: 0 (no palette)
    0x00, // Reserved
    0x01, 0x00, // Color planes: 1
    0x20, 0x00, // Bits per pixel: 32
    0x84, 0x00, 0x00, 0x00, // Image data size: 132 bytes
    0x16, 0x00, 0x00, 0x00, // Image data offset: 22
    
    // BMP Header
    0x28, 0x00, 0x00, 0x00, // Header size: 40
    0x10, 0x00, 0x00, 0x00, // Width: 16
    0x20, 0x00, 0x00, 0x00, // Height: 32 (16*2 for ICO)
    0x01, 0x00, // Planes: 1
    0x20, 0x00, // Bits per pixel: 32
    0x00, 0x00, 0x00, 0x00, // Compression: 0
    0x00, 0x00, 0x00, 0x00, // Image size: 0
    0x00, 0x00, 0x00, 0x00, // X pixels per meter: 0
    0x00, 0x00, 0x00, 0x00, // Y pixels per meter: 0
    0x00, 0x00, 0x00, 0x00, // Colors in palette: 0
    0x00, 0x00, 0x00, 0x00, // Important colors: 0
    
    // Pixel data (16x16 RGBA, bottom-up)
    // This creates a simple blue circle with white 'M'
    // Row 16 (top)
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    // Add more rows with blue background and white M pattern...
]);

// Create a simpler approach - just create a PNG and rename it
const createSimpleFavicon = () => {
    // Create SVG content for favicon
    const svgContent = \`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" fill="#007bff" stroke="#fff" stroke-width="2"/>
        <text x="16" y="22" font-family="Arial, sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="white">M</text>
    </svg>\`;
    
    // Save as favicon.svg (modern browsers support this)
    fs.writeFileSync(path.join(__dirname, 'public', 'favicon.svg'), svgContent);
    
    // Also create a simple HTML with embedded icon for fallback
    const htmlWithIcon = \`<!DOCTYPE html>
<html>
<head>
    <title>Mivton</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="alternate icon" href="/favicon.ico">
    <link rel="mask-icon" href="/favicon.svg" color="#007bff">
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .icon { width: 64px; height: 64px; margin: 20px auto; }
    </style>
</head>
<body>
    <div class="icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="#007bff" stroke="#fff" stroke-width="4"/>
            <text x="32" y="44" font-family="Arial, sans-serif" font-size="36" font-weight="bold" text-anchor="middle" fill="white">M</text>
        </svg>
    </div>
    <h1>Mivton Favicon Created</h1>
    <p>The favicon has been generated successfully!</p>
</body>
</html>\`;
    
    fs.writeFileSync(path.join(__dirname, 'favicon-created.html'), htmlWithIcon);
    
    console.log('✅ Favicon files created successfully!');
    console.log('   - favicon.svg (modern browsers)');
    console.log('   - favicon-created.html (preview)');
    console.log('');
    console.log('📝 To complete the favicon setup:');
    console.log('   1. Add favicon links to HTML head sections');
    console.log('   2. Deploy the files to production');
    console.log('   3. The 404 error will be resolved');
};

createSimpleFavicon();
