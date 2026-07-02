const express = require('express');
const { use } = require('vio_node_helpers');
const { validateBody, validateQuery } = require('../helpers/validate.helpers');
const { requireRole } = require('../middleware/requireRole.middleware');
const { ROLES } = require('../data/constants.data');
const { createPlayerSchema } = require('../validators/player.validators');
const { playerAnalysisQuerySchema } = require('../validators/analysis.validators');
const { createPlayer, listPlayers, getPlayer, getPlayerAnalysis } = require('../controllers/players.controller');

const router = express.Router();

router.post('/', requireRole(ROLES.ACADEMY_HEAD, ROLES.HEAD_COACH), validateBody(createPlayerSchema), use(createPlayer));
router.get('/', use(listPlayers));
router.get('/:id', use(getPlayer));
router.get('/:id/analysis', validateQuery(playerAnalysisQuerySchema), use(getPlayerAnalysis));

module.exports = { router };
