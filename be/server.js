/*
COS 498 Web Forum Final Project
Author: Raist Cotroneo
Date: 12/19/2025
Purpose: This application is meant to build on the midterm forum that had little to no security and had much
         less functionality.  This application adds many security features such as password hashing, email
         verification, password reset tokens, input sanitization, and a database to not store passwords in plain text.
         It also adds functionality such as real-time chat, user profiles with customizable display names and colors,
         and the ability to use markdown formatting in posts.
*/

/*
    Main server file for the web application.
    Sets up Express server, session management, Handlebars templating,
    and Socket.io for real-time chat functionality.
    Routes are handled in router.js, and database interactions are managed in database.js.
*/
const express = require('express');
const session = require('express-session');
const hbs = require('hbs');
const path = require('path');
const http = require('http');
const { cleanupExpiredPasswordResetTokens, saveChatMessage, getUserByUsername } = require('./middleware/database');
const app = express();
const PORT = process.env.PORT || 4610;
const router = require('./middleware/router');
const server = http.createServer(app);
const { Server } = require('socket.io');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
const sesMiddle = session({
    secret: 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
});
app.use(sesMiddle);

// Set up Handlebars as the view engine
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

// setup io socket
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET","POST"]
    }
});
// connect io to the session system
io.engine.use(sesMiddle);


io.on('connection', (socket)=>{ // socket is the "req" of the client
    const sessionInfo = socket.request.session;
    const userName = sessionInfo.username; // Fixed: changed from userName to username

    if (!userName) {
        socket.emit('error', {message: "You need to be logged in"});
        socket.disconnect(); // disconnect
        return; // leave if they are not logged in.
    }

    // Get user info for display name and color
    const userInfo = getUserByUsername(userName);
    const displayName = userInfo?.display_name || userName;
    const nameColor = userInfo?.name_color || '#000000';

    console.log(`Client connected: ${userName}`);

    // Handle new message sending
    socket.on('sendMessage', (data) => {
        if (data.message && data.message.trim().length > 0) {
            const message = data.message.trim();
            
            // Validate message length (max 500 characters)
            // Can be set to something else, but will have to change values in chat.hbs as well to account for warnings
            if (message.length > 500) {
                socket.emit('error', {message: "Message too long (max 500 characters)"});
                return;
            }
            
            // Basic sanitization - remove HTML tags and control characters
            const sanitizedMessage = message.replace(/<[^>]*>/g, '').replace(/[\x00-\x1F\x7F]/g, '');
            
            // Save message to database
            const messageId = saveChatMessage(userName, displayName, sanitizedMessage, nameColor);
            
            if (messageId) {
                // Send message to all connected clients with database-consistent timestamp
                const messageData = {
                    username: userName,
                    display_name: displayName,
                    message: sanitizedMessage,
                    name_color: nameColor,
                    created_at: new Date().toISOString()
                };
                
                io.emit('chatMessage', messageData);
            }
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on ${PORT}`);
    
    // Set up periodic cleanup of expired password reset tokens
    // Run every 30 minutes (30 * 60 * 1000 milliseconds)
    setInterval(() => {
        cleanupExpiredPasswordResetTokens();
    }, 30 * 60 * 1000);
    
    // Run initial cleanup on server start
    cleanupExpiredPasswordResetTokens();
});
