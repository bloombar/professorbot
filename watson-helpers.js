require('dotenv').config({silent: true});

// IBM Watson integration
const AssistantV2 = require('ibm-watson/assistant/v2');
const { IamAuthenticator } = require('ibm-watson/auth');

/**
 * Get an assistant object
 * @returns A watson assistant object
 */
const getAssistant = () => {
  let ass = new AssistantV2({
    version: '2019-02-28',
    authenticator: new IamAuthenticator({
      apikey: process.env.ASSISTANT_IAM_APIKEY,
    }),
    url: process.env.ASSISTANT_URL,
  });
  return ass;
}

/**
 * Create a new session with the assistant
 * @param {AssistantV2} assistant An existing watson assistant object
 */
const createSession = async (userId) => {
  console.log('creating session id');

  // get assistant object
  const app = require('./app');
  let assistant = app.assistant;

  // get session id
  await assistant.createSession({
    assistantId: process.env.ASSISTANT_ID
  })
  .then(res => {
    //console.log(JSON.stringify(res, null, 2));
    let sessionId = res.result.session_id;
    let session = new WatsonSession(userId, sessionId);
    app.sessions[userId] = session;
    console.log('-- watson assistant session created --');
    console.log(session);
    return session;
  })
  .catch(err => {
    console.log('-- ERROR CREATING WATSON ASSISTANT SESSION --');
    console.error(err);
  });
}

/**
 * A session with Watson Assistant, including a timestamp of when it was last used
 * Watson sessions last as long as the user keeps interacting,
 * plus an additional 5 minutes on Lite and Standard Plans
 * and up to 60 minutes for Plus and Premium Pklans
 */
class WatsonSession {
  constructor(userId, sessionId) {
    this.userId = userId;
    this.sessionId = sessionId;
    this.updateExpiration();
  }
  updateExpiration() {
    // set the expiration date to the current time plus watson's timeout period after inactivity
    this.expiration = Math.floor(Date.now() / 1000) + parseInt(process.env.ASSISTANT_SESSION_TIMEOUT_SECONDS); // 5 minutes in the future
    // console.log('-- extending watson session --');
    // console.log('new expiration: ' + this.expiration);
    // console.log('time now: ' + Math.floor(Date.now() / 1000));
    // console.log('time left: ' + (this.expiration - Math.floor(Date.now() / 1000)));
  }
  expired() {
    let timeNow = Math.floor(Date.now() / 1000);
    return (timeNow > this.expiration);
  }
  toString() {
    return `(${this.userId} -> ${this.sessionId})`;
  }
}

/**
 * Get a response from Watson Assistant chatbot.
 * @param String message The text stimulus to which Watson Assistantwill react. 
 */
const getResponse = async (message, assistant, userId) => {
  // get session id from user id
  const app = require('./app');
  let session = app.sessions[userId]; // a WatsonSessionObject
  if (session.expired()) {
    // the session is expired... create a new one
    await createSession(userId);
  }
  else {
    console.log('-- session still valild --');
    console.log(Math.floor(Date.now() / 1000) - session.expiration);
  }
  // assuming the session is valid or has been renewed...
  session = app.sessions[userId]; // use the new session
  sessionId = session.sessionId;

  // prepare data to send to Watson
    let payload = {
      assistantId: process.env.ASSISTANT_ID,
      sessionId: sessionId,
      context: {},
      input: {
          'message_type': 'text',
          "text": message
      }
    };
  
    return new Promise((resolve, reject) => {

      // get watson's response
      assistant.message(payload)
        .then(res => {
          // get the body of the response message
          let responseBody = res.result.output; // the main body

          // reject blank responses
          if (responseBody.generic.length == 0) {
            reject(responseBody);
          }

          // get the response text in the body
          let responseMessage = responseBody.generic[0].text || ''; 

          // debugging
          console.log("-- watson-helper.js message --");
          //console.log(JSON.stringify(res, null, 2));
          //console.log(responseBody.generic[0].text);

          // remove any undefined response messages
          responseMessage = (responseMessage) ? responseMessage : ''; 
  
          // add any indicator of confusion, if confidence is low
          let prefixes = ['Hmm... ', 'Well... ', 'Yes... ', 'Ok... ', 'Alright... '];
          let dumbPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
          if (responseBody.intents.length == 0 || (responseBody.intents && responseBody.intents[0].confidence <= 0.5)) {
              responseMessage = dumbPrefix + responseMessage;
          } // end if intent
  
          // do we need to get a grade from Google Sheets?
          if (responseBody.intents.length > 0 && (responseBody.intents && responseBody.intents[0].intent == 'get_grade')) {
            //TO DO
            // GET GRADES FROM GOOGLE
            // INTEGRATE GRADES INTO MESSAGE
  
          } // if intent is get_grade
  
          // sessions are renewed with each request to Watson Assistant
          session.updateExpiration();

          // return response
          response = responseMessage;
          resolve(responseMessage);
        })
        .catch(err => {
            console.error(err);
            reject(err);
        });

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
const updateMessage = (input, response) => {
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
  const invokeToneConversation = (payload, res) => {
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
    updateMessage: updateMessage,
    createSession: createSession,
    getAssistant: getAssistant,
    WatsonSession: WatsonSession
};
