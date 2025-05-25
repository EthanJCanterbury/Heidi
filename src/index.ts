
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

// Handle message events (replies to Heidi's messages)
app.event('message', async ({ event, client }) => {
  // Only respond to threaded replies and ignore bot messages
  if (event.subtype === 'bot_message' || !event.thread_ts || event.bot_id) {
    return;
  }

  try {
    // Get the original message to check if it was from Heidi
    const thread = await client.conversations.replies({
      channel: event.channel,
      ts: event.thread_ts,
      limit: 1
    });

    const originalMessage = thread.messages?.[0];
    
    // Check if the original message was from Heidi (our bot)
    if (originalMessage?.bot_id === process.env.SLACK_BOT_ID || 
        originalMessage?.username === 'Heidi' ||
        originalMessage?.user === process.env.SLACK_USER_ID) {
      
      // Load AI instructions
      const instructions = require('./utils/instructions.json');
      
      // Get user's message text
      const userMessage = event.text || '';
      
      // Call the AI API
      const axios = require('axios');
      const response = await axios.post(
        "https://ai.hackclub.com/chat/completions",
        {
          messages: [
            { role: "system", content: instructions.system_prompt },
            { role: "user", content: userMessage }
          ]
        },
        {
          headers: { "Content-Type": "application/json" }
        }
      );

      // Extract the AI's answer
      const responseData = response.data;
      const aiAnswer = responseData.choices[0].message.content;

      // Reply in the thread
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.thread_ts,
        text: aiAnswer
      });
    }
  } catch (error) {
    console.error('Error handling reply to Heidi message:', error);
  }
});

// Start the app
(async () => {
  await app.start();
  console.log('⚡️ Heidi bot is running!');
})();
