const express = require('express');
const bodyParser = require('body-parser'); // parser for post requests

const watsonRouter = (args) => {
  // create an express router
  const router = express.Router();

  const { config, assistant } = args; // extract the config data and assistant object from the params

  // pre-process HTTP POST data
  router.use(bodyParser.json());
  router.use(bodyParser.urlencoded({ extended: false }));

  // Watson endpoint to be called from the client side
  router.post('/message', async (req, res) => {
    // clean up the received data before sending to Watson Assistant
    const message = (req.body && req.body.input) ? req.body.input: null;
    const userId = (req.body.userId) ? req.body.userId : null;
    const context = (req.body.context) ? req.body.context : null;

    return await assistant.getResponse(message, userId, context);
  });

  return router;

}

//export this router to use in app.js
module.exports = watsonRouter;
