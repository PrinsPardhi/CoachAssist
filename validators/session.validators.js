const { z } = require('zod');
const { objectIdString } = require('./player.validators');

const startSessionSchema = z.object({
    playerId: objectIdString,
    sportId: objectIdString,
    disciplineId: objectIdString,
    plannedOvers: z.coerce.number().int().positive(),
    // What counts as "expected" for each parameter in THIS session — chosen
    // fresh every time rather than fixed in the taxonomy, so the same
    // parameter can target a different outcome from one session to the next.
    // Full coverage (exactly one per discipline parameter, valid option ids)
    // is checked in the controller since it needs a DB lookup.
    expectedSelections: z.array(z.object({
        parameterId: objectIdString,
        parameterOptionId: objectIdString,
    })).min(1, 'At least one expected selection is required'),
});

const saveBallSchema = z.object({
    overNumber: z.coerce.number().int().positive(),
    // 6 balls per over. Extras (wide/no-ball) are out of scope for now — v2 TODO.
    ballNumber: z.coerce.number().int().min(1).max(6),
    selections: z.array(z.object({
        parameterId: objectIdString,
        parameterOptionId: objectIdString,
    })).min(1, 'At least one selection is required'),
});

module.exports = {
    startSessionSchema,
    saveBallSchema,
}
