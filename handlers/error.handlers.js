
const { ApplicationError, VW_Logger } = require('vio_node_helpers');
const { __locationObject } = require('../data/common.data');


const apiNotFoundErrorHandler = (req, res) => {
    let errObj = new ApplicationError({message: `Invalid api call [${req.url}]`, location: __locationObject});
    res.json(errObj.getErrorObject());
    return;
  }
  
  const apiErrorHandler = (err, req, res, next) => {
      
    let errObj = err;
    if (typeof err == 'string') {
          let errMsg = err;  
          errObj = new ApplicationError({message: errMsg, location: __locationObject});
    } else if (!(err instanceof ApplicationError)) {
          errObj = new ApplicationError({errorObject: err, location: __locationObject});
    }
    res.json(errObj.getErrorObject());
    return;
  
  }

const uncaughtExceptionHandler = (err) => {
    VW_Logger.error(`Error Occured ${err}`);
    VW_Logger.error(err.stack);
    VW_Logger.error('Catching uncaughtException');
}

const unhandledRejectionHandler = (err) => {
    VW_Logger.error(reason);
    VW_Logger.error(err.stack);
    VW_Logger.error('Catching unhandledRejection');
}


  module.exports = {
    apiErrorHandler,
    apiNotFoundErrorHandler,
    uncaughtExceptionHandler,
    unhandledRejectionHandler
  }
