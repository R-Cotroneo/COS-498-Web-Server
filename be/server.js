const express = require('express');
const session = require('express-session');
const hbs = require('hbs');
const path = require('path');
const { cleanupExpiredPasswordResetTokens } = require('./middleware/database');
const app = express();
const PORT = process.env.PORT || 4610;
const router = require('./middleware/router');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(session({
    secret: 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

// Make user available to all templates
app.use((req, res, next) => {
    if (req.session && req.session.isLoggedIn) {
        res.locals.user = {
            username: req.session.username,
            display_name: req.session.display_name || req.session.username,
            isLoggedIn: true
        };
    } else {
        res.locals.user = null;
    }
    next();
});

app.use(router);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on ${PORT}`);
    
    // Set up periodic cleanup of expired password reset tokens
    // Run every 30 minutes (30 * 60 * 1000 milliseconds)
    setInterval(() => {
        cleanupExpiredPasswordResetTokens();
    }, 30 * 60 * 1000);
    
    // Run initial cleanup on server start
    cleanupExpiredPasswordResetTokens();
});
