/*
This module tracks login attempts to prevent brute-force attacks.
It records attempts, checks for lockouts, and cleans up old attempts.
Mostly relies on database.js.
*/

const { createLoginAttempts, getLockoutInfo, deleteLockoutAttempts } = require('../middleware/database');

// Configuration
const MAX_ATTEMPTS = 5;           // Maximum failed attempts allowed
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

// Records a login attempt
function recordAttempt(ip, username, success) {
    createLoginAttempts(ip, username, success);
    console.log(`Login attempt recorded: ${username} from ${ip} - ${success ? 'SUCCESS' : 'FAILED'}`);
}


// Checks if a username+IP combination is currently locked out
function checkLockout(ipAddress, username) {
    const cutoffTime = Date.now() - LOCKOUT_DURATION;
    const result = getLockoutInfo(ipAddress, username, cutoffTime);

    // If attempts exceed max, user is locked out
    if (result.count >= MAX_ATTEMPTS) {
        // Calculate remaining lockout time
        const lastAttempt = new Date(result.last_attempt).getTime();
        const lockoutEnds = lastAttempt + LOCKOUT_DURATION;
        const remainingTime = Math.max(0, lockoutEnds - Date.now());

        return {
            locked: true,
            remainingTime: remainingTime,
            attempts: result.count
        };
    }

    return {
        locked: false,
        remainingTime: 0,
        attempts: result.count
    };
}

/*
    Clears old login attempts (cleanup function)
    Removes attempts older than the lockout duration
*/
// Returns number of deleted records
function cleanupOldAttempts() {
    const cutoffTime = Date.now() - LOCKOUT_DURATION;
    const result = deleteLockoutAttempts(cutoffTime);
    return result.changes;
}

// Clean up old attempts every hour
setInterval(() => {
    const deleted = cleanupOldAttempts();
    if (deleted > 0) {
    console.log(`Cleaned up ${deleted} old login attempt(s)`);
    }
}, 60 * 60 * 1000);

// Helper function to get client IP
function getClientIP(req) {
    return req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
}

// Helper function to format remaining lockout time
function formatRemainingTime(milliseconds) {
    const minutes = Math.ceil(milliseconds / 1000 / 60);
    return minutes;
}

// Get current attempt status for display purposes
function getAttemptStatus(ipAddress, username) {
    const cutoffTime = Date.now() - LOCKOUT_DURATION;
    const result = getLockoutInfo(ipAddress, username, cutoffTime);
    
    const remainingAttempts = Math.max(0, MAX_ATTEMPTS - result.count);
    
    return {
        currentAttempts: result.count,
        maxAttempts: MAX_ATTEMPTS,
        remainingAttempts: remainingAttempts,
        locked: result.count >= MAX_ATTEMPTS
    };
}

module.exports = {
    recordAttempt,
    checkLockout,
    cleanupOldAttempts,
    getClientIP,
    formatRemainingTime,
    getAttemptStatus
};
