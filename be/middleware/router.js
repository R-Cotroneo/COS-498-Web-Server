const express = require('express');
const session = require('express-session');
const router = express.Router();
const path = require('path');
const { 
    createUser, 
    getUserByUsername, 
    updateLoginTime,
    createSession,
    deleteSession
} = require('../middleware/database');
const { hashPassword, validatePassword, verifyPassword } = require('../middleware/pass-utils');
const loginTracker = require('../middleware/loginTracker');

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
    const clientIP = loginTracker.getClientIP(req);
    const username = req.query.username || '';
    
    // Get current attempt status if username is provided
    let attemptStatus = null;
    if (username) {
        attemptStatus = loginTracker.getAttemptStatus(clientIP, username);
    }
    
    res.render("login", { username, attemptStatus });
});

router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const clientIP = loginTracker.getClientIP(req);

    // Clean up old login attempts automatically
    loginTracker.cleanupOldAttempts();

    // Check if user is locked out
    const lockoutStatus = loginTracker.checkLockout(clientIP, username);
    if (lockoutStatus.locked) {
        const timeLeft = loginTracker.formatRemainingTime(lockoutStatus.remainingTime);
        const attemptStatus = loginTracker.getAttemptStatus(clientIP, username);
        return res.render("login", { 
            error: `Account locked due to too many failed attempts. Try again in ${timeLeft} minutes.`
        });
    }

    try {
        const user = getUserByUsername(username);
        
        if (!user) {
            // Record failed attempt for invalid username
            loginTracker.recordAttempt(clientIP, username, false);
            const attemptStatus = loginTracker.getAttemptStatus(clientIP, username);
            return res.render("login", { 
                error: "Invalid username or password", 
                username,
                attemptStatus
            });
        }

        const isValidPassword = await verifyPassword(user.password_hash, password);
        
        // Always record the login attempt
        loginTracker.recordAttempt(clientIP, username, isValidPassword);
        
        if (isValidPassword) {
            // Update user's last login time
            updateLoginTime(user.id);
            
            // Set session
            req.session.username = username;
            req.session.userId = user.id;
            req.session.isLoggedIn = true;
            
            console.log(`User ${username} logged in successfully from ${clientIP}`);
            res.redirect("/");
        } else {
            console.log(`Failed login attempt for ${username} from ${clientIP}`);
            const attemptStatus = loginTracker.getAttemptStatus(clientIP, username);
            res.render("login", { 
                error: "Invalid username or password", 
                username,
                attemptStatus
            });
        }

        req.session.userId = user.id;
        req.session.username = username;
        createSession(req.session);

    } catch (error) {
        console.error("Login error:", error);
        // Record as failed attempt on system error
        loginTracker.recordAttempt(clientIP, username, false);
        const attemptStatus = loginTracker.getAttemptStatus(clientIP, username);
        res.render("login", { 
            error: "Login failed. Please try again.", 
            username,
            attemptStatus
        });
    }
});

// Logout route
router.post("/logout", (req, res) => {
    deleteSession(req.session);
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
