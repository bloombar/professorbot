// Slack integration
const { WebClient, ErrorCode } = require('@slack/web-api');
const slackWebClient = new WebClient(process.env.SLACK_TOKEN);

function SlackAss({ config, assistant }) {

  // store the configuration
  this.config = config;
  this.assistant = assistant;


  // threads this bot has taken part in
  this.threads = []; 

  /**
   * Determine whether a given slack event is a result of this bot posting a message
   */
  this.isFromMe = (e) => {
    // if the incoming message is coming from this bot itself, ignore!
    // console.log(`bot_profile: ${e.bot_profile}`);
    const fromMe = (e.bot_profile && e.bot_profile.app_id == this.config.appId);
    return fromMe;
  }

  /**
   * Determine whether a message is directed to the bot
   */
  this.isToMe = (e) => {
    // the message directed to the bot if it is a DM, mentions the bot, or is in a thread the bot is a part of
    // console.log(`channel type: ${e.channel_type}, type: ${e.type}`);
    let toMe = ( this.isDM(e) || e.type == 'app_mention' || this.isThread(e) ) ? true : false;
    return toMe;
  }

  /**
   * Determine whether this event is within a direct message to the bot.
   */
  this.isDM = (e) => {
    return (e.channel_type == 'im');
  }

  /**
   * Determine whether this event is within a thread
   */
  this.isThread = (e) => {
    return (e.thread_ts && (this.threads.indexOf(e.thread_ts) >= 0) );
  }

  // respond to incoming slack messages
  this.respondToMessage = async (e) => {
    // ignore any messages coming from this bot itself or not directed to the bot
    if (this.isFromMe(e) || !this.isToMe(e)) return false;

    // console.log( '-- slack event --' );
    // console.log(JSON.stringify(e, null, 2));

    // extract salient details
    const incoming = {
      userId: e.user,
      channelId: e.channel,
      message: e.text,
      threadId: e.thread_ts || e.ts // use an existing thread if present
    }

    // get Watson's response to this
    this.assistant.getResponse(incoming.message, incoming.userId, null)
    .then(response => {
      // ignore blank watson responsess
      if (response.trim() == '') return;

      //promise success
      // console.log( '-- response received from watson --' );
      // console.log(response);

      // add the recipient's username to response if not in a direct message or thread
      response = (this.isDM(e) || this.isThread(e) ) ? response : `<@${incoming.userId}> - ${response}`;

      // send watson's response to Slack conversation
      let outgoing = {
        channel: incoming.channelId,
        text: response,
        thread_ts: this.isDM(e) ? null : incoming.threadId // don't use threads in direct messages
      };

      // if posting to a thread, add the threadId to the list
      if (outgoing.thread_ts) {
        this.threads.push(outgoing.thread_ts);
        console.log(`storing thread #${outgoing.thread_ts} in ${this.threads}`);
        console.log(`${e.thread_ts} in list: ${(outgoing.thread_ts in this.threads)}`)
      }

      // post message to Slack
      return slackWebClient.chat.postMessage(outgoing)
      .then(response => {
        // console.log( '-- response posted to slack --' );
        // console.log( JSON.stringify(outgoing.text, null, 2) );
        return response;
      }, err => {
        // console.log( '-- error posting to slack --' );
        // console.error(err);
        throw err;
      });

    }, err => {
      //promise rejection
      // console.log(' -- INVALID WATSON RESPONSE -- ')
      // console.error(JSON.stringify(err, null, 2));
      throw err;
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