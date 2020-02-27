// Slack integration
const { WebClient, ErrorCode } = require('@slack/web-api');
const slackWebClient = new WebClient(process.env.SLACK_TOKEN);

function SlackAss({ config, assistant }) {

  // store the configuration
  this.config = config;
  this.assistant = assistant;

  /**
   * Determine whether a given slack event is a result of this bot posting a message
   */
  this.isMyEvent = (e) => {
    // if the incoming message is coming from this bot itself, ignore!
    if (e.bot_profile && e.bot_profile.app_id == this.config.appId)
      return true;
  }

  // respond to incoming slack messages
  this.respondToMessage = async (e) => {
    // ignore any messages coming from this bot itself
    if (this.isMyEvent(e)) return false;

    console.log( '-- incoming message received from slack --' );
    // console.log(e.text);
    // console.log(`incoming message: ${JSON.stringify(e, null, 0)}`); // debug incoming message

    // extract salient details
    const incoming = {
      userId: e.user,
      channelId: e.channel,
      message: e.text
    }

    // get Watson's response to this
    this.assistant.getResponse(incoming.message, incoming.userId, null)
    .then(response => {
      // ignore blank watson responsess
      if (response.trim() == '') return;

      //promise success
      console.log( '-- response received from watson --' );
      console.log(response);

      // add the recipient's username to response
      response = `<@${incoming.userId}> - ${response}`;

      // send watson's response to Slack conversation
      let outgoing = {
        channel: incoming.channelId,
        text: response,
      };

      // post message to Slack
      const result = slackWebClient.chat.postMessage(outgoing)
      .then(response => {
        console.log( '-- response posted to slack --' );
        console.log( JSON.stringify(outgoing.text, null, 2) );
      }, err => {
        console.log( '-- error posting to slack --' );
        console.error(err);
      });


    }, err => {
      //promise rejection
      console.log(' -- INVALID WATSON RESPONSE -- ')
      console.error(JSON.stringify(err, null, 2));
    });


  }; // incomingSlackMessageEvent

  this.scrapeUsers = async (req, res) => {
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


};


module.exports = {
  SlackAss
};