'use strict';

require('dotenv').config({silent: true});

const express = require('express'); // app server
const bodyParser = require('body-parser'); // parser for post requests
const port = process.env.PORT || 3000;

// IBM Watson integration
const AssistantV1 = require('watson-developer-cloud/assistant/v1');
const ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');
const toneDetection = require('./addons/tone_detection.js'); // required for tone detection
const maintainToneHistory = false;

// for logging
const uuid = require('uuid');
const vcapServices = require('vcap_services');
const basicAuth = require('basic-auth-connect');

// Slack integration
const { WebClient, ErrorCode } = require('@slack/web-api');
const { createEventAdapter } = require('@slack/events-api');
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);
const slackWebClient = new WebClient(process.env.SLACK_TOKEN);

// Google Sheets integration
const fs = require('fs');
const {authorize, getNewToken, listTeams, googleAPIRun, getCellValue} = require('./google_sheets_funcs');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

// The app owner may optionally configure a cloudand db to track user input.
// This cloudand db is not required, the app will operate without it.
// If logging is enabled the app must also enable basic auth to secure logging
// endpoints
var cloudantCredentials = vcapServices.getCredentials('cloudantNoSQLDB');
var cloudantUrl = null;
if (cloudantCredentials) {
  cloudantUrl = cloudantCredentials.url;
}
cloudantUrl = cloudantUrl || process.env.CLOUDANT_URL; // || '<cloudant_url>';

// respond to incoming slack messages
let incomingSlackMessageEvent = async (e) => {
  // extract salient details
  const userId = e.user;
  const channelId = e.channel;
  const message = e.text;

  // respond to the messages from users where userId is defined
  // (otherwise we get a feedback loop from the bot's own messages)
  if (userId) {
    const currentTime = new Date().toTimeString();
    
    // get watson response
    let payload = {
      workspace_id: process.env.WORKSPACE_ID,
      context: {},
      input: {
        "text": message
      }
    };

    // get watson's response
    assistant.message(payload, async (err, watsonResponse) => {
      let responseMessage = watsonResponse.output.text[0];
      responseMessage = (responseMessage) ? responseMessage : ''; // remove undefined

      // debugging: output watson's response data
      console.log('WATSON RESPONSE: ' + JSON.stringify(watsonResponse, null, 2));

      // add any indicator of confusion, if confidence is low
      if (watsonResponse.intents.length == 0 || (watsonResponse.intents && watsonResponse.intents[0].confidence <= 0.5)) {
        responseMessage = "I'm not sure I understand... " + responseMessage;
      } // end if intent

      // do we need to get a grade from Google Sheets?
      if (watsonResponse.intents.length > 0 && (watsonResponse.intents && watsonResponse.intents[0].intent == 'get_grade')) {

        // get data from Google sheets
        googleAPIRun((oAuth2Client) => {
          // get a particular row and column from the spreadsheet
          getCellValue(oAuth2Client, 8, 2);
        });

      } // if intent is get_grade

      // send message if there is one
      if (responseMessage.trim() != '') {
        // add the recipient's username to response
        responseMessage = '<@' + userId + '> - ' + responseMessage

        // send watson's response to Slack conversation
        let payload = {
          channel: channelId,
          text: responseMessage,
        };

        //console.log('SLACK MESSAGE: ' + JSON.stringify(payload, null, 2));

        // post message to Slack
        const result = await slackWebClient.chat.postMessage(payload);


      }

    }); // assistant.message
    
  } // if userid

  // debugging
  // console.log(`Received a message event: user ${userId} in channel ${channelId} says '${message}'.`);

}; // incomingSlackMessageEvent

// instantiate web server
var logs = null;
var app = express();

// slack events adapter must come before bodyParser
app.use('/api/slack/action-endpoint', slackEvents.requestListener());

// Attach listeners to events by Slack Event "type". See: https://api.slack.com/events/message.im
slackEvents.on('message', incomingSlackMessageEvent);
slackEvents.on('app_mention', incomingSlackMessageEvent);
slackEvents.on('error', (error) => {
  console.log(error.name);
});

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

// Instantiate the Watson AssistantV1 Service as per WDC 2.2.0
var assistant = new AssistantV1({
  version: '2017-05-26'
});

// Instantiate the Watson Tone Analyzer Service as per WDC 2.2.0
var toneAnalyzer = new ToneAnalyzerV3({
  version: '2017-09-21'
});

// Watson endpoint to be called from the client side
app.post('/api/message', (req, res) => {
  var workspace = process.env.WORKSPACE_ID || '<workspace-id>';
  if (!workspace || workspace === '<workspace-id>') {
    return res.json({
      'output': {
        'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
      }
    });
  }

  var payload = {
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

/**
 * Updates the response text using the intent confidence
 *
 * @param {Object}
 *                input The request to the Assistant service
 * @param {Object}
 *                response The response from the Assistant service
 * @return {Object} The response with the updated message
 */
function updateMessage(input, response) {
  var responseText = null;
  var id = null;

  if (!response.output) {
    response.output = {};
  } else {
    if (logs) {
      // If the logs db is set, then we want to record all input and responses
      id = uuid.v4();
      logs.insert({'_id': id, 'request': input, 'response': response, 'time': new Date()});
    }
    return response;
  }

  if (response.intents && response.intents[0]) {
    var intent = response.intents[0];
    // Depending on the confidence of the response the app can return different
    // messages.
    // The confidence will vary depending on how well the system is trained. The
    // service will always try to assign
    // a class/intent to the input. If the confidence is low, then it suggests
    // the service is unsure of the
    // user's intent . In these cases it is usually best to return a
    // disambiguation message
    // ('I did not understand your intent, please rephrase your question',
    // etc..)
    if (intent.confidence >= 0.75) {
      responseText = 'I understood your intent was ' + intent.intent;
    } else if (intent.confidence >= 0.5) {
      responseText = 'I think your intent was ' + intent.intent;
    } else {
      responseText = 'I did not understand your intent';
    }
  }
  response.output.text = responseText;
  if (logs) {
    // If the logs db is set, then we want to record all input and responses
    id = uuid.v4();
    logs.insert({'_id': id, 'request': input, 'response': response, 'time': new Date()});
  }
  return response;
}

/**
 * @author April Webster
 * @returns {Object} return response from Assistant service
 *          invokeToneConversation calls the invokeToneAsync function to get the
 *          tone information for the user's input text (input.text in the
 *          payload json object), adds/updates the user's tone in the payload's
 *          context, and sends the payload to the Assistant service to get a
 *          response which is printed to screen.
 * @param {Json}
 *                payload a json object containing the basic information needed
 *                to converse with the Assistant Service's message endpoint.
 * @param {Object}
 *                res response object
 *
 */
function invokeToneConversation(payload, res) {
  toneDetection.invokeToneAsync(payload, toneAnalyzer).then(function(tone) {
    toneDetection.updateUserTone(payload, tone, maintainToneHistory);
    assistant.message(payload, function(err, data) {
      var returnObject = null;
      if (err) {
        console.error(JSON.stringify(err, null, 2));
        returnObject = res.status(err.code || 500).json(err);
      } else {
        returnObject = res.json(updateMessage(payload, data));
      }
      return returnObject;
    });
  }).catch(function(err) {
    console.log(JSON.stringify(err, null, 2));
  });
}

module.exports = app;
