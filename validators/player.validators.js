const { z } = require('zod');

const objectIdString = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const createPlayerSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    dob: z.coerce.date(),
    assignedCoaches: z.array(objectIdString).default([]),
});

module.exports = {
    objectIdString,
    createPlayerSchema,
}
