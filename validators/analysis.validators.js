const { z } = require('zod');
const { objectIdString } = require('./player.validators');

const playerAnalysisQuerySchema = z.object({
    sportId: objectIdString.optional(),
    disciplineId: objectIdString.optional(),
    // Number of days to look back. Omit for all-time.
    range: z.coerce.number().int().positive().optional(),
});

module.exports = {
    playerAnalysisQuerySchema,
}
