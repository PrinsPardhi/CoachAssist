const express = require('express');
const { use } = require('vio_node_helpers');
const { validateBody } = require('../helpers/validate.helpers');
const { requireRole } = require('../middleware/requireRole.middleware');
const { ROLES } = require('../data/constants.data');
const { createSportSchema, updateSportSchema } = require('../validators/taxonomy.validators');
const { createSport, listSports, updateSport, deleteSport } = require('../controllers/sports.controller');

const router = express.Router();
const canManageTaxonomy = requireRole(ROLES.ACADEMY_HEAD, ROLES.HEAD_COACH);

router.post('/', canManageTaxonomy, validateBody(createSportSchema), use(createSport));
router.get('/', use(listSports));
router.patch('/:id', canManageTaxonomy, validateBody(updateSportSchema), use(updateSport));
router.delete('/:id', canManageTaxonomy, use(deleteSport));

module.exports = { router };
