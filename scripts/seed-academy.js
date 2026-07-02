// One-off bootstrap script: creates the first academy_head user for a new
// academy. Run manually — there is no public registration route by design.
//
// Usage:
//   node scripts/seed-academy.js "<coach name>" "<email>" "<password>"
//
// An academyId (a fresh ObjectId) is minted for this run and printed at the
// end — record it, since every other user/player/taxonomy record for this
// academy must be created with that same academyId.

const dns = require('dns');
const { VW_Environment, Implementation_Manager, MongoDB_Helper } = require('vio_node_helpers');
const { COLLECTIONS, ROLES } = require('../data/constants.data');
const { hashPassword } = require('../helpers/auth.helpers');

// See coachassistbackend.js for why this is needed against the Atlas (mongodb+srv://) cluster.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const { ObjectId } = MongoDB_Helper;

const run = async () => {
    const [name, email, password] = process.argv.slice(2);

    if (!name || !email || !password) {
        console.log('Usage: node scripts/seed-academy.js "<coach name>" "<email>" "<password>"');
        process.exit(1);
    }

    // VW_Environment.setEnvironment() derives the conf filename from the entry
    // script's name (would look for seed-academy.conf). Point it at the app's
    // own conf file instead, since this script shares the same deployment config.
    VW_Environment.ROOT_DIRECTORY = process.cwd();
    VW_Environment.CONFIG_FILENAME = 'coachassistbackend.conf';
    VW_Environment.environment = process.env.VWENV;
    VW_Environment.readAndSetConfiguration();

    await Implementation_Manager.initDbConnectionsForImplementation();

    const existing = await MongoDB_Helper.findRecords(COLLECTIONS.USERS, { email: email.toLowerCase() }, {}, null);
    if (existing[0]) {
        console.log(`A user with email [${email}] already exists (academyId: ${existing[0].academyId}).`);
        process.exit(1);
    }

    const academyId = new ObjectId().toString();
    const passwordHash = await hashPassword(password);

    const userDoc = {
        academyId,
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: ROLES.ACADEMY_HEAD,
    };

    const result = await MongoDB_Helper.insertRecords(COLLECTIONS.USERS, userDoc, null);

    console.log('Academy head created successfully.');
    console.log(`  academyId: ${academyId}`);
    console.log(`  userId:    ${result.insertedId}`);
    console.log(`  email:     ${userDoc.email}`);

    process.exit(0);
}

run().catch((err) => {
    console.error('Failed to seed academy head:', err);
    process.exit(1);
});
