
const dns = require('dns');
const { Implementation_Manager, VW_Environment, VW_Logger } = require('vio_node_helpers');
const { setErrorHandlersForProject } = require('./helpers/common.helpers.js');
const { ensureIndexes } = require('./helpers/ensureIndexes.helpers.js');
const routes = require('./routedefinitions.js');

// Some networks block/refuse SRV queries to the machine's configured DNS server,
// which breaks mongodb+srv:// (Atlas) lookups. Use public resolvers instead.
dns.setServers(['8.8.8.8', '1.1.1.1']);


const initServer = async () => {
    try {
        await VW_Environment.setEnvironment();
        await Implementation_Manager.initializeImplementation();
        await ensureIndexes();
        setErrorHandlersForProject();
        Implementation_Manager.initializeHttpAndStartServer(routes);
        VW_Logger.info(`Server started and running on port ${VW_Environment.APPLICATION_PORT_NUMBER}`);
    } catch (err) {
        VW_Logger.error(`Error occured while initiating the project. Please contact Administrator.`);
        VW_Logger.error(err);
        VW_Logger.error(err.stack)
        process.exit(111);
    }
}

initServer();
