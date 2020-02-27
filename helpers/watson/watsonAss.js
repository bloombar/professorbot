// IBM Watson integration
const AssistantV2 = require('ibm-watson/assistant/v2');
const { IamAuthenticator } = require('ibm-watson/auth');

function WatsonAss({ config }) {

  // store the configuration
  this.config = config;

  // an associative array of sessions with keys as userIds and values as sessions
  this.sessions = {};

  // create assistant object
  this.assistant = new AssistantV2({
    version: '2019-02-28',
    authenticator: new IamAuthenticator({
      apikey: this.config.iamApiKey
    }),
    url: this.config.url,
  });

  /**
   * Does a session for the given key aleady exist and has it not expired.
   */
  this.sessionExists = (sessionKey) => {
    // is there an existing session for this user and if so, is this session valid?
    // console.log(`-- checking whether session exists for user #${sessionKey} --`)
    const sessionExists = (sessionKey in this.sessions);
    if (sessionExists) {
      // console.log(`-- watson session for user #${sessionKey} exists --`)
      const expired = this.retrieveSession(sessionKey).expired();
      // console.log(`-- watson session for user #${sessionKey} expired = ${expired} --`)
      return !expired;
    }
    else {
      // console.log(`-- watson session for user #${sessionKey} does not exist --`)
      return false;
    }
  }

  /**
   * Return an existing session
   */
  this.retrieveSession = (sessionKey) => {
    // console.log(`-- retrieving existing watson session for user #${sessionKey} -- `);
    return this.sessions[sessionKey];
  }

  /**
   * Save a session
   */
  this.saveSession = (sessionKey, session) => {
    // console.log(`-- saving session key #${session.sessionId} for user #${sessionKey}`);
    this.sessions[sessionKey] = session;

    // prolong the expiration date, since we have now reused the session


    // console.log(`saved ${this.sessions[sessionKey].sessionId}`);
  }

  /**
   * Get a session for a given user.
   * Reuses existing sessions and creates new sessions as needed.
   */
  this.getSession = async (userId) => {
    let session = this.retrieveSession(userId) || await this.createSession(userId);
    // console.log(`-- got a watson session --`);
    // console.log(session);
    return session;
  };

  /**
   * Create a new session for a given user
   */
  this.createSession = async (sessionKey) => {

    // get session id
    return this.assistant.createSession({
      assistantId: this.config.id
    })
    .then(res => {
      // console.log(JSON.stringify(res, null, 2));
      let sessionId = res.result.session_id;
      let session = new WatsonSession(sessionKey, sessionId);

      // console.log(`-- created new watson session #${sessionId} for user # ${sessionKey}--`);
      // console.log(session);

      // save this session for later reuse
      this.saveSession(sessionKey, session);

      return session;
    })
    .catch(err => {
      // console.log('-- error creating watson session --');
      throw err;
    });
  }

  this.preparePayload = (message, sessionId, context={} ) => {

    // assemble the payload to send to Watson
    const payload = {
      assistantId: this.config.id,
      sessionId: sessionId,
      context: context,
      input: {
          'message_type': 'text',
          "text": message
      }
    }
    // console.log(payload);
    return payload;
  }

  /**
   * Get a response from Watson Assistant chatbot.
   * @param message The text stimulus to which Watson Assistant will react. 
   */
  this.getResponse = async (message, sessionKey, context=null) => {
    // get a valid session object
    const session = await this.getSession(sessionKey);

    // prepare data to send to Watson
    let payload = this.preparePayload(message, session.sessionId, context);

    // console.log(' -- preparing payload to watson -- ');
    // console.log(payload);

    // get watson's response
    return this.assistant.message(payload)
      .then(res => {
        // extend our timer for the session since it will now have been extended by Watson
        session.updateExpiration();

        // now clean up the response text
        console.log(`--watson response --\n${JSON.stringify(res.result, null, 2)}`);

        // get the body of the response message
        let responseBody = res.result.output; // the main body

        // reject blank responses
        if (! (responseBody.generic.length && responseBody.generic[0].text) ) {
          throw responseBody;
        }

        // get the response text in the body
        let responseMessage = responseBody.generic[0].text; 

        // debugging
        //console.log(JSON.stringify(res, null, 2));
        //console.log(responseBody.generic[0].text);

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

        // return response
        return responseMessage;
      })
      .catch(err => {
        // console.log(`-- watson response error --`);
        // console.error(err);
        throw err
      });

  } // getResponse

} // WatsonAss


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
    const timeNow = Math.floor(Date.now() / 1000);
    const expired = (timeNow > this.expiration);
    // if (expired) console.log(' -- existing watson session has expired -- ');
    return expired;
  }
  toString() {
    return `(${this.userId} -> ${this.sessionId})`;
  }
}

module.exports = {
  WatsonAss
};
