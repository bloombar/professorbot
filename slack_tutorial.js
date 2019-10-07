const { WebClient, ErrorCode } = require('@slack/web-api');

require('dotenv').config({silent: true});

console.log('Getting started with Node Slack SDK');

// Create a new instance of the WebClient class with the token read from your environment variable
const web = new WebClient(process.env.SLACK_TOKEN);

// The current date
const currentTime = new Date().toTimeString();

try {
    (async () => {
        // Use the `auth.test` method to find information about the installing user
        const res = await web.auth.test();
        const userId = res.user_id;
      
        // send to specific channel ID that we have pre-determined
        // can alternatively send to userId for DM to user who installed app
        const conversationId = 'GP3G8MKT7';  
      
        // Use the `chat.postMessage` method to send a message from this app
        const result = await web.chat.postMessage({
          channel: conversationId,
          text: `The current time is ${currentTime}`,
        });

        // The result contains an identifier for the message, `ts`.
        console.log(`Successfully send message ${result.ts} in conversation ${conversationId}`);

    })();
} catch (error) {
    switch(error.code) {
        case ErrorCode.PlatformError:
            console.log('PlatformError: ' + error.data);
            break;
        case ErrorCode.RequestError:
            console.log('PlatformError: ' + error.original);
            break;
        case ErrorCode.RateLimitedError:
            console.log('RateLimitedError: ' + error.retryAfter);
            break;
        case ErrorCode.HTTPError:
                console.log('HTTPError: ' + error.statusCode + ' - ' + error.statusMessage);
                break;
        default:
        // Some other error, oh no!
        console.log('Well, that was unexpected.');
    };
}
