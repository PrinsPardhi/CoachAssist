const { MongoDB_Helper, ApplicationError, ApplicationSuccess } = require('vio_node_helpers');
const { __locationObject } = require('../data/common.data');
const { COLLECTIONS } = require('../data/constants.data');
const { getScopeFromRequest } = require('../helpers/scope.helpers');
const { assertPlayerAccessible, assertSessionAccessible } = require('../helpers/access.helpers');

const { ObjectId } = MongoDB_Helper;

const assertDisciplineOfSport = async (disciplineId, sportId, academyId) => {
    const disciplines = await MongoDB_Helper.findRecords(
        COLLECTIONS.DISCIPLINES,
        { _id: new ObjectId(disciplineId), sportId: new ObjectId(sportId), academyId },
        {},
        null,
    );
    return disciplines[0];
}

// Every parameter of the discipline must have exactly one expected
// selection, and each chosen option must actually belong to the parameter
// it's paired with. Returns an error message, or null if valid.
const validateExpectedSelections = async (disciplineId, expectedSelections) => {
    const parameters = await MongoDB_Helper.findRecords(COLLECTIONS.PARAMETERS, { disciplineId: new ObjectId(disciplineId) }, {}, null);
    const parameterIds = parameters.map((p) => p._id.toString());

    const selectionParameterIds = expectedSelections.map((sel) => sel.parameterId);
    if (new Set(selectionParameterIds).size !== selectionParameterIds.length) {
        return 'Each parameter can only have one expected selection.';
    }

    if (parameterIds.some((pid) => !selectionParameterIds.includes(pid))) {
        return 'An expected result must be set for every parameter.';
    }

    if (selectionParameterIds.some((pid) => !parameterIds.includes(pid))) {
        return 'Expected selections include a parameter that does not belong to this discipline.';
    }

    const optionIds = expectedSelections.map((sel) => new ObjectId(sel.parameterOptionId));
    const options = await MongoDB_Helper.findRecords(COLLECTIONS.PARAMETER_OPTIONS, { _id: { $in: optionIds } }, {}, null);
    const optionById = new Map(options.map((opt) => [opt._id.toString(), opt]));

    const hasInvalidOption = expectedSelections.some((sel) => {
        const option = optionById.get(sel.parameterOptionId);
        return !option || option.parameterId.toString() !== sel.parameterId;
    });
    if (hasInvalidOption) {
        return 'One of the expected options is invalid for its parameter.';
    }

    return null;
}

const startSession = async (req, res, next) => {
    const { academyId, role, userID } = getScopeFromRequest(req);
    const { playerId, sportId, disciplineId, plannedOvers, expectedSelections } = req.body;

    const player = await assertPlayerAccessible(playerId, academyId, role, userID);
    if (!player) {
        return next(new ApplicationError({ message: 'Player not found or not assigned to you.', location: __locationObject, apiStatusCode: 404 }));
    }

    const discipline = await assertDisciplineOfSport(disciplineId, sportId, academyId);
    if (!discipline) {
        return next(new ApplicationError({ message: 'Discipline not found for this sport.', location: __locationObject, apiStatusCode: 404 }));
    }

    const validationError = await validateExpectedSelections(disciplineId, expectedSelections);
    if (validationError) {
        return next(new ApplicationError({ message: validationError, location: __locationObject, apiStatusCode: 400 }));
    }

    const sessionDoc = {
        academyId,
        playerId: new ObjectId(playerId),
        coachId: new ObjectId(userID),
        sportId: new ObjectId(sportId),
        disciplineId: new ObjectId(disciplineId),
        plannedOvers,
        expectedSelections: expectedSelections.map((sel) => ({
            parameterId: new ObjectId(sel.parameterId),
            parameterOptionId: new ObjectId(sel.parameterOptionId),
        })),
        status: 'in_progress',
        startedAt: new Date(),
        completedAt: null,
    };

    const result = await MongoDB_Helper.insertRecords(COLLECTIONS.SESSIONS, sessionDoc, null);

    res.json(ApplicationSuccess.getSuccessObject({ _id: result.insertedId, ...sessionDoc }, 'Session started successfully.'));
}

