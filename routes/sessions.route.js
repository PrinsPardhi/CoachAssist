const express = require('express');
const { use } = require('vio_node_helpers');
const { validateBody } = require('../helpers/validate.helpers');
const { startSessionSchema, saveBallSchema } = require('../validators/session.validators');
const { startSession, saveBall, undoBall, completeSession, getSessionAnalysis } = require('../controllers/sessions.controller');

const router = express.Router();

router.post('/', validateBody(startSessionSchema), use(startSession));
router.post('/:id/balls', validateBody(saveBallSchema), use(saveBall));
router.delete('/:id/balls/:overNumber/:ballNumber', use(undoBall));
router.patch('/:id/complete', use(completeSession));
router.get('/:id/analysis', use(getSessionAnalysis));

module.exports = { router };
