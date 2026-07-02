const { MongoDB_Helper, ApplicationError, ApplicationSuccess } = require('vio_node_helpers');
const { __locationObject } = require('../data/common.data');
const { COLLECTIONS } = require('../data/constants.data');
const { getScopeFromRequest } = require('../helpers/scope.helpers');

const { ObjectId } = MongoDB_Helper;

const assertDisciplineInAcademy = async (disciplineId, academyId) => {
    const disciplines = await MongoDB_Helper.findRecords(COLLECTIONS.DISCIPLINES, { _id: new ObjectId(disciplineId), academyId }, {}, null);
    return disciplines[0];
}

const assertParameterInAcademy = async (parameterId, academyId) => {
    const parameters = await MongoDB_Helper.findRecords(COLLECTIONS.PARAMETERS, { _id: new ObjectId(parameterId), academyId }, {}, null);
    return parameters[0];
}

const createParameter = async (req, res, next) => {
    const { academyId, userID } = getScopeFromRequest(req);
    const { disciplineId, name, order } = req.body;

    const discipline = await assertDisciplineInAcademy(disciplineId, academyId);
    if (!discipline) {
        return next(new ApplicationError({ message: 'Discipline not found.', location: __locationObject, apiStatusCode: 404 }));
    }

    const parameterDoc = { disciplineId: new ObjectId(disciplineId), academyId, name, order, createdBy: userID, isActive: true };

    const result = await MongoDB_Helper.insertRecords(COLLECTIONS.PARAMETERS, parameterDoc, null);

    res.json(ApplicationSuccess.getSuccessObject({ _id: result.insertedId, ...parameterDoc }, 'Parameter created successfully.'));
}

const listParameters = async (req, res) => {
    const { academyId } = getScopeFromRequest(req);
    const { disciplineId } = req.query;

    const query = { academyId };
    if (disciplineId) {
        query.disciplineId = new ObjectId(disciplineId);
    }

    const parameters = await MongoDB_Helper.findRecords(COLLECTIONS.PARAMETERS, query, { sortOn: { order: 1 } }, null);

    res.json(ApplicationSuccess.getSuccessObject(parameters));
}

const updateParameter = async (req, res, next) => {
    const { academyId } = getScopeFromRequest(req);
    const { id } = req.params;
    const { name, order, isActive } = req.body;

    const setObject = {};
    if (name !== undefined) setObject.name = name;
    if (order !== undefined) setObject.order = order;
    if (isActive !== undefined) setObject.isActive = isActive;

    if (Object.keys(setObject).length === 0) {
        return next(new ApplicationError({ message: 'No fields provided to update.', location: __locationObject, apiStatusCode: 400 }));
    }

    const result = await MongoDB_Helper.updateOneRecord(COLLECTIONS.PARAMETERS, { _id: new ObjectId(id), academyId }, { setObject }, null);

    if (result.matchedCount === 0) {
        return next(new ApplicationError({ message: 'Parameter not found.', location: __locationObject, apiStatusCode: 404 }));
    }

    res.json(ApplicationSuccess.getSuccessObject({}, 'Parameter updated successfully.'));
}

const deleteParameter = async (req, res, next) => {
    const { academyId } = getScopeFromRequest(req);
    const { id } = req.params;

    const result = await MongoDB_Helper.deleteOneRecord(COLLECTIONS.PARAMETERS, { _id: new ObjectId(id), academyId }, null);

    if (result.deletedCount === 0) {
        return next(new ApplicationError({ message: 'Parameter not found.', location: __locationObject, apiStatusCode: 404 }));
    }

    await MongoDB_Helper.deleteRecords(COLLECTIONS.PARAMETER_OPTIONS, { parameterId: new ObjectId(id) }, null);

    res.json(ApplicationSuccess.getSuccessObject({}, 'Parameter deleted successfully.'));
}

// Bulk-replaces every option for a parameter in one call, matching the mobile
// setup screen's UX (the whole option list is submitted together). Options
// are plain labels — which one is "expected" is chosen per session instead
// (see Session.expectedSelections), not fixed here.
const setParameterOptions = async (req, res, next) => {
    const { academyId } = getScopeFromRequest(req);
    const { id } = req.params;
    const { options } = req.body;

    const parameter = await assertParameterInAcademy(id, academyId);
    if (!parameter) {
        return next(new ApplicationError({ message: 'Parameter not found.', location: __locationObject, apiStatusCode: 404 }));
    }

    const parameterId = new ObjectId(id);

    await MongoDB_Helper.deleteRecords(COLLECTIONS.PARAMETER_OPTIONS, { parameterId }, null);

    const optionDocs = options.map((opt) => ({
        parameterId,
        label: opt.label,
        order: opt.order,
    }));

    await MongoDB_Helper.insertRecords(COLLECTIONS.PARAMETER_OPTIONS, optionDocs, null);

    const savedOptions = await MongoDB_Helper.findRecords(COLLECTIONS.PARAMETER_OPTIONS, { parameterId }, { sortOn: { order: 1 } }, null);

    res.json(ApplicationSuccess.getSuccessObject(savedOptions, 'Parameter options saved successfully.'));
}

const listParameterOptions = async (req, res, next) => {
    const { academyId } = getScopeFromRequest(req);
    const { id } = req.params;

    const parameter = await assertParameterInAcademy(id, academyId);
    if (!parameter) {
        return next(new ApplicationError({ message: 'Parameter not found.', location: __locationObject, apiStatusCode: 404 }));
    }

    const options = await MongoDB_Helper.findRecords(COLLECTIONS.PARAMETER_OPTIONS, { parameterId: new ObjectId(id) }, { sortOn: { order: 1 } }, null);

    res.json(ApplicationSuccess.getSuccessObject(options));
}

module.exports = {
    createParameter,
    listParameters,
    updateParameter,
    deleteParameter,
    setParameterOptions,
    listParameterOptions,
}
