// IBM Watson integration
const AssistantV2 = require('ibm-watson/assistant/v2');
const { IamAuthenticator } = require('ibm-watson/auth');

// instantiate assistanat
const assistant = new AssistantV2({
    version: '2019-02-28',
    authenticator: new IamAuthenticator({
      apikey: process.env.ASSISTANT_IAM_APIKEY,
    }),
    url: process.env.ASSISTANT_URL,
  });

// get session id
assistant.createSession({
    assistantId: process.env.ASSISTANT_ID
  })
    .then(res => {
      //console.log(JSON.stringify(res, null, 2));
      assistant.sessionId = res.result.session_id;
      console.log(assistant.sessionId);
    })
    .catch(err => {
      console.log(err);
    });
  
/**
 * Get a response from Watson Assistant chatbot.
 * @param String message The text stimulus to which Watson Assistantwill react. 
 */
function getResponse(message) {

      // prepare data to send to Watson
      let payload = {
        assistantId: process.env.ASSISTANT_ID,
        sessionId: assistant.sessionId,
        context: {},
        input: {
            'message_type': 'text',
            "text": message
        }
      };
  
      // get watson's response
      assistant.message(payload)
        .then(res => {
            console.log(JSON.stringify(res, null, 2));

            //TO DO
            // res is full html of response... need to parse that...

            let responseMessage = res.output.text[0] || '';
            responseMessage = (responseMessage) ? responseMessage : ''; // remove undefined
    
            // debugging: output watson's response data
            //console.log('WATSON RESPONSE: ' + JSON.stringify(watsonResponse, null, 2));
    
            // add any indicator of confusion, if confidence is low
            let prefixes = ['Hmm... ', 'Well... ', 'Yes... ', 'Ok... ', 'Alright... '];
            let dumbPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            if (watsonResponse.intents.length == 0 || (watsonResponse.intents && watsonResponse.intents[0].confidence <= 0.5)) {
                responseMessage = dumbPrefix + responseMessage;
            } // end if intent
    
            // do we need to get a grade from Google Sheets?
            if (watsonResponse.intents.length > 0 && (watsonResponse.intents && watsonResponse.intents[0].intent == 'get_grade')) {
            //TO DO
            // GET GRADES FROM GOOGLE
    
            } // if intent is get_grade
    
            response = responseMessage;
            return responseMessage;
        })
        .catch(err => {
            console.log(err);
        });
}

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
  
  
module.exports = {
    getResponse: getResponse,
    invokeToneConversation: invokeToneConversation,
    updateMessage: updateMessage
};
