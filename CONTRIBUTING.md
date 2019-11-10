# Setup
This bot requires three systems: a Slack workspace with the bot installed, a Watson Assistant instance, and a Node.js app that brokers messages between the two.

## Watson
1. Create an account with Watson
2. Create an Assistant
3. Import the skill file named `skill-Basic-conversation.json` into the Assistant as a starting point for the conversation.
4. Locate and take note of the following assistant settings: ASSISTANT_IAM_APIKEY, ASSISTANT_URL, ASSISTANT_ID, ASSISTANT_WORKSPACE_ID - copy/paste these into the `.env` file of the Node.js app.

## Slack
1. Create an account with the Slack API
2. Click to create a new Slack App and select a workspace where it should install
3. Install the app in the selected workspace
4. Locate and take note of the following app settings: Bot User OAuth Access Token, and Signing Secret - copy/paste these into the `.env` file of the Node.js app.
5. Under `Event Subscriptions`, click to enable events and enter the url of your Node.js app's slack-related endpoint, e.g. `http://your-domain/api/slack/action-endpoint`, where your-domain is either a server where you have hosted the node.js app, or an ngrok url obtained by installing ngrok and running the command, `ngrok http 3000`, on your local machine - this sets up forwarding from an ngrok url to your local machine's IP so Slack can contact your Node.js app on your local machine, even if it is not yet hosted on a public web server.
6. Also under `Event Subscriptions`, subscribe the bot to the following events: `app_mention` and `message.im`.s

## Google Sheets
Coming soon.

## Node.js
1. `npm install` to install all dependencies
2. `npm start` to start up the bot.  If using nodemon, use `nodemon npm start` instead.

# Code

* Our style guide is based on [Google's](https://google.github.io/styleguide/jsguide.html), most of it is automaticaly enforced (and can be automatically applied with `npm run autofix`)
* Commits should follow the [Angular commit message guidelines](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#-commit-message-guidelines). This is because our release tool uses this format for determining release versions and generating changelogs. To make this easier, we recommend using the [Commitizen CLI](https://github.com/commitizen/cz-cli) with the `cz-conventional-changelog` adapter.

