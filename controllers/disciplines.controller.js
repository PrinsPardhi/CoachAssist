const { MongoDB_Helper, ApplicationError, ApplicationSuccess } = require('vio_node_helpers');
const { __locationObject } = require('../data/common.data');
const { COLLECTIONS } = require('../data/constants.data');
const { getScopeFromRequest } = require('../helpers/scope.helpers');

const { ObjectId } = MongoDB_Helper;

const assertSportInAcademy = async (sportId, academyId) => {
    const sports = await MongoDB_Helper.findRecords(COLLECTIONS.SPORTS, { _id: new ObjectId(sportId), academyId }, {}, null);
    return sports[0];
}

const createDiscipline = async (req, res, next) => {
    const { academyId, userID } = getScopeFromRequest(req);
    const { sportId, name } = req.body;

    const sport = await assertSportInAcademy(sportId, academyId);
    if (!sport) {
        return next(new ApplicationError({ message: 'Sport not found.', location: __locationObject, apiStatusCode: 404 }));
    }

    const disciplineDoc = { sportId: new ObjectId(sportId), academyId, name, createdBy: userID };

    const result = await MongoDB_Helper.insertRecords(COLLECTIONS.DISCIPLINES, disciplineDoc, null);

    res.json(ApplicationSuccess.getSuccessObject({ _id: result.insertedId, ...disciplineDoc }, 'Discipline created successfully.'));
}

const listDisciplines = async (req, res, next) => {
    const { academyId } = getScopeFromRequest(req);
    const { sportId } = req.query;

    const query = { academyId };
    if (sportId) {
        query.sportId = new ObjectId(sportId);
    }

    const disciplines = await MongoDB_Helper.findRecords(COLLECTIONS.DISCIPLINES, query, { sortOn: { name: 1 } }, null);

    res.json(ApplicationSuccess.getSuccessObject(disciplines));
}

const updateDiscipline = async (req, res, next) => {
    const { academyId } = getScopeFromRequest(req);
    const { id } = req.params;
    const { name } = req.body;

    if (name === undefined) {
        return next(new ApplicationError({ message: 'No fields provided to update.', location: __locationObject, apiStatusCode: 400 }));
    }

    const result = await MongoDB_Helper.updateOneRecord(COLLECTIONS.DISCIPLINES, { _id: new ObjectId(id), academyId }, { setObject: { name } }, null);

    if (result.matchedCount === 0) {
        return next(new ApplicationError({ message: 'Discipline not found.', location: __locationObject, apiStatusCode: 404 }));
    }

    res.json(ApplicationSuccess.getSuccessObject({}, 'Discipline updated successfully.'));
}

const deleteDiscipline = async (req, res, next) => {
    const { academyId } = getScopeFromRequest(req);
    const { id } = req.params;

    const result = await MongoDB_Helper.deleteOneRecord(COLLECTIONS.DISCIPLINES, { _id: new ObjectId(id), academyId }, null);

    if (result.deletedCount === 0) {
        return next(new ApplicationError({ message: 'Discipline not found.', location: __locationObject, apiStatusCode: 404 }));
    }

    res.json(ApplicationSuccess.getSuccessObject({}, 'Discipline deleted successfully.'));
}

// Combined fetch: GET /disciplines/:id/parameters?withOptions=true
// Lets the ball-recording screen load its whole taxonomy in one call.
const getDisciplineParameters = async (req, res) => {
    const { academyId } = getScopeFromRequest(req);
    const { id } = req.params;
    const withOptions = req.query.withOptions === 'true';

    const pipeline = [
        { $match: { disciplineId: new ObjectId(id), academyId, isActive: true } },
        { $sort: { order: 1 } },
    ];

    if (withOptions) {
        pipeline.push(
            {
                $lookup: {
                    from: COLLECTIONS.PARAMETER_OPTIONS,
                    localField: '_id',
                    foreignField: 'parameterId',
                    as: 'options',
                },
            },
            {
                $addFields: {
                    options: {
                        $sortArray: { input: '$options', sortBy: { order: 1 } },
                    },
                },
            },
        );
    }

    const parameters = await MongoDB_Helper.findRecords(COLLECTIONS.PARAMETERS, pipeline, {}, null);

    res.json(ApplicationSuccess.getSuccessObject(parameters));
}

module.exports = {
    createDiscipline,
    listDisciplines,
    updateDiscipline,
    deleteDiscipline,
    getDisciplineParameters,
}
