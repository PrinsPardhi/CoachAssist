const { MongoDB_Helper } = require('vio_node_helpers');
const { COLLECTIONS } = require('../data/constants.data');

// Idempotent: createIndex is a no-op if an identical index already exists.
// Run once at server startup so a fresh database is always correctly indexed.
const ensureIndexes = async () => {
    const usersCollection = await MongoDB_Helper.getCollection(null, COLLECTIONS.USERS);
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ academyId: 1 });

    const playersCollection = await MongoDB_Helper.getCollection(null, COLLECTIONS.PLAYERS);
    await playersCollection.createIndex({ academyId: 1 });

    const sportsCollection = await MongoDB_Helper.getCollection(null, COLLECTIONS.SPORTS);
    await sportsCollection.createIndex({ academyId: 1 });

    const disciplinesCollection = await MongoDB_Helper.getCollection(null, COLLECTIONS.DISCIPLINES);
    await disciplinesCollection.createIndex({ academyId: 1 });
    await disciplinesCollection.createIndex({ sportId: 1 });

    const parametersCollection = await MongoDB_Helper.getCollection(null, COLLECTIONS.PARAMETERS);
    await parametersCollection.createIndex({ academyId: 1 });
    await parametersCollection.createIndex({ disciplineId: 1 });

    const parameterOptionsCollection = await MongoDB_Helper.getCollection(null, COLLECTIONS.PARAMETER_OPTIONS);
    await parameterOptionsCollection.createIndex({ parameterId: 1 });

    const sessionsCollection = await MongoDB_Helper.getCollection(null, COLLECTIONS.SESSIONS);
    await sessionsCollection.createIndex({ academyId: 1 });
    await sessionsCollection.createIndex({ playerId: 1, sportId: 1 });

    const ballRecordsCollection = await MongoDB_Helper.getCollection(null, COLLECTIONS.BALL_RECORDS);
    await ballRecordsCollection.createIndex({ sessionId: 1, overNumber: 1, ballNumber: 1 }, { unique: true });
}

module.exports = {
    ensureIndexes,
}
