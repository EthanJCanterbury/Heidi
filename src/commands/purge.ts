
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
    let result;
    try {
      result = await client.conversations.history({
        channel: command.channel_id,
        limit: count + 1  // +1 to include the command itself
      });
    } catch (error) {
      let errorMessage = "Sorry, I couldn't access this channel's history. ";
      
      if (error.code === 'slack_webapi_platform_error') {
        switch (error.data?.error) {
          case 'channel_not_found':
            errorMessage += "The channel doesn't exist or I don't have access to it.";
            break;
          case 'not_in_channel':
            errorMessage += "I'm not a member of this channel.";
            break;
          default:
            errorMessage += `Error: ${error.data?.error}`;
        }
      } else {
        errorMessage += error.message;
      }
      
      await client.chat.postMessage({
        channel: command.user_id,
        text: errorMessage
      });
      return;
    }

    // Skip the first message (the command itself)
    const messagesToDelete = result.messages?.slice(1, count + 1) || [];
    let deletedCount = 0;

    // Delete messages
    for (const msg of messagesToDelete) {
      try {
        // Try to delete the message
        await client.chat.delete({
          channel: command.channel_id,
          ts: msg.ts as string
        });
        deletedCount++;
      } catch (error) {
        // Log the error but continue with other messages
        console.error(`Error deleting message ${msg.ts}: ${error}`);
        
        // If we can't delete it (likely because it's not our message),
        // try to add a tombstone reaction to mark it as "deleted"
        try {
          await client.reactions.add({
            channel: command.channel_id,
            timestamp: msg.ts as string,
            name: "x"  // Using the "x" emoji as a marker
          });
        } catch (reactionError) {
          console.error(`Error adding reaction to message ${msg.ts}: ${reactionError}`);
        }
      }
    }

    // Send confirmation
    await client.chat.postMessage({
      channel: command.channel_id,
      text: `Purged ${deletedCount} messages.${deletedCount < messagesToDelete.length ? ` (${messagesToDelete.length - deletedCount} messages couldn't be deleted but were marked with an ❌ reaction)` : ""}`
    });
  } catch (error) {
    console.error(`Error during purge: ${error}`);
    await client.chat.postMessage({
      channel: command.channel_id,
      text: `Error during purge: ${error}`
    });
  }
}
