const express = require('express');
const session = require('express-session');
const router = express.Router();
const path = require('path');
const { createUser, getUserByUsername } = require('../middleware/database');
const { hashPassword, validatePassword, verifyPassword } = require('../middleware/pass-utils');

// Home route
router.get("/", (req, res) => {
    res.render("home");
});

// Register route
router.get("/register", (req, res) => {
    res.render("register");
});

router.post("/register", async (req, res) => {
    const { username, password, email, display_name } = req.body;
    
    // Validate password
    const validation = validatePassword(password);
    if (!validation.isValid) {
        return res.render("register", { 
            error: validation.errors.join(' '), 
            username, 
            email, 
            display_name 
        });
    }
    
    try {
        // Hash the password
        const password_hash = await hashPassword(password);
        
        // Create user with hashed password
        const result = createUser(username, password_hash, email, display_name);
        console.log(`User registered successfully: ${username} (ID: ${result.lastInsertRowid})`);
        res.redirect("/login");
    } catch (error) {
        console.error("Registration error:", error);
    }
});

// Login route
router.get("/login", (req, res) => {
    res.render("login");
});

router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = getUserByUsername(username);
        
        if (!user) {
            return res.render("login", { 
                error: "Invalid username or password", 
                username 
            });
        }

        const isValidPassword = await verifyPassword(user.password_hash, password);
        
        if (isValidPassword) {
            req.session.username = username;
            req.session.userId = user.id;
            req.session.isLoggedIn = true;
            console.log(`User ${username} logged in successfully`);
            res.redirect("/");
        } else {
            res.render("login", { 
                error: "Invalid username or password", 
                username 
            });
        }
    } catch (error) {
        console.error("Login error:", error);
        res.render("login", { 
            error: "Login failed. Please try again.", 
            username 
        });
    }
});

// Logout route
router.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log('Error destroying session:', err);
        }
        res.redirect('/');
    });
});

// Comments route
router.get("/comments", (req, res) => {
    res.render("comments");
});

// New Comment route
router.get("/comment/new", (req, res) => {
    res.render("new-comment");
});

module.exports = router;
