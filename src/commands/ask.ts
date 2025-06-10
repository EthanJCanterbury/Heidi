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

    // Update the loading message with the AI's response
    await client.chat.update({
      channel: channelId,
      ts: loadingMsg.ts,
      text: aiAnswer
    });

  } catch (error) {
    console.error('Error in ask command:', error);

    let errorMessage = "Sorry, I encountered an error while processing your question.";

    if (error.code === 'slack_webapi_platform_error') {
      switch (error.data?.error) {
        case 'channel_not_found':
          errorMessage = "I'm not in this channel or it doesn't exist. Please add me to the channel first!";
          break;
        case 'not_in_channel':
          errorMessage = "I'm not a member of this channel. Please invite me first!";
          break;
        case 'message_not_found':
          errorMessage = "I couldn't update my previous message. The response was: " + (error.aiAnswer || "Unable to get AI response.");
          break;
      }
    }

    try {
      // Try to update loading message with error
      await client.chat.update({
        channel: channelId,
        ts: loadingMsg.ts,
        text: errorMessage
      });
    } catch (updateError) {
      // If update fails, try to send a new message or DM the user
      try {
        await client.chat.postMessage({
          channel: channelId,
          text: errorMessage
        });
      } catch (postError) {
        // Last resort: DM the user
        await client.chat.postMessage({
          channel: command.user_id,
          text: errorMessage
        });
      }
    }
  }
}