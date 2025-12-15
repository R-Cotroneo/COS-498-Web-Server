const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db', 'finalapp.db');
const db = new Database(dbPath);

// Enable foreign key constraints (required for CASCADE operations)
db.pragma('foreign_keys = ON');

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
    const insert = db.prepare('INSERT OR REPLACE INTO sessions (session_id, username, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
    insert.run(sessionData.sessionId, sessionData.username);
}

function deleteSession(sessionId) {
    const del = db.prepare('DELETE FROM sessions WHERE session_id = ?');
    del.run(sessionId);
}

function updateUsername(username, newUsername) {
    try {
        const update = db.prepare('UPDATE users SET username = ? WHERE username = ?');
        update.run(newUsername, username);
    } catch (error) {
        console.error("Error updating username:", error);
    }
}

function updateSessionUsername(sessionId, newUsername) {
    try {
        const update = db.prepare('UPDATE sessions SET username = ? WHERE session_id = ?');
        update.run(newUsername, sessionId);
    } catch (error) {
        console.error("Error updating session username:", error);
    }
}

function updateDisplayName(username, newDisplayName) {
    try {
        const update = db.prepare('UPDATE users SET display_name = ? WHERE username = ?');
        update.run(newDisplayName, username);
    } catch (error) {
        console.error("Error updating display name:", error);
    }
}

function updateEmail(username, newEmail) {
    try {
        const update = db.prepare('UPDATE users SET email = ? WHERE username = ?');
        update.run(newEmail, username);
    } catch (error) {
        console.error("Error updating email:", error);
    }
}

function updateNameColor(username, newColor) {
    try {
        const update = db.prepare('UPDATE users SET name_color = ? WHERE username = ?');
        update.run(newColor, username);
    } catch (error) {
        console.error("Error updating name color:", error);
    }
}

function updatePasswordHash(username, newHash) {
    try {
        const update = db.prepare('UPDATE users SET password_hash = ? WHERE username = ?');
        update.run(newHash, username);
    } catch (error) {
        console.error("Error updating password hash:", error);
    }
}

function getUserByEmail(email) {
    try {
        const getUser = db.prepare('SELECT * FROM users WHERE email = ?');
        return getUser.get(email);
    } catch (error) {
        console.error("Error retrieving user by email:", error);
        return null;
    }
}

function createPasswordResetToken(email, token, expiration) {
    try {
        const insert = db.prepare('INSERT INTO password_reset (email, token, expires_at) VALUES (?, ?, ?)');
        insert.run(email, token, expiration);
    } catch (error) {
        console.error("Error creating password reset token:", error);
    }
}

function getPasswordResetToken(token) {
    try {
        const getToken = db.prepare('SELECT * FROM password_reset WHERE token = ?');
        return getToken.get(token);
    } catch (error) {
        console.error("Error retrieving password reset token:", error);
        return null;
    }
}

function deletePasswordResetToken(token) {
    try {
        const deleteToken = db.prepare('DELETE FROM password_reset WHERE token = ?');
        deleteToken.run(token);
    } catch (error) {
        console.error("Error deleting password reset token:", error);
    }
}

function cleanupExpiredPasswordResetTokens() {
    try {
        const now = Date.now();
        const deleteExpired = db.prepare('DELETE FROM password_reset WHERE expires_at < ?');
        const result = deleteExpired.run(now);
        if (result.changes > 0) {
            console.log(`Cleaned up ${result.changes} expired password reset token(s)`);
        }
        return result.changes;
    } catch (error) {
        console.error("Error cleaning up expired password reset tokens:", error);
        return 0;
    }
}

function saveChatMessage(username, display_name, message, name_color) {
    try {
        const insert = db.prepare('INSERT INTO chat_messages (username, display_name, message, name_color) VALUES (?, ?, ?, ?)');
        const result = insert.run(username, display_name, message, name_color);
        return result.lastInsertRowid;
    } catch (error) {
        console.error("Error saving chat message:", error);
        return null;
    }
}

function getChatMessages(limit = 50) {
    try {
        const getMessages = db.prepare(`
            SELECT username, display_name, message, name_color, created_at 
            FROM chat_messages 
            ORDER BY created_at DESC 
            LIMIT ?
        `);
        const messages = getMessages.all(limit);
        return messages.reverse(); // Return in chronological order
    } catch (error) {
        console.error("Error retrieving chat messages:", error);
        return [];
    }
}

function createComment(author, text, renderedHtml, createdAt) {
    try {
        const insert = db.prepare('INSERT INTO comments (author, comment, comment_html) VALUES (?, ?, ?)');
        const result = insert.run(author, text, renderedHtml);
        console.log(`Comment created successfully with ID: ${result.lastInsertRowid}`);
        return result.lastInsertRowid;
    } catch (error) {
        console.error("Error creating comment:", error);
        return null;
    }
}

function getCommentsWithPagination(limit = 10, offset = 0) {
    try {
        const getComments = db.prepare(`
            SELECT c.id, c.author, c.comment as text, c.comment_html as html, c.created_at as createdAt,
                   u.display_name, u.name_color
            FROM comments c
            LEFT JOIN users u ON c.author = u.username
            ORDER BY c.created_at DESC 
            LIMIT ? OFFSET ?
        `);
        return getComments.all(limit, offset);
    } catch (error) {
        console.error("Error retrieving comments:", error);
        return [];
    }
}

function getTotalCommentsCount() {
    try {
        const result = db.prepare('SELECT COUNT(*) as count FROM comments').get();
        return result.count;
    } catch (error) {
        console.error("Error counting comments:", error);
        return 0;
    }
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
    deleteSession,
    updateUsername,
    updateSessionUsername,
    updateDisplayName,
    updateEmail,
    updateNameColor,
    updatePasswordHash,
    getUserByEmail,
    createPasswordResetToken,
    getPasswordResetToken,
    deletePasswordResetToken,
    cleanupExpiredPasswordResetTokens,
    saveChatMessage,
    getChatMessages,
    createComment,
    getCommentsWithPagination,
    getTotalCommentsCount
};
