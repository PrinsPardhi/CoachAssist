
const { Implementation_Manager } = require("vio_node_helpers");
const { apiErrorHandler, apiNotFoundErrorHandler, uncaughtExceptionHandler, unhandledRejectionHandler } = require("../handlers/error.handlers");


const getCriteriaObjectFromRequest_helper = (req) => {
    let criteriaObject;
    if (req.method == 'POST') {
        criteriaObject = req.body.criteria;
    } else if(req.method == 'GET') {
        criteriaObject = JSON.parse(req.query.criteria);
    }
    return criteriaObject;
}

const setErrorHandlersForProject = () => {
    Implementation_Manager.setApiErrorHandler(apiErrorHandler);
    Implementation_Manager.setApiNotFoundHandler(apiNotFoundErrorHandler);
    Implementation_Manager.setUncaughtExceptionHandler(uncaughtExceptionHandler);
    Implementation_Manager.setUnhandledRejectionHandler(unhandledRejectionHandler);
}


module.exports = {
    getCriteriaObjectFromRequest_helper,
    setErrorHandlersForProject
}
