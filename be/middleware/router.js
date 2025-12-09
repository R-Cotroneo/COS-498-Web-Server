const express = require('express');
const router = express.Router();
const { 
    createUser, 
    getUserByUsername, 
    updateLoginTime,
    createSession,
    deleteSession,
    updateUsername,
    updateSessionUsername,
    updateDisplayName,
    updateEmail
} = require('../middleware/database');
const { 
    hashPassword,
    validateEmail,
    validatePassword,
    validateDisplayName,
    verifyPassword,
} = require('../middleware/pass-utils');
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
    const inDataUser = getUserByUsername(username);
    
    if (username === inDataUser?.username) {
        return res.render("register", { 
            error: "Username is already taken.", 
            username, 
            email, 
            display_name 
        });
    }

    // Validate password
    const passValidation = validatePassword(password);
    if (!passValidation.isValid) {
        return res.render("register", { 
            error: passValidation.errors.join(' '), 
            username, 
            email, 
            display_name 
        });
    }
    
    // This might not be necessary due to html having a built-in email verifier
    // We'll call this extra security
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
        return res.render("register", { 
            error: emailValidation.error, 
            username, 
            email, 
            display_name 
        });
    }
    
    // Validate display name
    const displayNameValidation = validateDisplayName(display_name, username);
    if (!displayNameValidation.isValid) {
        return res.render("register", { 
            error: displayNameValidation.error, 
            username, 
            email, 
            display_name 
        });
    }
    
    try {
        // Hash the password
        const password_hash = await hashPassword(password);
        
        // Create user with hashed password
        createUser(username, password_hash, email, display_name);
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
            req.session.display_name = user.display_name;
            req.session.isLoggedIn = true;
            
            // Create session in database
            createSession({
                sessionId: req.sessionID,
                username: username
            });
            
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
    // Delete session from database
    if (req.sessionID) {
        deleteSession(req.sessionID);
    }
    
    req.session.destroy((err) => {
        if (err) {
            console.log('Error destroying session:', err);
        }
        res.redirect('/');
    });
});

// User Profile route
router.get("/profile", (req, res) => {
    if (!req.session || !req.session.isLoggedIn) {
        return res.redirect("/login");
    }
    const user = getUserByUsername(req.session.username);
    res.render("profile", { user });
});

router.post("/profile/update-username", (req, res) => {
    const oldUsername = req.session.username;
    const newUsername = req.body.username; // Fixed: changed from new_username to username
    
    try {
        // Update username in database
        updateUsername(oldUsername, newUsername);
        
        // Update session in database
        updateSessionUsername(req.sessionID, newUsername);
        
        // Update session username in memory
        req.session.username = newUsername;
        
        console.log(`Username updated from ${oldUsername} to ${newUsername}`);
        res.redirect("/profile");
    } catch (error) {
        console.error("Error updating username:", error);
        res.redirect("/profile?error=update_failed");
    }
});

router.post("/profile/update-display-name", (req, res) => {
    const username = req.session.username;
    const newDisplayName = req.body.display_name;

    try {
        // Update display name in database
        updateDisplayName(username, newDisplayName);
        
        console.log(`Display name updated for ${username} to ${newDisplayName}`);
        res.redirect("/profile");
    } catch (error) {
        console.error("Error updating display name:", error);
        res.redirect("/profile?error=update_failed");
    }
});

router.post("/profile/update-email", (req, res) => {
    const username = req.session.username;
    const newEmail = req.body.email;

    try {
        // Update email in database
        updateEmail(username, newEmail);
        
        console.log(`Email updated for ${username} to ${newEmail}`);
        res.redirect("/profile");
    } catch (error) {
        console.error("Error updating email:", error);
        res.redirect("/profile?error=update_failed");
    }
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
