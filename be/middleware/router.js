/*
This is the big one.
The main router that handles all routes for the web server.
It uses Express.js and connects various middleware and database functions.
*/

const express = require('express');
const router = express.Router();
const database = require('../middleware/database');
const passUtils = require('../middleware/pass-utils');
const { renderMarkdown } = require('../middleware/markdown');
const loginTracker = require('../middleware/loginTracker');
const passwordResetEmail = require('../middleware/passwordResetEmail');

// Home route
router.get("/", (req, res) => {
    res.render("home");
});

/* Region: Register Routes */
// Registration page route
router.get("/register", (req, res) => {
    res.render("register");
});

// Registration form submission route
router.post("/register", async (req, res) => {
    const { username, password, email, display_name } = req.body;
    const inDataUser = database.getUserByUsername(username);
    
    if (username === inDataUser?.username) {
        return res.render("register", { 
            error: "Username is already taken.", 
            username, 
            email, 
            display_name 
        });
    }

    // Validate password
    const passValidation = passUtils.validatePassword(password);
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
    const emailValidation = passUtils.validateEmail(email);
    if (!emailValidation.isValid) {
        return res.render("register", { 
            error: emailValidation.error, 
            username, 
            email, 
            display_name 
        });
    }
    
    // Validate display name
    const displayNameValidation = passUtils.validateDisplayName(display_name, username);
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
        const password_hash = await passUtils.hashPassword(password);
        
        // Create user with hashed password
        database.createUser(username, password_hash, email, display_name);
        res.redirect("/login");
    } catch (error) {
        console.error("Registration error:", error);
    }
});
/* End Region: Register Routes */

/* Region: Login/Logout Routes */
// Login page route
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

