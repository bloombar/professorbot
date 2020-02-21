var express = require('express');
var router = express.Router();
const { getAssistant, createSession, invokeToneConversation } = require('./watson-helpers');

// Watson endpoint to be called from the client side
router.post('/message', (req, res) => {
    let workspace = process.env.WORKSPACE_ID || '<workspace-id>';
    if (!workspace || workspace === '<workspace-id>') {
      return res.json({
        'output': {
          'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
        }
      });
    }
  
    let payload = {
      workspace_id: workspace,
      context: {},
      input: {}
    };
  
    if (req.body) {
      if (req.body.input) {
        payload.input = req.body.input;
      }
      if (req.body.context) {
        payload.context = req.body.context;
      } else {
  
        // Add the user object (containing tone) to the context object for
        // Assistant
        payload.context = toneDetection.initUser();
  
        // hard-code some context for debugging
        // payload.context.userinfo = {
        //   'username' : 'Foo Barstein'
        // };
  
      }
  
      console.log('CONTEXT: ' + JSON.stringify(payload, null, 2));
  
      // Invoke the tone-aware call to the Assistant Service
      invokeToneConversation(payload, res);
    }
  });

//export this router to use in app.js
module.exports = router;
