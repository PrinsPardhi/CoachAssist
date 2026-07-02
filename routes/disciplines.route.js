const express = require('express');
const { use } = require('vio_node_helpers');
const { validateBody } = require('../helpers/validate.helpers');
const { requireRole } = require('../middleware/requireRole.middleware');
const { ROLES } = require('../data/constants.data');
const { createDisciplineSchema, updateDisciplineSchema } = require('../validators/taxonomy.validators');
const {
    createDiscipline,
    listDisciplines,
    updateDiscipline,
    deleteDiscipline,
    getDisciplineParameters,
} = require('../controllers/disciplines.controller');

const router = express.Router();
const canManageTaxonomy = requireRole(ROLES.ACADEMY_HEAD, ROLES.HEAD_COACH);

router.post('/', canManageTaxonomy, validateBody(createDisciplineSchema), use(createDiscipline));
router.get('/', use(listDisciplines));
router.get('/:id/parameters', use(getDisciplineParameters));
router.patch('/:id', canManageTaxonomy, validateBody(updateDisciplineSchema), use(updateDiscipline));
router.delete('/:id', canManageTaxonomy, use(deleteDiscipline));

module.exports = { router };
