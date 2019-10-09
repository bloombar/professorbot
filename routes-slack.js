var express = require('express');
var router = express.Router();

// connect to slack events api
const { createEventAdapter } = require('@slack/events-api');
const { respondToMessage, scrapeUsers } = require('./slack-helpers');
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);

// scrape list of slack users
router.get('scrape-users', scrapeUsers);

// slack events adapter must come before bodyParser
router.all('/action-endpoint', slackEvents.requestListener());

// Attach listeners to events by Slack Event "type". See: https://api.slack.com/events/message.im
slackEvents.on('message', respondToMessage);
slackEvents.on('app_mention', respondToMessage);
slackEvents.on('error', (error) => {
    console.log(error.name);
});

//export this router to use in app.js
module.exports = router;
