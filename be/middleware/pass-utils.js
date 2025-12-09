const argon2 = require('argon2');
const { getUserCountByEmail, getUserCountByDisplayName } = require('../middleware/database');

const argon2Options = {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4
};

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return {
            isValid: false,
            error: "Invalid email format."
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

function validateDisplayName(display_name, username) {
    // Check if display name is the same as username
    if (display_name === username) {
        return {
            isValid: false,
            error: "Display name cannot be the same as username."
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
    validateDisplayName
};