const saveBall = async (req, res, next) => {
    const { academyId, role, userID } = getScopeFromRequest(req);
    const { id: sessionId } = req.params;
    const { overNumber, ballNumber, selections } = req.body;

    const session = await assertSessionAccessible(sessionId, academyId, role, userID);
    if (!session) {
        return next(new ApplicationError({ message: 'Session not found.', location: __locationObject, apiStatusCode: 404 }));
    }
    if (session.status !== 'in_progress') {
        return next(new ApplicationError({ message: 'This session is already completed.', location: __locationObject, apiStatusCode: 400 }));
    }
    if (!session.expectedSelections || session.expectedSelections.length === 0) {
        return next(new ApplicationError({
            message: 'This session was started before expected results were required. End it and start a new session to keep recording.',
            location: __locationObject,
            apiStatusCode: 400,
        }));
    }

    const expectedOptionIdByParameterId = new Map(
        session.expectedSelections.map((sel) => [sel.parameterId.toString(), sel.parameterOptionId.toString()]),
    );

    const optionIds = selections.map((sel) => new ObjectId(sel.parameterOptionId));
    const options = await MongoDB_Helper.findRecords(COLLECTIONS.PARAMETER_OPTIONS, { _id: { $in: optionIds } }, {}, null);
    const optionById = new Map(options.map((opt) => [opt._id.toString(), opt]));

    const resolvedSelections = selections.map((sel) => {
        const option = optionById.get(sel.parameterOptionId);
        if (!option) {
            throw new ApplicationError({ message: `Parameter option [${sel.parameterOptionId}] not found.`, location: __locationObject, apiStatusCode: 400 });
        }
        return {
            parameterId: new ObjectId(sel.parameterId),
            parameterOptionId: option._id,
            matchedExpected: expectedOptionIdByParameterId.get(sel.parameterId) === sel.parameterOptionId,
        };
    });

    const ballDoc = {
        sessionId: new ObjectId(sessionId),
        overNumber,
        ballNumber,
        selections: resolvedSelections,
        recordedAt: new Date(),
    };

    try {
        const result = await MongoDB_Helper.insertRecords(COLLECTIONS.BALL_RECORDS, ballDoc, null);
        res.json(ApplicationSuccess.getSuccessObject({ _id: result.insertedId, ...ballDoc }, 'Ball recorded successfully.'));
    } catch (err) {
        // MongoDB_Helper.insertRecords wraps the raw driver error into an
        // ApplicationError, folding the original error's .code/.toString()
        // into .message — so a duplicate key violation shows up as message
        // text containing "E11000", not as a distinct .code property here.
        if (err.message?.includes('E11000')) {
            return next(new ApplicationError({
                message: `Over ${overNumber}, ball ${ballNumber} has already been recorded for this session.`,
                location: __locationObject,
                apiStatusCode: 409,
            }));
        }
        throw err;
    }
}

const undoBall = async (req, res, next) => {
    const { academyId, role, userID } = getScopeFromRequest(req);
    const { id: sessionId, overNumber, ballNumber } = req.params;

    const session = await assertSessionAccessible(sessionId, academyId, role, userID);
    if (!session) {
        return next(new ApplicationError({ message: 'Session not found.', location: __locationObject, apiStatusCode: 404 }));
    }
    if (session.status !== 'in_progress') {
        return next(new ApplicationError({ message: 'This session is already completed.', location: __locationObject, apiStatusCode: 400 }));
    }

    const result = await MongoDB_Helper.deleteRecords(
        COLLECTIONS.BALL_RECORDS,
        { sessionId: new ObjectId(sessionId), overNumber: Number(overNumber), ballNumber: Number(ballNumber) },
        null,
        true,
    );

    if (!result.deletedCount) {
        return next(new ApplicationError({ message: 'Ball record not found.', location: __locationObject, apiStatusCode: 404 }));
    }

    res.json(ApplicationSuccess.getSuccessObject({}, 'Ball undone successfully.'));
}

const completeSession = async (req, res, next) => {
    const { academyId, role, userID } = getScopeFromRequest(req);
    const { id: sessionId } = req.params;

    const session = await assertSessionAccessible(sessionId, academyId, role, userID);
    if (!session) {
        return next(new ApplicationError({ message: 'Session not found.', location: __locationObject, apiStatusCode: 404 }));
    }
    if (session.status !== 'in_progress') {
        return next(new ApplicationError({ message: 'This session is already completed.', location: __locationObject, apiStatusCode: 400 }));
    }

    await MongoDB_Helper.updateOneRecord(
        COLLECTIONS.SESSIONS,
        { _id: new ObjectId(sessionId) },
        { setObject: { status: 'completed', completedAt: new Date() } },
        null,
    );

    res.json(ApplicationSuccess.getSuccessObject({}, 'Session completed successfully.'));
}

