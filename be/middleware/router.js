const express = require('express');
const router = express.Router();
const path = require('path');

// Home route
router.get("/", (req, res) => {
    res.render("home");
});

module.exports = router;
