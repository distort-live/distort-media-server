const express = require('express');
const relayController = require('../controllers/relay');

export = (context) => {
    let router = express.Router();
    router.get('/', relayController.getStreams.bind(context));
    router.post('/pull', relayController.pullStream.bind(context));
    router.post('/push', relayController.pushStream.bind(context));
    return router;
};
