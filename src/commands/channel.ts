
import type { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { isAdmin } from '../utils/admin-utils';

export async function hChannel({
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

  // Get user info
  const userInfo = await client.users.info({
    user: command.user_id
  });
  
  const userName = userInfo.user?.real_name;
  const channelId = command.channel_id;

  // Extract the message
  const message = command.text;

  // Create final message with proper channel mention
  const finalMessage = message.includes("@channel") 
    ? message 
    : `<!channel> ${message}`;

  // Get user avatar
  const avatar = userInfo.user?.profile?.image_original || userInfo.user?.profile?.image_192;

  // Prepare payload with blocks for proper formatting
  const payload = {
    text: finalMessage,
    username: userName,
    icon_url: avatar,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: finalMessage
        }
      }
    ]
  };

  try {
    // Send the message
    const response = await client.chat.postMessage({
      channel: channelId,
      ...payload
    });

    if (!response.ts) {
      throw new Error("Failed to send ping - no timestamp returned");
    }

    console.log(`Successfully sent channel ping with ts: ${response.ts}`);
  } catch (error) {
    console.error(`Error sending channel notification: ${error}`);
    
    let errorMessage = "Sorry, I couldn't send the channel notification. ";
    
    if (error.code === 'slack_webapi_platform_error') {
      switch (error.data?.error) {
        case 'channel_not_found':
          errorMessage += "I'm not in this channel or it doesn't exist. Please add me to the channel first!";
          break;
        case 'not_in_channel':
          errorMessage += "I'm not a member of this channel. Please invite me first!";
          break;
        case 'access_denied':
          errorMessage += "I don't have permission to post in this channel.";
          break;
        case 'invalid_auth':
          errorMessage += "My authentication tokens need to be updated.";
          break;
        default:
          errorMessage += `Slack API error: ${error.data?.error || 'Unknown error'}`;
      }
    } else {
      errorMessage += `Technical error: ${error.message}`;
    }
    
    // Notify the user of the error via DM
    try {
      await client.chat.postMessage({
        channel: command.user_id,
        text: errorMessage
      });
    } catch (dmError) {
      console.error('Failed to send error DM to user:', dmError);
    }
  }
}
