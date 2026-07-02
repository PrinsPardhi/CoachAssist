const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

const hashPassword = async (plainPassword) => {
    return await bcrypt.hash(plainPassword, SALT_ROUNDS);
}

const comparePassword = async (plainPassword, passwordHash) => {
    return await bcrypt.compare(plainPassword, passwordHash);
}

const buildTokenInfo = (user) => {
    return {
        role: user.role,
        academyId: user.academyId ? user.academyId.toString() : null,
    }
}

// Reset tokens are never stored in plaintext (same principle as passwords) —
// only their SHA-256 hash lives in the DB, so a DB leak alone can't be used
// to reset anyone's password.
const generatePasswordResetToken = () => {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
    return { token, tokenHash, expiresAt };
}

const hashPasswordResetToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
    hashPassword,
    comparePassword,
    buildTokenInfo,
    generatePasswordResetToken,
    hashPasswordResetToken,
}
