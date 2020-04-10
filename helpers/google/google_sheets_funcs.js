require('dotenv').config({ silent: true })

const fs = require('fs')
const readline = require('readline')
const { google } = require('googleapis')
const GOOGLE_TOKEN_PATH = process.env.GOOGLE_TOKEN_PATH
const GOOGLE_CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH

/**
 * Update the internal Slack IDs in the Google Sheet
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 * @param {Object}[] users An array of user objects.
 */
let addSlackIdsToSheet = (auth, users) => {
  // loop through list of user objects
  users.forEach((user) => {
    console.log(user.id + ' - ' + user.email)
  })
}

/**
 * Get a student's row number from the email address
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 * @param String email The email address of the student.
 */
let getRowNumberByEmail = (auth, email) => {
  let rows = getRows(auth, process.env.GOOGLE_SHEET_ID, 1, 1000)
  rows.map((row) => {
    let cellValue = row[col_num]
    console.log(`CELL VALUE: ${cellValue}`)
    return cellValue
  })
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function getCellValue(auth, row_num, col_num) {
  const sheets = google.sheets({ version: 'v4', auth })
  sheets.spreadsheets.values.get(
    {
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `Overall!${row_num}:${row_num}`,
    },
    (err, res) => {
      if (err) return console.log('The Google API returned an error: ' + err)
      const rows = res.data.values
      if (rows.length) {
        // Print columns A and F, which correspond to indices 0 and 5.
        rows.map((row) => {
          let cellValue = row[col_num]
          console.log(`CELL VALUE: ${cellValue}`)
          return cellValue
        })
      } else {
        console.log('CELL VALUE: no data found.')
        return false
      }
    }
  )
}

/**
 * Get a student's row number from the email address
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 * @param String sheetId The id of the sheet to access.
 * @param Number startRow The row number to start from.
 * @param Number endRow The row number to end on.
 */
let getRows = (auth, sheetId, startRow, endRow) => {
  const sheets = google.sheets({ version: 'v4', auth })
  sheets.spreadsheets.values.get(
    {
      spreadsheetId: sheetId,
      range: `Overall!${startRow}:${endRow}`, // hopefully that's large enough
    },
    (err, res) => {
      if (err) return console.log('The Google API returned an error: ' + err)
      const rows = res.data.values
      return rows.length ? rows : false
    }
  )
}

// run any method that requires authorization first
function googleAPIRun(callback) {
  // Load client secrets from a local file.
  fs.readFile(GOOGLE_CREDENTIALS_PATH, (err, content) => {
    if (err)
      return console.log('Error loading Google API client secret file:', err)
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), callback)
  })
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  )

  // Check if we have previously stored a token.
  fs.readFile(GOOGLE_TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback)
    oAuth2Client.setCredentials(JSON.parse(token))
    callback(oAuth2Client)
  })
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  })
  console.log('Authorize this app by visiting this url:', authUrl)
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close()
    oAuth2Client.getToken(code, (err, token) => {
      if (err)
        return console.error('Error while trying to retrieve access token', err)
      oAuth2Client.setCredentials(token)
      // Store the token to disk for later program executions
      fs.writeFile(GOOGLE_TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err)
        console.log('Token stored to', GOOGLE_TOKEN_PATH)
      })
      callback(oAuth2Client)
    })
  })
}

module.exports = {
  authorize: authorize,
  getNewToken: getNewToken,
  googleAPIRun: googleAPIRun,
  getCellValue: getCellValue,
  addSlackIdsToSheet: addSlackIdsToSheet,
  getRowNumberByEmail: getRowNumberByEmail,
}
