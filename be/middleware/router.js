const express = require('express');
const router = express.Router();
const path = require('path');

// Home route
router.get("/", (req, res) => {
    res.render("home");
});

// Register route
router.get("/register", (req, res) => {
    res.render("register");
});

// Login route
router.get("/login", (req, res) => {
    res.render("login");
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
