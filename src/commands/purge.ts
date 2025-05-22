
import type { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { isAdmin } from '../utils/admin-utils';

export async function hPurge({
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

  try {
    // Extract number of messages to delete
    let count: number;
    try {
      count = parseInt(command.text, 10);
      if (count <= 0) {
        throw new Error("Number must be positive");
      }
    } catch (error) {
      await client.chat.postMessage({
        channel: command.channel_id,
        text: "Please provide a valid positive number of messages to purge."
      });
      return;
    }

    // Get channel history
    const result = await client.conversations.history({
      channel: command.channel_id,
      limit: count + 1  // +1 to include the command itself
    });

    // Skip the first message (the command itself)
    const messagesToDelete = result.messages?.slice(1, count + 1) || [];
    let deletedCount = 0;

    // Delete messages
    for (const msg of messagesToDelete) {
      try {
        await client.chat.delete({
          channel: command.channel_id,
          ts: msg.ts as string
        });
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting message ${msg.ts}: ${error}`);
      }
    }

    // Send confirmation
    await client.chat.postMessage({
      channel: command.channel_id,
      text: `Purged ${deletedCount} messages.`
    });
  } catch (error) {
    console.error(`Error during purge: ${error}`);
    await client.chat.postMessage({
      channel: command.channel_id,
      text: `Error during purge: ${error}`
    });
  }
}
