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

module.exports = { createUser, getUserByUsername };