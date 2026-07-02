const express = require('express');
const { use } = require('vio_node_helpers');
const { validateBody } = require('../helpers/validate.helpers');
const { loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } = require('../validators/auth.validators');
const { login, logout, changePassword, forgotPassword, resetPassword } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/login', validateBody(loginSchema), use(login));
router.post('/logout', use(logout));
router.post('/change-password', validateBody(changePasswordSchema), use(changePassword));
router.post('/forgot-password', validateBody(forgotPasswordSchema), use(forgotPassword));
router.post('/reset-password', validateBody(resetPasswordSchema), use(resetPassword));

module.exports = { router };
