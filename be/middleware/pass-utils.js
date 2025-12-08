const argon2 = require('argon2');

const argon2Options = {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4
};

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
    verifyPassword
};
