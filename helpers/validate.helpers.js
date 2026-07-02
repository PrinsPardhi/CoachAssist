const { ApplicationError } = require('vio_node_helpers');
const { __locationObject } = require('../data/common.data');

// Express middleware factory. Validates req.body against a zod schema and
// replaces req.body with the parsed (and coerced/defaulted) result on success.
const validateBody = (zodSchema) => {
    return (req, res, next) => {
        const result = zodSchema.safeParse(req.body);
        if (!result.success) {
            const message = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
            let errObj = new ApplicationError({
                message: `Invalid request. ${message}`,
                location: __locationObject,
                apiStatusCode: 400,
            });
            return next(errObj);
        }
        req.body = { ...req.body, ...result.data };
        next();
    }
}

// Express middleware factory. Validates req.query against a zod schema and
// stores the parsed (coerced/defaulted) result on req.validatedQuery.
//
// Deliberately does NOT reassign req.query itself: in Express 5, req.query is
// a getter with no setter (see request.js) that re-derives from the raw URL
// on every access, so `req.query = X` silently no-ops. Controllers must read
// req.validatedQuery instead of req.query for any route using this middleware.
const validateQuery = (zodSchema) => {
    return (req, res, next) => {
        const result = zodSchema.safeParse(req.query);
        if (!result.success) {
            const message = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
            let errObj = new ApplicationError({
                message: `Invalid request. ${message}`,
                location: __locationObject,
                apiStatusCode: 400,
            });
            return next(errObj);
        }
        req.validatedQuery = result.data;
        next();
    }
}

module.exports = {
    validateBody,
    validateQuery,
}