const getSessionAnalysis = async (req, res, next) => {
    const { academyId, role, userID } = getScopeFromRequest(req);
    const { id: sessionId } = req.params;

    const session = await assertSessionAccessible(sessionId, academyId, role, userID);
    if (!session) {
        return next(new ApplicationError({ message: 'Session not found.', location: __locationObject, apiStatusCode: 404 }));
    }

    const sessionObjectId = new ObjectId(sessionId);

    // What was targeted for each parameter in this specific session — shown
    // alongside accuracy so a coach can see expected vs. actual, not just a
    // bare percentage.
    const expectedSelections = session.expectedSelections || [];
    const expectedOptionIds = expectedSelections.map((sel) => sel.parameterOptionId);
    const expectedOptions = expectedOptionIds.length
        ? await MongoDB_Helper.findRecords(COLLECTIONS.PARAMETER_OPTIONS, { _id: { $in: expectedOptionIds } }, {}, null)
        : [];
    const expectedOptionLabelById = new Map(expectedOptions.map((opt) => [opt._id.toString(), opt.label]));
    const expectedLabelByParameterId = new Map(
        expectedSelections.map((sel) => [sel.parameterId.toString(), expectedOptionLabelById.get(sel.parameterOptionId.toString()) ?? null]),
    );

    const ballIds = await MongoDB_Helper.findRecords(COLLECTIONS.BALL_RECORDS, { sessionId: sessionObjectId }, { selectFields: { _id: 1 } }, null);
    const totalBalls = ballIds.length;

    if (totalBalls === 0) {
        // No balls yet — still show what's targeted for each parameter, just
        // with zeroed-out stats, so the coach can see the session's goals
        // before recording starts.
        const parameters = await MongoDB_Helper.findRecords(COLLECTIONS.PARAMETERS, { disciplineId: session.disciplineId }, { sortOn: { name: 1 } }, null);
        return res.json(ApplicationSuccess.getSuccessObject({
            sessionId,
            totalBalls: 0,
            overallAccuracyPercent: 0,
            parameters: parameters.map((param) => ({
                parameterId: param._id,
                parameterName: param.name,
                expectedOptionLabel: expectedLabelByParameterId.get(param._id.toString()) ?? null,
                totalSelections: 0,
                matchedCount: 0,
                accuracyPercent: 0,
            })),
        }));
    }

    const pipeline = [
        { $match: { sessionId: sessionObjectId } },
        { $unwind: '$selections' },
        {
            $facet: {
                byParameter: [
                    {
                        $group: {
                            _id: '$selections.parameterId',
                            totalSelections: { $sum: 1 },
                            matchedCount: { $sum: { $cond: ['$selections.matchedExpected', 1, 0] } },
                        },
                    },
                    { $lookup: { from: COLLECTIONS.PARAMETERS, localField: '_id', foreignField: '_id', as: 'parameterInfo' } },
                    { $unwind: '$parameterInfo' },
                    {
                        $project: {
                            _id: 0,
                            parameterId: '$_id',
                            parameterName: '$parameterInfo.name',
                            totalSelections: 1,
                            matchedCount: 1,
                            accuracyPercent: { $round: [{ $multiply: [{ $divide: ['$matchedCount', '$totalSelections'] }, 100] }, 1] },
                        },
                    },
                    { $sort: { parameterName: 1 } },
                ],
                overall: [
                    {
                        $group: {
                            _id: null,
                            totalSelections: { $sum: 1 },
                            matchedCount: { $sum: { $cond: ['$selections.matchedExpected', 1, 0] } },
                        },
                    },
                ],
            },
        },
    ];

    const [result] = await MongoDB_Helper.findRecords(COLLECTIONS.BALL_RECORDS, pipeline, {}, null);
    const overall = result.overall[0] || { totalSelections: 0, matchedCount: 0 };
    const overallAccuracyPercent = overall.totalSelections > 0 ? Math.round((overall.matchedCount / overall.totalSelections) * 1000) / 10 : 0;

    const parameters = result.byParameter.map((param) => ({
        ...param,
        expectedOptionLabel: expectedLabelByParameterId.get(param.parameterId.toString()) ?? null,
    }));

    res.json(ApplicationSuccess.getSuccessObject({
        sessionId,
        totalBalls,
        overallAccuracyPercent,
        parameters,
    }));
}

module.exports = {
    startSession,
    saveBall,
    undoBall,
    completeSession,
    getSessionAnalysis,
}
