
import { App } from '@slack/bolt';
import { hId } from './commands/get-id';
import { hChannel } from './commands/channel';
import { hAsk } from './commands/ask';
import { hPurge } from './commands/purge';
import { hEmail } from './commands/email';
import { hAdminAdd } from './commands/admin-add';
import { hYap } from './commands/yap';
import { hPi } from './commands/pi';

export const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  // Add socket mode client options with reconnect configuration
  socketMode: {
    reconnect: true,
    connectRetryConfig: {
      maxReconnectionAttempts: 10,
      retryWhen: (error) => {
        console.log(`Reconnection attempt after error: ${error}`);
        return true;
      }
    }
  }
});

// Enhanced error handling
app.error(async (error) => {
  console.error('An error occurred:', error);
  
  // Check if it's a disconnection error and log more information
  if (error.message && error.message.includes('disconnect')) {
    console.log('Connection to Slack was lost. Attempting to reconnect...');
  }
});

// Register commands
app.command('/h-id', hId);
app.command('/h-channel', hChannel);
app.command('/h-ask', hAsk);
app.command('/h-purge', hPurge);
app.command('/h-email', hEmail);
app.command('/h-admin-add', hAdminAdd);
app.command('/h-yap', hYap);
app.command('/h-pi', hPi);

import { validateTokens } from './utils/token-validator';

// Start the app
(async () => {
  // Validate tokens before starting
  if (validateTokens()) {
    try {
      await app.start();
      console.log('⚡️ Heidi bot is running!');
    } catch (error) {
      console.error('Failed to start the app:', error);
      console.log('Please check your Slack tokens and internet connection.');
    }
  }
})();
