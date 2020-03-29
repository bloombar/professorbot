const express = require('express');

// connect to slack events api
const { createEventAdapter } = require('@slack/events-api');
const { SlackAss } = require('../helpers/slack/slackAss');

const slackRouter = ({ config, assistant }) => {

    // create an express router
    const router = express.Router();

    // create a helper object
    const slackAss = new SlackAss({ config, assistant });

    // scrape list of slack users
    router.get('/scrape-users', slackAss.scrapeUsers);

    // connect to slack events api
    const slackEvents = createEventAdapter(config.signingSecret);

    // use slack's web api listener to handle incoming events
    router.use('/events', slackEvents.requestListener());

    // Attach listeners to events by Slack Event "type". See: https://api.slack.com/events/message.im
    // slackEvents.on('message', e => console.log(e)); // maybe deprecated
    slackEvents.on('app_mention', slackAss.respondToMessage); // messages directed to the bot in channels 
    slackEvents.on('message', slackAss.respondToMessage); // direct messages to the bot
    slackEvents.on('message.im', slackAss.respondToMessage);
    slackEvents.on('message.groups', slackAss.respondToMessage);
    slackEvents.on('error', (error) => {
        console.error(`Slack event listener error: ${error}` );
    });

    return router;
}

//export this router to use in app.js
module.exports = slackRouter;
