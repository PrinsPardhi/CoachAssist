const { MongoDB_Helper } = require('vio_node_helpers');
const { COLLECTIONS, ROLES } = require('../data/constants.data');

const { ObjectId } = MongoDB_Helper;

// A coach only sees/acts on players assigned to them; academy_head/head_coach
// are unrestricted within their own academy.
const assertPlayerAccessible = async (playerId, academyId, role, userID) => {
    const query = { _id: new ObjectId(playerId), academyId };
    if (role === ROLES.COACH) {
        query.assignedCoaches = new ObjectId(userID);
    }
    const players = await MongoDB_Helper.findRecords(COLLECTIONS.PLAYERS, query, {}, null);
    return players[0];
}

// A coach only sees/acts on sessions they recorded; academy_head/head_coach
// are unrestricted within their own academy.
const assertSessionAccessible = async (sessionId, academyId, role, userID) => {
    const query = { _id: new ObjectId(sessionId), academyId };
    if (role === ROLES.COACH) {
        query.coachId = new ObjectId(userID);
    }
    const sessions = await MongoDB_Helper.findRecords(COLLECTIONS.SESSIONS, query, {}, null);
    return sessions[0];
}

module.exports = {
    assertPlayerAccessible,
    assertSessionAccessible,
}
