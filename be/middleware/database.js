const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db', 'finalapp.db');
const db = new Database(dbPath);

function createUser(username, password_hash, email, display_name) {
    try {
        const insert = db.prepare('INSERT INTO users (username, password_hash, email, display_name) VALUES (?, ?, ?, ?)');
        const result = insert.run(username, password_hash, email, display_name);
        console.log(`User created successfully with ID: ${result.lastInsertRowid}`);
    } catch (error) {
        console.error("Error creating user:", error);
    }
}

function getUserByUsername(username) {
    try {
        const getUser = db.prepare('SELECT * FROM users WHERE username = ?');
        return getUser.get(username);
    } catch (error) {
        console.error("Error retrieving user:", error);
        return null;
    }
}

function getUserCountByEmail(email) {
    try {
        const result = db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?').get(email);
        return result.count;
    } catch (error) {
        console.error("Error retrieving user by email:", error);
        return 0;
    }
}

function getUserCountByDisplayName(display_name) {
    try {
        const result = db.prepare('SELECT COUNT(*) as count FROM users WHERE display_name = ?').get(display_name);
        return result.count;
    } catch (error) {
        console.error("Error retrieving user by display name:", error);
        return 0;
    }
}

function createLoginAttempts(ip, username, success) {
    const insert = db.prepare('INSERT INTO login_attempts (ip_address, username, success) VALUES (?, ?, ?)');
    insert.run(ip, username, success ? 1 : 0);
}

function getLockoutInfo(ipAddress, username, cutoffTime) {
    const stmt = db.prepare(`
        SELECT COUNT(*) as count, MAX(attempt_time) as last_attempt
        FROM login_attempts
        WHERE ip_address = ? 
        AND username = ?
        AND success = 0
        AND datetime(attempt_time) > datetime(?, 'unixepoch')
    `);
  
    const result = stmt.get(ipAddress, username, cutoffTime / 1000);
    return result;
}

function deleteLockoutAttempts(cutoffTime) {
    // 'unixepoch' interprets the number as seconds since Unix epoch (Jan 1, 1970)
    const stmt = db.prepare(`
        DELETE FROM login_attempts
        WHERE datetime(attempt_time) < datetime(?, 'unixepoch')
    `);

    const result = stmt.run(cutoffTime / 1000);
    return result;    
}

function updateLoginTime(id) {
    const stmt = db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(id);
}

function createSession(sessionData) {
    const insert = db.prepare('INSERT INTO sessions (session_id, user_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
    insert.run(sessionData.id, sessionData.userId);
}

function deleteSession(sessionData) {
    const del = db.prepare('DELETE FROM sessions WHERE session_id = ?');
    del.run(sessionData.id);
}

module.exports = { 
    createUser,
    getUserByUsername,
    getUserCountByEmail,
    getUserCountByDisplayName,
    createLoginAttempts,
    getLockoutInfo,
    deleteLockoutAttempts,
    updateLoginTime,
    createSession,
    deleteSession
};
