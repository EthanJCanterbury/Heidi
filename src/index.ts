import { App } from '@slack/bolt';
import { hId } from './commands/get-id';
import { hChannel } from './commands/channel';
import { hAsk } from './commands/ask';
import { hPurge } from './commands/purge';
import { hEmail } from './commands/email';
import { hAdminAdd } from './commands/admin-add';
import { hPoll, handlePollVote } from './commands/poll';

export const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

app.error(async (error) => {
  console.error('An error occurred:', error);
  
  // Don't crash the app for channel-related errors
  if (error.code === 'slack_webapi_platform_error') {
    console.log('Slack API error handled, continuing...');
    return;
  }
});

// Register commands
app.command('/h-id', hId);
app.command('/h-channel', hChannel);
app.command('/h-ask', hAsk);
app.command('/h-purge', hPurge);
app.command('/h-email', hEmail);
app.command('/h-admin-add', hAdminAdd);
app.command('/h-poll', hPoll);

// Handle poll voting button interactions
app.action(/^poll_vote_\d+$/, handlePollVote);

// Handle message events (replies to Heidi's messages)
app.event('message', async ({ event, client }) => {
  // Cast event to proper type to access all properties
  const messageEvent = event as any;

  // Only respond to threaded replies and ignore bot messages and subtypes
  if (messageEvent.subtype || !messageEvent.thread_ts || messageEvent.bot_id) {
    return;
  }

  try {
    // Get the original message to check if it was from Heidi
    const thread = await client.conversations.replies({
      channel: messageEvent.channel,
      ts: messageEvent.thread_ts,
      limit: 1
    });

    const originalMessage = thread.messages?.[0];

    // Check if the original message was from Heidi (our bot)
    // Look for bot_id or check if it's from our bot user
    if (originalMessage?.bot_id || originalMessage?.username === 'Heidi') {

      // Load AI instructions
      const instructions = require('./utils/instructions.json');

      // Get user's message text
      const userMessage = messageEvent.text || '';

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
        channel: messageEvent.channel,
        thread_ts: messageEvent.thread_ts,
        text: aiAnswer
      });

      console.log('Replied to thread:', messageEvent.thread_ts);
    }
  } catch (error) {
    console.error('Error handling reply to Heidi message:', error);

    // Don't try to reply in channel if we get channel-related errors
    // Instead, DM the user directly
    if (error.code === 'slack_webapi_platform_error') {
      let errorMsg = "Sorry, I had trouble responding to your message! ";

      switch (error.data?.error) {
        case 'channel_not_found':
          errorMsg += "I'm not in that channel anymore.";
          break;
        case 'not_in_channel':
          errorMsg += "I'm not a member of that channel.";
          break;
        case 'thread_not_found':
          errorMsg += "The original thread was deleted.";
          break;
        default:
          errorMsg += "Please try again later.";
      }

      // Try to DM the user directly instead of replying in channel
      try {
        await client.chat.postMessage({
          channel: messageEvent.user,
          text: errorMsg
        });
        console.log(`Sent error DM to user ${messageEvent.user}`);
      } catch (dmError) {
        console.error('Failed to send DM to user:', dmError);
      }
    }
    
    // Don't let this error bubble up to crash the app
    return;
  }
});

// Production-ready startup with reconnection logic
async function startBot() {
  const maxRetries = Infinity;
  let retryCount = 0;
  const retryDelay = 5 * 60 * 1000; // 5 minutes

  while (retryCount < maxRetries) {
    try {
      console.log(`🔄 Starting Heidi bot (attempt ${retryCount + 1})...`);
      await app.start();
      console.log('⚡️ Heidi bot is running!');
      retryCount = 0; // Reset retry count on successful connection
      break;
    } catch (error) {
      retryCount++;
      console.error(`❌ Failed to start bot (attempt ${retryCount}):`, error);

      if (error.message?.includes('invalid_auth')) {
        console.error('🔑 Authentication failed. Please check your Slack tokens in the Secrets tab.');
        console.error('Required tokens: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_APP_TOKEN');
      }

      console.log(`⏳ Retrying in 5 minutes...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  await app.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  await app.stop();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  setTimeout(() => {
    console.log('🔄 Restarting after uncaught exception...');
    startBot();
  }, 5000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  setTimeout(() => {
    console.log('🔄 Restarting after unhandled rejection...');
    startBot();
  }, 5000);
});

// Start the bot
startBot();