
import type { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { isAdmin } from '../utils/admin-utils';

// A large constant string of Pi digits (3.14159...)
const PI_DIGITS = "3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657595919530921861173819326117931051185480744623799627495673518857527248912279381830119491298336733624406566430860213949463952247371907021798609437027705392171762931767523846748184676694051320005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235420199561121290219608640344181598136297747713099605187072113499999983729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989";

// Map to store active Pi display sessions by channel ID
const activePiSessions = new Map<string, NodeJS.Timeout>();

export async function hPi({
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
  
  // Check if Pi display is already active in this channel
  if (activePiSessions.has(channelId)) {
    // Stop the existing session
    clearInterval(activePiSessions.get(channelId));
    activePiSessions.delete(channelId);
    
    await client.chat.postMessage({
      channel: channelId,
      text: "Pi display stopped! 🛑"
    });
    return;
  }
  
  // Send initial message
  await client.chat.postMessage({
    channel: channelId,
    text: "Starting to display Pi digits! 🥧 Send `/h-pi` again to stop."
  });
  
  // We'll show 100 digits at a time, starting after the decimal point
  let currentIndex = 2; // Start after "3."
  let count = 0;
  
  // Schedule 100 messages, each showing 100 digits
  const interval = setInterval(async () => {
    try {
      // Get the next 100 digits
      const digits = PI_DIGITS.substring(currentIndex, currentIndex + 100);
      currentIndex += 100;
      count++;
      
      // Send the message with digits
      await client.chat.postMessage({
        channel: channelId,
        text: `Pi digits (${count}/100): \`${digits}\``
      });
      
      // Stop after 100 messages
      if (count >= 100) {
        clearInterval(interval);
        activePiSessions.delete(channelId);
        await client.chat.postMessage({
          channel: channelId,
          text: "Finished displaying 10,000 digits of Pi! 🎉"
        });
      }
    } catch (error) {
      console.error(`Error during Pi display: ${error}`);
      clearInterval(interval);
      activePiSessions.delete(channelId);
      
      await client.chat.postMessage({
        channel: channelId,
        text: `Error displaying Pi digits: ${error}`
      });
    }
  }, 3000); // 3 seconds
  
  // Store the interval
  activePiSessions.set(channelId, interval);
}
