require('dotenv').config({ silent: true })

const _ = require('lodash')
const fs = require('fs')
const { google } = require('googleapis')

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

const token = fs.readFileSync('google-oauth-token.json', 'utf-8')
oAuth2Client.setCredentials(JSON.parse(token))

/**
 * Read a spreadsheet.
 * @param {string} spreadsheetId
 * @param {string} range
 * @returns {Promise.<Array>}
 */
exports.read = async (spreadsheetId, range) => {
  const sheets = google.sheets({ version: 'v4', auth: oAuth2Client })

  return sheets.spreadsheets.values
    .get({
      spreadsheetId,
      range,
    })
    .then(_.property('data.values'))
}

/**
 * Append content to the next line of a spreadsheet on specified range.
 * @param {string} spreadsheetId
 * @param {string} range
 * @returns {Promise}
 */
exports.append = async (spreadsheetId, range, values) => {
  const sheets = google.sheets({ version: 'v4', auth: this.oAuth2Client })

  return sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values },
  })
}

/**
 * Update cells on a spreadsheet.
 * @param {string} spreadsheetId
 * @param {string} range
 * @returns {Promise}
 */
exports.update = async (spreadsheetId, range, values) => {
  const sheets = google.sheets({ version: 'v4', auth: this.oAuth2Client })

  return sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values },
  })
}

/**
 * Create a new spreadsheet.
 * @param {string} spreadsheetId
 * @param {string} range
 * @returns {Promise}
 */
exports.create = async (title) => {
  const sheets = google.sheets({ version: 'v4', auth: this.oAuth2Client })

  return sheets.spreadsheets.create({
    resource: {
      properties: { title },
    },
  })
}
