const crypto = require('crypto');
const { MongoDB_Helper, UserSessions_Helper, ApplicationError, ApplicationSuccess } = require('vio_node_helpers');
const { __locationObject } = require('../data/common.data');
const { COLLECTIONS } = require('../data/constants.data');
const {
    hashPassword,
    comparePassword,
    buildTokenInfo,
    generatePasswordResetToken,
    hashPasswordResetToken,
} = require('../helpers/auth.helpers');
const { getScopeFromRequest } = require('../helpers/scope.helpers');

const { ObjectId } = MongoDB_Helper;

const login = async (req, res, next) => {
    const { email, password } = req.body;
    const deviceType = req.headers.authfor || 'M';

    const users = await MongoDB_Helper.findRecords(COLLECTIONS.USERS, { email }, {}, null);
    const user = users[0];

    if (!user || !(await comparePassword(password, user.passwordHash))) {
        return next(new ApplicationError({ message: 'Invalid email or password.', location: __locationObject, apiStatusCode: 401 }));
    }

    const tokenInfo = buildTokenInfo(user);
    const userInfo = { name: user.name, email: user.email, role: user.role, academyId: user.academyId };

    const result = await UserSessions_Helper.loginUser({
        userID: user._id.toString(),
        tenant: null,
        deviceType,
        tokenInfo,
        userInfo,
        req,
        res,
    });

    res.json(result);
}

const logout = async (req, res, next) => {
    const authorization = req.headers.authorization || '';
    const [, token] = authorization.split(' ');

    if (!token) {
        return next(new ApplicationError({ message: 'No active session to log out.', location: __locationObject, apiStatusCode: 400 }));
    }

    const decoded = UserSessions_Helper.extractTokenInfo(token) || {};
    const { userID, tenant = null } = decoded;

    if (!userID) {
        return next(new ApplicationError({ message: 'No active session to log out.', location: __locationObject, apiStatusCode: 400 }));
    }

    const result = await UserSessions_Helper.logoutUser({ userID, tenant, req, res });

    res.json(result);
}

const changePassword = async (req, res, next) => {
    const { userID } = getScopeFromRequest(req);
    const { currentPassword, newPassword } = req.body;

    const users = await MongoDB_Helper.findRecords(COLLECTIONS.USERS, { _id: new ObjectId(userID) }, {}, null);
    const user = users[0];

    if (!user || !(await comparePassword(currentPassword, user.passwordHash))) {
        return next(new ApplicationError({ message: 'Current password is incorrect.', location: __locationObject, apiStatusCode: 401 }));
    }

    const passwordHash = await hashPassword(newPassword);
    await MongoDB_Helper.updateOneRecord(COLLECTIONS.USERS, { _id: user._id }, { setObject: { passwordHash } }, null);

    res.json(ApplicationSuccess.getSuccessObject({}, 'Password changed successfully.'));
}

const forgotPassword = async (req, res) => {
    const { email } = req.body;

    const users = await MongoDB_Helper.findRecords(COLLECTIONS.USERS, { email }, {}, null);
    const user = users[0];

    // Same response regardless of whether the email exists — otherwise this
    // endpoint becomes a way to discover which emails have accounts.
    const genericMessage = 'If an account exists for this email, a password reset code has been generated.';

    if (!user) {
        return res.json(ApplicationSuccess.getSuccessObject({}, genericMessage));
    }

    const { token, tokenHash, expiresAt } = generatePasswordResetToken();

    await MongoDB_Helper.updateOneRecord(
        COLLECTIONS.USERS,
        { _id: user._id },
        { setObject: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt } },
        null,
    );

    // DEV MODE: no email service is configured yet (EMAIL_ENABLED=no, no SMTP
    // credentials), so the reset token is returned directly in the response
    // instead of being emailed. This is intentionally insecure and must be
    // replaced with real email delivery (via Email_Helper) before this ships
    // to real users — anyone who can call this endpoint for an email address
    // can currently reset that account's password.
    res.json(ApplicationSuccess.getSuccessObject({ resetToken: token }, genericMessage));
}

const resetPassword = async (req, res, next) => {
    const { email, token, newPassword } = req.body;

    const invalidTokenError = () =>
        new ApplicationError({ message: 'Invalid or expired reset token.', location: __locationObject, apiStatusCode: 400 });

    const users = await MongoDB_Helper.findRecords(COLLECTIONS.USERS, { email }, {}, null);
    const user = users[0];

    if (!user || !user.passwordResetTokenHash || !user.passwordResetExpiresAt) {
        return next(invalidTokenError());
    }

    if (new Date(user.passwordResetExpiresAt).getTime() < Date.now()) {
        return next(invalidTokenError());
    }

    const providedTokenHash = hashPasswordResetToken(token);
    const storedHashBuffer = Buffer.from(user.passwordResetTokenHash, 'hex');
    const providedHashBuffer = Buffer.from(providedTokenHash, 'hex');

    const isMatch =
        storedHashBuffer.length === providedHashBuffer.length &&
        crypto.timingSafeEqual(storedHashBuffer, providedHashBuffer);

    if (!isMatch) {
        return next(invalidTokenError());
    }

    const passwordHash = await hashPassword(newPassword);

    await MongoDB_Helper.updateOneRecord(
        COLLECTIONS.USERS,
        { _id: user._id },
        {
            setObject: { passwordHash },
            unsetObject: { passwordResetTokenHash: '', passwordResetExpiresAt: '' },
        },
        null,
    );

    // A password reset (as opposed to a self-service change) implies the
    // account may have been compromised — invalidate any existing session.
    await UserSessions_Helper.forceLogoutUser(user._id.toString(), null);

    res.json(ApplicationSuccess.getSuccessObject({}, 'Password reset successfully. Please log in.'));
}

module.exports = {
    login,
    logout,
    changePassword,
    forgotPassword,
    resetPassword,
}
