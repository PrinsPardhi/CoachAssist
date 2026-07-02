const COLLECTIONS = {
    USERS: 'users',
    PLAYERS: 'players',
    SPORTS: 'sports',
    DISCIPLINES: 'disciplines',
    PARAMETERS: 'parameters',
    PARAMETER_OPTIONS: 'parameterOptions',
    SESSIONS: 'sessions',
    BALL_RECORDS: 'ballRecords',
}

const ROLES = {
    ACADEMY_HEAD: 'academy_head',
    HEAD_COACH: 'head_coach',
    COACH: 'coach',
}

const ALL_ROLES = Object.values(ROLES);

module.exports = {
    COLLECTIONS,
    ROLES,
    ALL_ROLES,
}
