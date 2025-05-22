
import { App } from '@slack/bolt';
import { hId } from './commands/get-id';
import { hChannel } from './commands/channel';
import { hAsk } from './commands/ask';
import { hPurge } from './commands/purge';
import { hEmail } from './commands/email';
import { hAdminAdd } from './commands/admin-add';

export const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  customRoutes: [
    {
      path: '/health',
      method: ['GET'],
      handler: (req, res) => {
        res.writeHead(200);
        res.end('Health check OK');
      },
    },
  ],
});

let retryCount = 0;
const maxRetries = 5;
const retryDelay = 5000; // 5 seconds

app.error(async (error) => {
  console.error('An error occurred:', error);
  
  if (error.message?.includes('server explicit disconnect') && retryCount < maxRetries) {
    retryCount++;
    console.log(`Attempting to reconnect (${retryCount}/${maxRetries}) in ${retryDelay/1000} seconds...`);
    
    setTimeout(async () => {
      try {
        await app.start();
        console.log('⚡️ Reconnected successfully!');
        retryCount = 0;
      } catch (reconnectError) {
        console.error('Reconnection failed:', reconnectError);
      }
    }, retryDelay);
  }
});

// Register commands
app.command('/h-id', hId);
app.command('/h-channel', hChannel);
app.command('/h-ask', hAsk);
app.command('/h-purge', hPurge);
app.command('/h-email', hEmail);
app.command('/h-admin-add', hAdminAdd);

// Start the app
(async () => {
  await app.start();
  console.log('⚡️ Hedi bot is running!');
})();
