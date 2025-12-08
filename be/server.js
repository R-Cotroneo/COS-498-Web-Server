const express = require('express');
const session = require('express-session');
const hbs = require('hbs');
const path = require('path');
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
});
