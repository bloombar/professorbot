/**
 * Before accessing Google's API we need to authorize this application by visiting a unique URL.
 * To generate the URL, use the code below.
 *
 * Attribution: code from https://www.woolha.com/tutorials/node-js-using-google-sheets-api-with-oauth-2
 */

require('dotenv').config({ silent: true })
const fs = require('fs')
const { google } = require('googleapis')

//const credentials = JSON.parse(fs.readFileSync('google-client-secret.json', 'utf-8'));
const credentials = JSON.parse(
  fs.readFileSync(process.env.GOOGLE_CREDENTIALS_PATH, 'utf-8')
)

const {
  client_secret: clientSecret,
  client_id: clientId,
  redirect_uris: redirectUris,
} = credentials.installed

const oAuth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  redirectUris[0]
)

// Generate a url that asks permissions for Gmail scopes
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

const url = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
})

console.info(`authUrl: ${url}`)
