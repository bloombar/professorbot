// Slack integration
const { WebClient, ErrorCode } = require('@slack/web-api');
const slackWebClient = new WebClient(process.env.SLACK_TOKEN);

// Watson integration
const { getResponse, createSession } = require('./watson-helpers');

// respond to incoming slack messages
async function respondToMessage(e) {
  // extract salient details
  const userId = e.user;
  const channelId = e.channel;
  const message = e.text; // the text of the message posted to slack

  // respond to the messages from users where userId is defined
  // (otherwise we get a feedback loop from the bot's own messages)
  if (userId) {

    // load this user's sessionId or create new one
    const app = require('./app');
    if (!(userId in app.sessions)) {
      await createSession(userId);
    }
    else {
      console.log('existing session id ' + app.sessions[userId]);
    }

    // get Watson's response to this
    getResponse(message, app.assistant, userId).then(response => {
      //promise success
      console.log("-- slack-helper.js respondToMessage --");
      console.log(response);
  
      // send Watson's response back to Slack
      if (response.trim() != '') {
        // add the recipient's username to response
        response = '<@' + userId + '> - ' + response
  
        // send watson's response to Slack conversation
        let payload = {
          channel: channelId,
          text: response,
        };
  
        // post message to Slack
        const result = slackWebClient.chat.postMessage(payload).then(response => {
          console.log( '-- posted response to slack --');
        }, error => {
          console.log('SLACK POSTING ERROR');
          console.error(error);
        });
  
        // debugging
        //console.log('SLACK MESSAGE: ' + JSON.stringify(payload, null, 2));
  
      } //responseMessage != ''
        
    }, error => {
      //promise rejection
      console.log(' -- INVALID WATSON RESPONSE -- ')
      console.error(JSON.stringify(error, null, 2));
    });


  } // if userid

  // debugging
  // console.log(`Received a message event: user ${userId} in channel ${channelId} says '${message}'.`);

}; // incomingSlackMessageEvent

async function scrapeUsers(req, res) {
  const result = await slackWebClient.users.list();
  //console.log(JSON.stringify(result, null, 2));

  // develop a collection of members' names and email addresses
  let users = [];
  result.members.forEach(member => {
    // only concern ourselves with members with email addresses
    if (member.profile.email) {
      let memberDetails = {
        id: member.id,
        first_name: member.profile.first_name,
        last_name: member.profile.last_name,
        real_name: member.profile.real_name,
        email: member.profile.email
      };
      users.push(memberDetails);
      console.log(JSON.stringify(memberDetails));
    } // if email
  }); //foreach member

  res.send('slack users scraped!');
}

module.exports = {
  respondToMessage: respondToMessage,
  scrapeUsers: scrapeUsers
};