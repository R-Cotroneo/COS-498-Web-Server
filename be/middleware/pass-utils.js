const argon2 = require('argon2');
const { getUserCountByEmail, getUserCountByDisplayName, getUserByUsername } = require('../middleware/database');

const argon2Options = {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4
};

function validateUsername(username, currentUsername = null) {
    // Check if username is empty or just whitespace
    if (!username || username.trim().length === 0) {
        return {
            isValid: false,
            error: "Username cannot be empty."
        };
    }
    
    // Check username length
    if (username.length < 3) {
        return {
            isValid: false,
            error: "Username must be at least 3 characters long."
        };
    }
    
    if (username.length > 20) {
        return {
            isValid: false,
            error: "Username must be 20 characters or less."
        };
    }
    
    // Check for valid characters (alphanumeric and underscore)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return {
            isValid: false,
            error: "Username can only contain letters, numbers, and underscores."
        };
    }
    
    // Don't check for duplicates if it's the same as current username (for updates)
    if (currentUsername && username === currentUsername) {
        return {
            isValid: true,
            error: ""
        };
    }
    
    // Check if username is already taken
    const existingUser = getUserByUsername(username);
    if (existingUser) {
        return {
            isValid: false,
            error: "Username is already taken."
        };
    }
    
    return {
        isValid: true,
        error: ""
    };
}

function validateEmail(email, currentEmail = null) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return {
            isValid: false,
            error: "Invalid email format."
        };
    }
    
    // Don't check for duplicates if it's the same as current email (for updates)
    if (currentEmail && email === currentEmail) {
        return {
            isValid: true,
            error: ""
        };
    }
    
    const userCount = getUserCountByEmail(email);
    if (userCount > 0) {
        return {
            isValid: false,
            error: "Email is already in use."
        };
    }
    return {
        isValid: true,
        error: ""
    };
}

function validateDisplayName(display_name, username, currentDisplayName = null) {
    // Check if display name is the same as username
    if (display_name === username) {
        return {
            isValid: false,
            error: "Display name cannot be the same as username."
        };
    }
    
    // Check if display name is empty or just whitespace
    if (!display_name || display_name.trim().length === 0) {
        return {
            isValid: false,
            error: "Display name cannot be empty."
        };
    }
    
    // Check display name length
    if (display_name.length < 2) {
        return {
            isValid: false,
            error: "Display name must be at least 2 characters long."
        };
    }
    
    if (display_name.length > 50) {
        return {
            isValid: false,
            error: "Display name must be 50 characters or less."
        };
    }
    
    // Don't check for duplicates if it's the same as current display name (for updates)
    if (currentDisplayName && display_name === currentDisplayName) {
        return {
            isValid: true,
            error: ""
        };
    }
    
    // Check if display name is already taken
    const userCount = getUserCountByDisplayName(display_name);
    if (userCount > 0) {
        return {
            isValid: false,
            error: "Display name is already taken."
        };
    }
    
    return {
        isValid: true,
        error: ""
    };
}

function validatePassword(password) {
    const errors = [];

    if (!password) {
        errors.push("Password cannot be empty.");
    }

    if (password.length < 8) {
        errors.push("Password must be at least 8 characters long.");
    }

    if (!/[A-Z]/.test(password)) {
        errors.push("Password must contain at least one uppercase letter.");
    }
    if (!/[a-z]/.test(password)) {
        errors.push("Password must contain at least one lowercase letter.");
    }
    if (!/[0-9]/.test(password)) {
        errors.push("Password must contain at least one digit.");
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push("Password must contain at least one special character.");
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

async function hashPassword(password) {
    try {
        const hash = await argon2.hash(password, argon2Options);
        return hash;
    } catch (err) {
        throw new Error("Error hashing password");
    }
}

async function verifyPassword(hash, password) {
    try {
        return await argon2.verify(hash, password);
    } catch (err) {
        throw new Error("Error verifying password");
    }
}

module.exports = {
    validatePassword,
    hashPassword,
    verifyPassword,
    validateEmail,
    validateDisplayName,
    validateUsername
};
