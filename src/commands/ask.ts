
import type { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { isAdmin } from '../utils/admin-utils';
import axios from 'axios';

export async function hAsk({
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

  // Extract the question
  const question = command.text;
  const channelId = command.channel_id;

  // Send loading message first
  const loadingMsg = await client.chat.postMessage({
    channel: channelId,
    text: "Loading..."
  });

  try {
    // Call the AI API
    // Load raccoon instructions
    const instructions = require('../utils/instructions.json');
    
    const response = await axios.post(
      "https://ai.hackclub.com/chat/completions",
      {
        messages: [
          { role: "system", content: instructions.system_prompt },
          { role: "user", content: question }
        ]
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    // Extract the AI's answer
    const responseData = response.data;
    const aiAnswer = responseData.choices[0].message.content;

    // Update the loading message with the answer
    await client.chat.update({
      channel: channelId,
      ts: loadingMsg.ts as string,
      text: aiAnswer
    });
  } catch (error) {
    // Update loading message with error
    await client.chat.update({
      channel: channelId,
      ts: loadingMsg.ts as string,
      text: `Sorry, I couldn't get an answer: ${error}`
    });
  }
}
