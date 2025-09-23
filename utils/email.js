const nodemailer = require('nodemailer');

// Create transporter using Hostinger SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === 'true' || true, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || 'info@mivton.com',
      pass: process.env.SMTP_PASS || 'Bacau@2012'
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Send welcome email
const sendWelcomeEmail = async (email, fullName) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: 'Mivton Team',
        address: process.env.SMTP_USER || 'info@mivton.com'
      },
      to: email,
      subject: '🚀 Welcome to Mivton - Your Multilingual Chat Journey Begins!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Mivton</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
              margin: 0;
              padding: 20px;
              color: #f1f5f9;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: rgba(30, 41, 59, 0.8);
              border-radius: 20px;
              padding: 40px;
              backdrop-filter: blur(10px);
              border: 1px solid rgba(99, 102, 241, 0.2);
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            }
            .logo {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo h1 {
              color: #6366f1;
              font-size: 42px;
              margin: 0;
              font-weight: bold;
              text-shadow: 0 0 20px rgba(99, 102, 241, 0.5);
            }
            .welcome-text {
              text-align: center;
              font-size: 24px;
              margin-bottom: 30px;
              background: linear-gradient(45deg, #6366f1, #8b5cf6, #06b6d4);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }
            .content {
              line-height: 1.6;
              font-size: 16px;
            }
            .features {
              background: rgba(99, 102, 241, 0.1);
              border-radius: 15px;
              padding: 25px;
              margin: 25px 0;
              border-left: 4px solid #6366f1;
            }
            .features h3 {
              color: #06b6d4;
              margin-top: 0;
            }
            .features ul {
              list-style: none;
              padding: 0;
            }
            .features li {
              margin: 10px 0;
              padding-left: 20px;
              position: relative;
            }
            .features li:before {
              content: "🚀";
              position: absolute;
              left: 0;
            }
            .cta-button {
              display: block;
              width: 200px;
              margin: 30px auto;
              padding: 15px 30px;
              background: linear-gradient(45deg, #6366f1, #8b5cf6);
              color: white;
              text-decoration: none;
              border-radius: 50px;
              text-align: center;
              font-weight: bold;
              transition: all 0.3s ease;
              box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid rgba(99, 102, 241, 0.2);
              color: #94a3b8;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <h1>MIVTON</h1>
            </div>
            
            <div class="welcome-text">
              Welcome aboard, ${fullName}! 🎉
            </div>
            
            <div class="content">
              <p>You've just joined the future of multilingual communication! Mivton is your gateway to connecting with friends across language barriers through real-time AI-powered translation.</p>
              
              <div class="features">
                <h3>What makes Mivton special?</h3>
                <ul>
                  <li>Real-time translation in 50+ languages</li>
                  <li>Futuristic, Gen Z-focused design</li>
                  <li>Friends-only private chat rooms</li>
                  <li>AI-powered communication</li>
                  <li>Seamless cross-language conversations</li>
                </ul>
              </div>
              
              <p>Your account is now active and ready to use. Start exploring Mivton and connect with friends in ways you never thought possible!</p>
              
              <a href="${process.env.APP_URL || 'https://www.mivton.com'}/dashboard.html" class="cta-button">
                Start Chatting →
              </a>
              
              <p>If you have any questions or need help getting started, our team is here to support you. Simply reply to this email or visit our help center.</p>
            </div>
            
            <div class="footer">
              <p>Welcome to the Mivton community! 🌍✨</p>
              <p>The Mivton Team<br>
              <a href="${process.env.APP_URL || 'https://www.mivton.com'}" style="color: #6366f1;">www.mivton.com</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to Mivton, ${fullName}!
        
        You've just joined the future of multilingual communication! Mivton is your gateway to connecting with friends across language barriers through real-time AI-powered translation.
        
        What makes Mivton special?
        • Real-time translation in 50+ languages
        • Futuristic, Gen Z-focused design  
        • Friends-only private chat rooms
        • AI-powered communication
        • Seamless cross-language conversations
        
        Your account is now active and ready to use. Start exploring Mivton and connect with friends in ways you never thought possible!
        
        Visit: ${process.env.APP_URL || 'https://www.mivton.com'}/dashboard.html
        
        Welcome to the Mivton community!
        The Mivton Team
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, fullName, resetToken) => {
  try {
    const transporter = createTransporter();
    const resetUrl = `${process.env.APP_URL || 'https://www.mivton.com'}/reset-password.html?token=${resetToken}`;
    
    const mailOptions = {
      from: {
        name: 'Mivton Team',
        address: process.env.SMTP_USER || 'info@mivton.com'
      },
      to: email,
      subject: '🔒 Reset Your Mivton Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; background: #0f172a; color: #f1f5f9; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: rgba(30, 41, 59, 0.8); border-radius: 20px; padding: 40px; }
            .logo h1 { color: #6366f1; text-align: center; font-size: 36px; margin-bottom: 30px; }
            .reset-button { display: block; width: 200px; margin: 30px auto; padding: 15px 30px; background: linear-gradient(45deg, #6366f1, #8b5cf6); color: white; text-decoration: none; border-radius: 50px; text-align: center; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo"><h1>MIVTON</h1></div>
            <h2>Password Reset Request</h2>
            <p>Hi ${fullName},</p>
            <p>We received a request to reset your Mivton password. Click the button below to create a new password:</p>
            <a href="${resetUrl}" class="reset-button">Reset Password</a>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this reset, please ignore this email.</p>
            <p>The Mivton Team</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Request
        
        Hi ${fullName},
        
        We received a request to reset your Mivton password. Visit this link to create a new password:
        ${resetUrl}
        
        This link will expire in 1 hour for security reasons.
        
        If you didn't request this reset, please ignore this email.
        
        The Mivton Team
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

// Test email configuration
const testEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email server connection successful');
    return true;
  } catch (error) {
    console.error('❌ Email server connection failed:', error);
    return false;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  testEmailConnection
};