const { MongoDB_Helper, ApplicationError, ApplicationSuccess } = require('vio_node_helpers');
const { __locationObject } = require('../data/common.data');
const { COLLECTIONS } = require('../data/constants.data');
const { getScopeFromRequest } = require('../helpers/scope.helpers');
const { hashPassword } = require('../helpers/auth.helpers');

const createUser = async (req, res, next) => {
    const { academyId } = getScopeFromRequest(req);
    const { name, email, password, role } = req.body;

    const existing = await MongoDB_Helper.findRecords(COLLECTIONS.USERS, { email }, {}, null);
    if (existing[0]) {
        return next(new ApplicationError({ message: 'A user with this email already exists.', location: __locationObject, apiStatusCode: 409 }));
    }

    const passwordHash = await hashPassword(password);
    const userDoc = { academyId, name, email, passwordHash, role };

    const result = await MongoDB_Helper.insertRecords(COLLECTIONS.USERS, userDoc, null);

    const { passwordHash: _omit, ...safeUser } = userDoc;
    res.json(ApplicationSuccess.getSuccessObject({ _id: result.insertedId, ...safeUser }, 'User created successfully.'));
}

const listUsers = async (req, res) => {
    const { academyId } = getScopeFromRequest(req);

    const users = await MongoDB_Helper.findRecords(
        COLLECTIONS.USERS,
        { academyId },
        { selectFields: { passwordHash: 0 }, sortOn: { name: 1 } },
        null,
    );

    res.json(ApplicationSuccess.getSuccessObject(users));
}

module.exports = {
    createUser,
    listUsers,
}
