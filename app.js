'use strict';

require('dotenv').config({silent: true});

const express = require('express'); // app server
const bodyParser = require('body-parser'); // parser for post requests
const port = process.env.PORT || 3000;

// IBM Watson integration
const { getAssistant, createSession } = require('./watson-helpers');
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
const googleSheets = require('./helpers/google-sheet');
// usage:
//const rows = await googleSheets.read(process.env.GOOGLE_SHEET_ID, 'Overall!A:Z');
//await googleSheets.append(process.env.GOOGLE_SHEET_ID, 'Access!Y:Z', [ ["1", "2", "3"], ["4", "5", "6"] ]);
//await googleSheets.update(process.env.GOOGLE_SHEET_ID, 'Access!Y7:AA', [ ["A", "B", "C"], ["D", "E", "F"] ]);
//await googleSheets.create('Example spreadsheet');

console.log('-- APP STARTING UP --');

// instantiate web server
var logs = null;
var app = express();

// load Slack API routes
app.use('/api/slack', require('./routes-slack'));

// load Watson API routes
app.use('/api/watson', require('./routes-watson'));

// instantiate assistant instance
app.assistant = getAssistant();
app.sessions = {}; // associative array to hold unique session ids for each correspondent

// Instantiate the Watson Tone Analyzer Service as per WDC 2.2.0
// var toneAnalyzer = new ToneAnalyzerV3({
//   version: '2017-09-21'
// });

module.exports = app;
