const { MongoDB_Helper, ApplicationError, ApplicationSuccess } = require('vio_node_helpers');
const { __locationObject } = require('../data/common.data');
const { COLLECTIONS } = require('../data/constants.data');
const { getScopeFromRequest } = require('../helpers/scope.helpers');

const { ObjectId } = MongoDB_Helper;

const createSport = async (req, res) => {
    const { academyId, userID } = getScopeFromRequest(req);
    const { name } = req.body;

    const sportDoc = { academyId, name, createdBy: userID, isActive: true };

    const result = await MongoDB_Helper.insertRecords(COLLECTIONS.SPORTS, sportDoc, null);

    res.json(ApplicationSuccess.getSuccessObject({ _id: result.insertedId, ...sportDoc }, 'Sport created successfully.'));
}

const listSports = async (req, res) => {
    const { academyId } = getScopeFromRequest(req);

    const sports = await MongoDB_Helper.findRecords(COLLECTIONS.SPORTS, { academyId }, { sortOn: { name: 1 } }, null);

    res.json(ApplicationSuccess.getSuccessObject(sports));
}

const updateSport = async (req, res, next) => {
    const { academyId } = getScopeFromRequest(req);
    const { id } = req.params;
    const { name, isActive } = req.body;

    const setObject = {};
    if (name !== undefined) setObject.name = name;
    if (isActive !== undefined) setObject.isActive = isActive;

    if (Object.keys(setObject).length === 0) {
        return next(new ApplicationError({ message: 'No fields provided to update.', location: __locationObject, apiStatusCode: 400 }));
    }

    const result = await MongoDB_Helper.updateOneRecord(COLLECTIONS.SPORTS, { _id: new ObjectId(id), academyId }, { setObject }, null);

    if (result.matchedCount === 0) {
        return next(new ApplicationError({ message: 'Sport not found.', location: __locationObject, apiStatusCode: 404 }));
    }

    res.json(ApplicationSuccess.getSuccessObject({}, 'Sport updated successfully.'));
}

const deleteSport = async (req, res, next) => {
    const { academyId } = getScopeFromRequest(req);
    const { id } = req.params;

    const result = await MongoDB_Helper.deleteOneRecord(COLLECTIONS.SPORTS, { _id: new ObjectId(id), academyId }, null);

    if (result.deletedCount === 0) {
        return next(new ApplicationError({ message: 'Sport not found.', location: __locationObject, apiStatusCode: 404 }));
    }

    res.json(ApplicationSuccess.getSuccessObject({}, 'Sport deleted successfully.'));
}

module.exports = {
    createSport,
    listSports,
    updateSport,
    deleteSport,
}
