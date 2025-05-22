
import type { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { isAdmin } from '../utils/admin-utils';
import axios from 'axios';

// Store active yapping sessions by channel ID
const activeYapSessions: Map<string, NodeJS.Timeout> = new Map();

// Random prompts for variety
const randomPrompts = [
  "Tell me something interesting about technology.",
  "Share a fun fact about animals.",
  "What's something cool about space?",
  "Tell me a short joke.",
  "Give me a random productivity tip.",
  "Share an interesting historical fact.",
  "Tell me something about science.",
  "Give me a random coding tip.",
  "Share something positive and uplifting.",
  "Tell me a random fun fact."
];

export async function hYap({
  ack,
  command,
  client,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  await ack();
  
  // Check if the user is an admin
  if (!await isAdmin(command.user_id)) {
    await client.chat.postMessage({
      channel: command.user_id,
      text: "You do not have permission to use this command. Only admins can execute Heidi's commands."
    });
    return;
  }

  const channelId = command.channel_id;
  
  // Check if yapping is already active in this channel
  if (activeYapSessions.has(channelId)) {
    // Stop the existing session
    clearInterval(activeYapSessions.get(channelId));
    activeYapSessions.delete(channelId);
    
    await client.chat.postMessage({
      channel: channelId,
      text: "Yapping stopped!"
    });
    return;
  }
  
  // Send initial message
  await client.chat.postMessage({
    channel: channelId,
    text: "Starting to yap! Send `/h-yap` again to stop."
  });
  
  // Load instructions for AI
  const instructions = require('../utils/instructions.json');
  
  // Start interval for sending messages
  const interval = setInterval(async () => {
    try {
      // Pick a random prompt
      const randomPrompt = randomPrompts[Math.floor(Math.random() * randomPrompts.length)];
      
      // Call the AI API
      const response = await axios.post(
        "https://ai.hackclub.com/chat/completions",
        {
          messages: [
            { role: "system", content: instructions.system_prompt },
            { role: "user", content: randomPrompt }
          ]
        },
        {
          headers: { "Content-Type": "application/json" }
        }
      );

      // Extract the AI's answer
      const responseData = response.data;
      const aiAnswer = responseData.choices[0].message.content;

      // Send the message to the channel
      await client.chat.postMessage({
        channel: channelId,
        text: aiAnswer
      });
    } catch (error) {
      console.error(`Error during yap: ${error}`);
      
      // Send error message but continue the interval
      await client.chat.postMessage({
        channel: channelId,
        text: `Oops, I had a little trouble with that one! I'll try again in 5 seconds.`
      });
    }
  }, 5000); // 5 seconds
  
  // Store the interval
  activeYapSessions.set(channelId, interval);
}
