const express = require('express');
const { use } = require('vio_node_helpers');
const { validateBody } = require('../helpers/validate.helpers');
const { requireRole } = require('../middleware/requireRole.middleware');
const { ROLES } = require('../data/constants.data');
const { createUserSchema } = require('../validators/user.validators');
const { createUser, listUsers } = require('../controllers/users.controller');

const router = express.Router();
const canManageUsers = requireRole(ROLES.ACADEMY_HEAD, ROLES.HEAD_COACH);

router.post('/', canManageUsers, validateBody(createUserSchema), use(createUser));
router.get('/', canManageUsers, use(listUsers));

module.exports = { router };
