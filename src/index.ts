
import { App } from '@slack/bolt';
import { hId } from './commands/get-id';
import { hChannel } from './commands/channel';
import { hAsk } from './commands/ask';
import { hPurge } from './commands/purge';
import { hEmail } from './commands/email';
import { hAdminAdd } from './commands/admin-add';
import { hYap } from './commands/yap';
import { hPi } from './commands/pi';
import { hPoll, handlePollVote } from './commands/poll';

export const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

app.error(async (error) => {
  console.error('An error occurred:', error);
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
app.command('/h-poll', hPoll);

// Handle poll voting button interactions
app.action(/^poll_vote_\d+$/, handlePollVote);

// Start the app
(async () => {
  await app.start();
  console.log('⚡️ Heidi bot is running!');
})();
