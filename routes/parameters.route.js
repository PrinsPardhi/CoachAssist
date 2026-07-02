const express = require('express');
const { use } = require('vio_node_helpers');
const { validateBody } = require('../helpers/validate.helpers');
const { requireRole } = require('../middleware/requireRole.middleware');
const { ROLES } = require('../data/constants.data');
const { createParameterSchema, updateParameterSchema, setParameterOptionsSchema } = require('../validators/taxonomy.validators');
const {
    createParameter,
    listParameters,
    updateParameter,
    deleteParameter,
    setParameterOptions,
    listParameterOptions,
} = require('../controllers/parameters.controller');

const router = express.Router();
const canManageTaxonomy = requireRole(ROLES.ACADEMY_HEAD, ROLES.HEAD_COACH);

router.post('/', canManageTaxonomy, validateBody(createParameterSchema), use(createParameter));
router.get('/', use(listParameters));
router.patch('/:id', canManageTaxonomy, validateBody(updateParameterSchema), use(updateParameter));
router.delete('/:id', canManageTaxonomy, use(deleteParameter));

router.get('/:id/options', use(listParameterOptions));
router.put('/:id/options', canManageTaxonomy, validateBody(setParameterOptionsSchema), use(setParameterOptions));

module.exports = { router };
