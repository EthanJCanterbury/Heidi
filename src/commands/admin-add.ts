
import type { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { isAdmin, addAdmin } from '../utils/admin-utils';

export async function hAdminAdd({
  ack,
  command,
  client,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  await ack();
  
  // Check if the user is an admin
  if (!await isAdmin(command.user_id)) {
    await client.chat.postMessage({
      channel: command.user_id,
      text: "You do not have permission to add admins."
    });
    return;
  }
  
  // Extract the user ID to add
  let userIdText = command.text.trim();
  
  // Clean up user ID text if it's a mention
  if (userIdText.startsWith("<@") && userIdText.includes(">")) {
    userIdText = userIdText.substring(2, userIdText.indexOf(">"));
    
    // Handle the case where there's a pipe character for display name
    if (userIdText.includes("|")) {
      userIdText = userIdText.substring(0, userIdText.indexOf("|"));
    }
  }
  
  // Add the admin
  const [success, message] = await addAdmin(userIdText);
  
  // Send response
  await client.chat.postMessage({
    channel: command.user_id,
    text: message
  });
}
