const path = require('path');

require('dotenv').config(); // to get environmental variables

const config = {
    server: {
        port: process.env.PORT
    },
    slack: {
        token: process.env.SLACK_TOKEN,
        signingSecret: process.env.SLACK_SIGNING_SECRET,
        appId: process.env.SLACK_APP_ID,
        challengeMode: process.env.SLACK_CHALLENGE_MODE
    },
    watson: {
        iamApiKey: process.env.ASSISTANT_IAM_APIKEY,
        url: process.env.ASSISTANT_URL,
        id: process.env.ASSISTANT_ID,
        workspaceId: process.env.ASSISTANT_WORKSPACE_ID,
        sessionTimeoutSeconds: process.env.ASSISTANT_SESSION_TIMEOUT_SECONDS
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        sheetId: process.env.GOOGLE_SHEET_ID,
        tokenPath: process.env.GOOGLE_TOKEN_PATH,
        credentialsPath: process.env.GOOGLE_CREDENTIALS_PATH
    }
}

module.exports = config;
