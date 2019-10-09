'use strict';

require('dotenv').config({silent: true});

const express = require('express'); // app server
const bodyParser = require('body-parser'); // parser for post requests
const port = process.env.PORT || 3000;

// IBM Watson integration
const AssistantV2 = require('ibm-watson/assistant/v2');
const { IamAuthenticator } = require('ibm-watson/auth');

// const ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');
// const toneDetection = require('./addons/tone_detection.js'); // required for tone detection
// const maintainToneHistory = false;

// for logging
// const uuid = require('uuid');
// const vcapServices = require('vcap_services');
// const basicAuth = require('basic-auth-connect');

// Google Sheets integration
const fs = require('fs');
const helpers = require('./helpers/google-sheet');
// usage:
//const rows = await helpers.read(process.env.GOOGLE_SHEET_ID, 'Overall!A:Z');
//await helpers.append(process.env.GOOGLE_SHEET_ID, 'Access!Y:Z', [ ["1", "2", "3"], ["4", "5", "6"] ]);
//await helpers.update(process.env.GOOGLE_SHEET_ID, 'Access!Y7:AA', [ ["A", "B", "C"], ["D", "E", "F"] ]);
//await helpers.create('Example spreadsheet');

// instantiate web server
var logs = null;
var app = express();

// load Slack API routes
app.use('/api/slack', require('./routes-slack'));

// load Watson API routes
app.use('/api/watson', require('./routes-watson'));

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

// instantiate assistant
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
    //console.log(assistant.sessionId);
  })
  .catch(err => {
    console.log(err);
  });

// Instantiate the Watson Tone Analyzer Service as per WDC 2.2.0
// var toneAnalyzer = new ToneAnalyzerV3({
//   version: '2017-09-21'
// });

module.exports = app;
