const { ApplicationError } = require('vio_node_helpers');
const { __locationObject } = require('../data/common.data');
const { getScopeFromRequest } = require('../helpers/scope.helpers');

// Express middleware factory. Reads the role the JWT middleware already
// injected into req.body/query.criteria (see REQUST_PARAMS_FROM_TOKEN) and
// rejects the request if it isn't one of the allowed roles.
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        const { role } = getScopeFromRequest(req);
        if (!role || !allowedRoles.includes(role)) {
            let errObj = new ApplicationError({
                message: `This action requires one of the following roles: ${allowedRoles.join(', ')}.`,
                location: __locationObject,
                apiStatusCode: 403,
            });
            return next(errObj);
        }
        next();
    }
}

module.exports = {
    requireRole,
}
