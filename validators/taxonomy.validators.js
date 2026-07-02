const { z } = require('zod');
const { objectIdString } = require('./player.validators');

const createSportSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
});

const updateSportSchema = z.object({
    name: z.string().trim().min(1).optional(),
    isActive: z.boolean().optional(),
});

const createDisciplineSchema = z.object({
    sportId: objectIdString,
    name: z.string().trim().min(1, 'Name is required'),
});

const updateDisciplineSchema = z.object({
    name: z.string().trim().min(1).optional(),
});

const createParameterSchema = z.object({
    disciplineId: objectIdString,
    name: z.string().trim().min(1, 'Name is required'),
    order: z.coerce.number().int().default(0),
});

const updateParameterSchema = z.object({
    name: z.string().trim().min(1).optional(),
    order: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
});

// Options are plain labeled choices — which one is "expected" is no longer
// a taxonomy-level property. It's chosen fresh per session (see
// startSessionSchema's expectedSelections) so the same parameter can target
// a different outcome from one training session to the next.
const parameterOptionSchema = z.object({
    _id: objectIdString.optional(),
    label: z.string().trim().min(1, 'Label is required'),
    order: z.coerce.number().int().default(0),
});

const setParameterOptionsSchema = z.object({
    options: z.array(parameterOptionSchema).min(2, 'At least two options are required'),
});

module.exports = {
    createSportSchema,
    updateSportSchema,
    createDisciplineSchema,
    updateDisciplineSchema,
    createParameterSchema,
    updateParameterSchema,
    setParameterOptionsSchema,
}