// Login form submission route
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

    // Login validation
    try {
        const user = database.getUserByUsername(username);
        
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

        const isValidPassword = await passUtils.verifyPassword(user.password_hash, password);
        
        // Always record the login attempt
        loginTracker.recordAttempt(clientIP, username, isValidPassword);
        
        if (isValidPassword) {
            // Update user's last login time
            database.updateLoginTime(user.id);
            
            // Set session
            req.session.username = username;
            req.session.userId = user.id;
            req.session.display_name = user.display_name;
            req.session.isLoggedIn = true;
            
            // Create session in database
            database.createSession({
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
        database.deleteSession(req.sessionID);
    }
    
    req.session.destroy((err) => {
        if (err) {
            console.log('Error destroying session:', err);
        }
        res.redirect('/');
    });
});
/* End Region: Login/Logout Routes */

/* Region: Reset Password Routes */
// Reset Password route
router.get("/reset-password-email", (req, res) => {
    res.render("reset-password-email");
});

// Handle reset password email submission
router.post("/reset-password-email", async (req, res) => {
    const { email } = req.body;
    
    // Clean up expired tokens first
    database.cleanupExpiredPasswordResetTokens();
    
    const user = database.getUserByEmail(email);
    
    if (!user) {
        return res.render("reset-password-email", { error: "Email not found." });
    }
    
    // Generate and save reset token
    const token = passwordResetEmail.saveResetToken(email);
    if (!token) {
        return res.render("reset-password-email", { error: "Failed to generate reset token. Please try again." });
    }
    
    // Creates the reset link
    const resetLink = `https://final.raistcotroneo.com/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
    
    // Send the reset email
    try {
        await passwordResetEmail.sendPasswordResetEmail(user.email, resetLink);
        res.render("reset-password-email", { 
            success: "Password reset email sent. Check your inbox and click the link to reset your password." 
        });
    } catch (error) {
        console.error("Error sending reset email:", error);
        res.render("reset-password-email", { error: "Failed to send reset email. Please try again." });
    }
});

// GET route for reset password page (from email link)
router.get("/reset-password", (req, res) => {
    const { email, token } = req.query;
    
    if (!email || !token) {
        return res.render("reset-password", { error: "Invalid reset link." });
    }
    
    // Validate token
    const tokenValidation = passwordResetEmail.validateResetToken(email, token);
    if (!tokenValidation.isValid) {
        return res.render("reset-password", { error: tokenValidation.error });
    }
    
    // Show reset form with hidden fields for email and token
    res.render("reset-password", { email, token });
});

router.post("/reset-password", async (req, res) => {
    const { email, token, new_password } = req.body;
    
    if (!email || !token || !new_password) {
        return res.render("reset-password", { error: "Missing required fields.", email, token });
    }
    
    // Validate new password
    const passValidation = passUtils.validatePassword(new_password);
    if (!passValidation.isValid) {
        return res.render("reset-password", { 
            error: passValidation.errors.join(' '),
            email,
            token
        });
    }
    
    // Update password in the database (including the hash)
    try {
        // Hash the new password
        const newPasswordHash = await passUtils.hashPassword(new_password);
        
        // Get user by email to get username
        const user = database.getUserByEmail(email);
        if (!user) {
            return res.render("reset-password", { error: "User not found.", email, token });
        }
        
        // Update user's password in database
        database.updatePasswordHash(user.username, newPasswordHash);
        
        // Delete the used token from database
        database.deletePasswordResetToken(token);
        
        console.log(`Password reset successfully for user: ${user.username}`);
        res.render("login", { 
            success: "Password reset successfully. You can now log in with your new password.",
            username: user.username
        });
    } catch (error) {
        console.error("Password reset error:", error);
        res.render("reset-password", { error: "Failed to reset password. Please try again.", email, token });
    }
});
/* End Region: Reset Password Routes */

/* Region: User Profile Routes */
// User Profile page route
router.get("/profile", (req, res) => {
    if (!req.session || !req.session.isLoggedIn) {
        return res.redirect("/login");
    }
    const user = database.getUserByUsername(req.session.username);
    
    // Handle error query parameter
    let error = null;
    if (req.query.error) {
        switch (req.query.error) {
            case 'username_taken':
                error = "Username is already taken.";
                break;
            case 'update_failed':
                error = "Update failed. Please try again.";
                break;
            default:
                // For URL-encoded error messages from validation
                error = decodeURIComponent(req.query.error);
                break;
        }
    }
    
    res.render("profile", { user, error });
});

// Update Username route
router.post("/profile/update-username", (req, res) => {
    const oldUsername = req.session.username;
    const newUsername = req.body.username; // Fixed: changed from new_username to username
    
    try {
        // Validate new username with current username for duplicate checking
        const usernameValidation = passUtils.validateUsername(newUsername, oldUsername);
        if (!usernameValidation.isValid) {
            return res.redirect(`/profile?error=${encodeURIComponent(usernameValidation.error)}`);
        }

        // Update username in database
        database.updateUsername(oldUsername, newUsername);
        
        // Update session in database
        database.updateSessionUsername(req.sessionID, newUsername);
        
        // Update session username in memory
        req.session.username = newUsername;
        
        console.log(`Username updated from ${oldUsername} to ${newUsername}`);
        res.redirect("/profile");
    } catch (error) {
        console.error("Error updating username:", error);
        res.redirect("/profile?error=update_failed");
    }
});

// Update Display Name route
router.post("/profile/update-display-name", (req, res) => {
    const username = req.session.username;
    const newDisplayName = req.body.display_name;

    try {
        // Get current user data to pass current display name for validation
        const user = database.getUserByUsername(username);
        
        // Validate new display name
        const displayNameValidation = passUtils.validateDisplayName(newDisplayName, username, user.display_name);
        if (!displayNameValidation.isValid) {
            return res.redirect(`/profile?error=${encodeURIComponent(displayNameValidation.error)}`);
        }
        
        // Update display name in database
        database.updateDisplayName(username, newDisplayName);
        
        // Update session display name to reflect changes immediately
        req.session.display_name = newDisplayName;
        
        console.log(`Display name updated for ${username} to ${newDisplayName}`);
        res.redirect("/profile");
    } catch (error) {
        console.error("Error updating display name:", error);
        res.redirect("/profile?error=update_failed");
    }
});

// Update Email route
router.post("/profile/update-email", (req, res) => {
    const username = req.session.username;
    const newEmail = req.body.email;

    try {
        // Get current user data to pass current email for validation
        const user = database.getUserByUsername(username);
        
        // Validate new email
        const emailValidation = passUtils.validateEmail(newEmail, user.email);
        if (!emailValidation.isValid) {
            return res.redirect(`/profile?error=${encodeURIComponent(emailValidation.error)}`);
        }

        // Update email in database
        database.updateEmail(username, newEmail);
        
        console.log(`Email updated for ${username} to ${newEmail}`);
        res.redirect("/profile");
    } catch (error) {
        console.error("Error updating email:", error);
        res.redirect("/profile?error=update_failed");
    }
});

// Update Name Color route
router.post("/profile/update-name-color", (req, res) => {
    const username = req.session.username;
    const newNameColor = req.body.name_color;

    try {
        // Update name color in database
        database.updateNameColor(username, newNameColor);
        
        console.log(`Name color updated for ${username} to ${newNameColor}`);
        res.redirect("/profile");
    } catch (error) {
        console.error("Error updating name color:", error);
        res.redirect("/profile?error=update_failed");
    }
});
/* End Region: User Profile Routes */

/* Region: Comments Routes */
// Comments route
router.get("/comments", (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const comments = database.getCommentsWithPagination(limit, offset);
    const totalComments = database.getTotalCommentsCount();
    const totalPages = Math.ceil(totalComments / limit);
    
    // Generate page range for dropdown
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
        pages.push({
            value: i,
            selected: i === page
        });
    }
    
    res.render("comments", {
        comments: comments,
        pagination: {
            currentPage: page,
            totalPages: totalPages,
            totalComments: totalComments,
            hasNext: page < totalPages,
            hasPrev: page > 1,
            nextPage: page + 1,
            prevPage: page - 1,
            limit: limit,
            pageOptions: pages
        }
    });
});

// New Comment route
router.get("/comment/new", (req, res) => {
    res.render("new-comment");
});

// Handle new comment submission
router.post('/comment', (req, res) => {
    if (!req.session || !req.session.isLoggedIn) {
        return res.status(401).render('login', {
            title: 'Login',
            error: 'You must be logged in to post a comment.'
        });
    }
    const author = req.session.username;
    const text = req.body.text;
    
    // Render markdown to HTML
    const renderedHtml = renderMarkdown(text);
    
    const createdAt = new Date();
    database.createComment(author, text, renderedHtml, createdAt);
    res.redirect('/comments');
});

// Pagination route
router.post('/comments/page', (req, res) => {
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    res.redirect(`/comments?page=${page}&limit=${limit}`);
});

// Jump-to-page router
router.post('/comments/jump', (req, res) => {
    const page = parseInt(req.body.jumpPage) || 1;
    const limit = parseInt(req.body.limit) || 10;
    res.redirect(`/comments?page=${page}&limit=${limit}`);
});
/* End Region: Comments Routes */

// Socket Chat page route
router.get("/chat", (req, res) => {
    if (!req.session || !req.session.isLoggedIn) {
        return res.redirect("/login");
    }
    res.render("chat", { display_name: req.session.display_name });
});

module.exports = router;
