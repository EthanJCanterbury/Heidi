
import type { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { isAdmin } from '../utils/admin-utils';

export async function hEmail({
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

  // Get the mentioned user
  const mentions = [...command.text.matchAll(/<@([^>|]+)(?:\|[^>]+)?>/g)];
  
  if (mentions.length === 0) {
    await client.chat.postMessage({
      channel: command.channel_id,
      text: "Please mention a user to get their email."
    });
    return;
  }

  const userId = mentions[0][1];

  try {
    const result = await client.users.info({
      user: userId
    });

    if (!result.user) {
      throw new Error("User not found");
    }

    const email = result.user.profile?.email;
    
    if (!email) {
      await client.chat.postMessage({
        channel: command.channel_id,
        text: `No email found for user <@${userId}>`
      });
      return;
    }

    await client.chat.postMessage({
      channel: command.channel_id,
      text: `Email for <@${userId}>: ${email}`
    });
  } catch (error) {
    await client.chat.postMessage({
      channel: command.channel_id,
      text: `Error getting email: ${error}`
    });
  }
}
