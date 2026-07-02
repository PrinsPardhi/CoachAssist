const jwt = require('jsonwebtoken');

// By the time a request reaches our routers, the framework's own JWT
// middleware (manageApiRequestMiddleWare) has already verified the token for
// any route not listed in NO_TOKEN_APIS — invalid/expired tokens never get
// this far. We decode (not verify) it again here ourselves rather than rely
// on the framework's req.query.criteria / req.body.criteria injection, which
// is broken under Express 5 (req.query is a live getter — see request.js —
// so mutating it is silently discarded) and was never implemented for
// PUT/PATCH/DELETE in the first place (only GET/POST are handled).
const getScopeFromRequest = (req) => {
    const authorization = req.headers.authorization || '';
    const [, token] = authorization.split(' ');

    if (!token) {
        return { userID: undefined, tenant: null, role: undefined, academyId: undefined };
    }

    const decoded = jwt.decode(token) || {};

    return {
        userID: decoded.userID,
        tenant: decoded.tenant ?? null,
        role: decoded.role,
        academyId: decoded.academyId,
    }
}

module.exports = {
    getScopeFromRequest,
}
