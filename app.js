'use strict'

const express = require('express') // app server

// load routes
const slackRouter = require('./routes/slackRouter')
const watsonRouter = require('./routes/watsonRouter')

// IBM Watson integration
const { WatsonAss } = require('./helpers/watson/watsonAss')
const AssistantV2 = require('ibm-watson/assistant/v2')
const { IamAuthenticator } = require('ibm-watson/auth')

// Google Sheets integration
const fs = require('fs')
const googleSheets = require('./helpers/google/google-sheet')
// usage:
//const rows = await googleSheets.read(process.env.GOOGLE_SHEET_ID, 'Overall!A:Z');
//await googleSheets.append(process.env.GOOGLE_SHEET_ID, 'Access!Y:Z', [ ["1", "2", "3"], ["4", "5", "6"] ]);
//await googleSheets.update(process.env.GOOGLE_SHEET_ID, 'Access!Y7:AA', [ ["A", "B", "C"], ["D", "E", "F"] ]);
//await googleSheets.create('Example spreadsheet');

const botApp = (config) => {
  console.log('-- APP STARTING UP --')

  // instantiate web server
  const app = express()

  // instantiate assistant instance and pass it the watson-specific config settings
  app.assistant = new WatsonAss({ config: config.watson })

  // load Slack API routes
  app.use(
    '/api/slack',
    slackRouter({ config: config.slack, assistant: app.assistant })
  ) // pass the slack config settings to the router in an object

  // load Watson API routes
  app.use(
    '/api/watson',
    watsonRouter({ config: config.watson, assistant: app.assistant })
  )

  return app
}

module.exports = botApp
