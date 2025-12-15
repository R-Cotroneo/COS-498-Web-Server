/*
This module handles password reset email functionality.
It generates secure tokens, validates them, and sends reset emails.
It relies on database.js for token storage and retrieval.
*/

const crypto = require('crypto');
const { sendEmail } = require('../config/email');
const { createPasswordResetToken, getPasswordResetToken } = require('./database');

// Ensure environment variables are set
if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error("GMAIL_USER and GMAIL_APP_PASSWORD must be set in environment variables.");
    process.exit(1);
}

// Generate a secure random token
function generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Token expiration time in milliseconds
function tokenExpirationTime(hours) {
    return Date.now() + hours * 60 * 60 * 1000;
}

// Save the reset token to the database
function saveResetToken(email) {
    const token = generateResetToken();
    const expiration = tokenExpirationTime(1); // Token valid for 1 hour
    
    try {
        createPasswordResetToken(email, token, expiration);
        console.log(`Password reset token created successfully for ${email}`);
        return token;
    }
    catch (error) {
        console.error("Error saving password reset token:", error);
        return null;
    }
}

// Validate the reset token
function validateResetToken(email, token) {
    try {
        // First, clean up any expired tokens
        const { cleanupExpiredPasswordResetTokens } = require('./database');
        cleanupExpiredPasswordResetTokens();
        
        const tokenData = getPasswordResetToken(token);
        
        // Check if token exists and is valid
        if (!tokenData) {
            return { isValid: false, error: "Invalid token." };
        }
        
        // Check if token matches email and is not expired
        if (tokenData.email !== email) {
            return { isValid: false, error: "Token does not match email." };
        }
        
        // Check expiration
        if (Date.now() > tokenData.expires_at) {
            // Token expired - delete it and return error
            const { deletePasswordResetToken } = require('./database');
            deletePasswordResetToken(token);
            return { isValid: false, error: "Token has expired." };
        }
        
        return { isValid: true, email: tokenData.email };
    } catch (error) {
        console.error("Error validating reset token:", error);
        return { isValid: false, error: "Token validation failed." };
    }
}

// Send password reset email
async function sendPasswordResetEmail(toEmail, resetLink) {
    const subject = "Password Reset Request";
    const text = `You requested a password reset. Click the link below to reset your password:\n\n${resetLink}\n\nIf you did not request this, please ignore this email.`;

    const result = await sendEmail(toEmail, subject, text);
    return result;
}

module.exports = {
    sendPasswordResetEmail,
    saveResetToken,
    validateResetToken
};
