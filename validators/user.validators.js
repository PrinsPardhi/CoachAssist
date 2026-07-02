const { z } = require('zod');
const { ROLES } = require('../data/constants.data');

const createUserSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum([ROLES.HEAD_COACH, ROLES.COACH]),
});

module.exports = {
    createUserSchema,
}
