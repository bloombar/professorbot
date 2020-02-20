var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser'); // helps process incoming HTTP POST data

// connect to slack events api
const { createEventAdapter } = require('@slack/events-api');
const { respondToMessage, scrapeUsers } = require('./slack-helpers');
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);

// scrape list of slack users
router.get('/scrape-users', scrapeUsers);

// slack events adapter must come before bodyParser, if the latter is used
// router.all('/action-endpoint', slackEvents.requestListener());

router.use(bodyParser.json());  // decode JSON-formatted incoming POST data
router.use(bodyParser.urlencoded({extended: true})); // decode url-encoded incoming POST data
router.all('/action-endpoint', (req, res) => {
    res.send(req.body.challenge)
});

// Attach listeners to events by Slack Event "type". See: https://api.slack.com/events/message.im
// slackEvents.on('message', respondToMessage);
// slackEvents.on('app_mention', respondToMessage);
// slackEvents.on('error', (error) => {
//     console.error(error.name);
// });

//export this router to use in app.js
module.exports = router;
