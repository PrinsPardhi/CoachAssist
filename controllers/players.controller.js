const { MongoDB_Helper, ApplicationError, ApplicationSuccess } = require('vio_node_helpers');
const { __locationObject } = require('../data/common.data');
const { COLLECTIONS, ROLES } = require('../data/constants.data');
const { getScopeFromRequest } = require('../helpers/scope.helpers');
const { assertPlayerAccessible } = require('../helpers/access.helpers');

const { ObjectId } = MongoDB_Helper;

const createPlayer = async (req, res) => {
    const { academyId } = getScopeFromRequest(req);
    const { name, dob, assignedCoaches } = req.body;

    const playerDoc = {
        academyId,
        name,
        dob,
        assignedCoaches: assignedCoaches.map((id) => new ObjectId(id)),
    };

    const result = await MongoDB_Helper.insertRecords(COLLECTIONS.PLAYERS, playerDoc, null);

    res.json(ApplicationSuccess.getSuccessObject({ _id: result.insertedId, ...playerDoc }, 'Player created successfully.'));
}

const listPlayers = async (req, res) => {
    const { academyId, role, userID } = getScopeFromRequest(req);

    const query = { academyId };
    if (role === ROLES.COACH) {
        query.assignedCoaches = new ObjectId(userID);
    }

    const players = await MongoDB_Helper.findRecords(COLLECTIONS.PLAYERS, query, { sortOn: { name: 1 } }, null);

    res.json(ApplicationSuccess.getSuccessObject(players));
}

const getPlayer = async (req, res, next) => {
    const { academyId, role, userID } = getScopeFromRequest(req);
    const { id } = req.params;

    const player = await assertPlayerAccessible(id, academyId, role, userID);
    if (!player) {
        return next(new ApplicationError({ message: 'Player not found.', location: __locationObject, apiStatusCode: 404 }));
    }

    res.json(ApplicationSuccess.getSuccessObject(player));
}

// Trend across sessions for a player, optionally narrowed to a sport/discipline
// and a look-back window (range = days). One entry per session, chronological.
const getPlayerAnalysis = async (req, res, next) => {
    const { academyId, role, userID } = getScopeFromRequest(req);
    const { id: playerId } = req.params;
    const { sportId, disciplineId, range } = req.validatedQuery;

    const player = await assertPlayerAccessible(playerId, academyId, role, userID);
    if (!player) {
        return next(new ApplicationError({ message: 'Player not found.', location: __locationObject, apiStatusCode: 404 }));
    }

    const match = { playerId: new ObjectId(playerId), academyId };
    if (sportId) match.sportId = new ObjectId(sportId);
    if (disciplineId) match.disciplineId = new ObjectId(disciplineId);
    if (range) {
        const rangeStart = new Date(Date.now() - range * 24 * 60 * 60 * 1000);
        match.startedAt = { $gte: rangeStart };
    }

    const pipeline = [
        { $match: match },
        { $sort: { startedAt: 1 } },
        { $lookup: { from: COLLECTIONS.BALL_RECORDS, localField: '_id', foreignField: 'sessionId', as: 'balls' } },
        {
            $addFields: {
                totalBalls: { $size: '$balls' },
                allSelections: {
                    $reduce: {
                        input: '$balls',
                        initialValue: [],
                        in: { $concatArrays: ['$$value', '$$this.selections'] },
                    },
                },
            },
        },
        {
            $addFields: {
                totalSelections: { $size: '$allSelections' },
                matchedSelections: {
                    $size: { $filter: { input: '$allSelections', cond: { $eq: ['$$this.matchedExpected', true] } } },
                },
            },
        },
        {
            $facet: {
                sessions: [
                    {
                        $project: {
                            _id: 0,
                            sessionId: '$_id',
                            sportId: 1,
                            disciplineId: 1,
                            plannedOvers: 1,
                            status: 1,
                            startedAt: 1,
                            completedAt: 1,
                            totalBalls: 1,
                            overallAccuracyPercent: {
                                $cond: [
                                    { $gt: ['$totalSelections', 0] },
                                    { $round: [{ $multiply: [{ $divide: ['$matchedSelections', '$totalSelections'] }, 100] }, 1] },
                                    0,
                                ],
                            },
                        },
                    },
                ],
                // Every selection across every matched session, grouped by
                // parameter — this is the "how is this player doing on Line
                // overall this month" view, as opposed to the per-session
                // breakdown which only covers one session at a time.
                parameterBreakdown: [
                    { $unwind: '$allSelections' },
                    {
                        $group: {
                            _id: '$allSelections.parameterId',
                            totalSelections: { $sum: 1 },
                            matchedCount: { $sum: { $cond: ['$allSelections.matchedExpected', 1, 0] } },
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
                            totalSelections: { $sum: '$totalSelections' },
                            matchedSelections: { $sum: '$matchedSelections' },
                        },
                    },
                ],
            },
        },
    ];

    const [result] = await MongoDB_Helper.findRecords(COLLECTIONS.SESSIONS, pipeline, {}, null);
    const overallAgg = result.overall[0] || { totalSelections: 0, matchedSelections: 0 };
    const overallAccuracyPercent =
        overallAgg.totalSelections > 0 ? Math.round((overallAgg.matchedSelections / overallAgg.totalSelections) * 1000) / 10 : 0;

    res.json(ApplicationSuccess.getSuccessObject({
        playerId,
        sessions: result.sessions,
        parameters: result.parameterBreakdown,
        overallAccuracyPercent,
    }));
}

module.exports = {
    createPlayer,
    listPlayers,
    getPlayer,
    getPlayerAnalysis,
}
