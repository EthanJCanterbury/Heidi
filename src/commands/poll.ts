
import type { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { isAdmin } from '../utils/admin-utils';

// Store active polls in memory (in production, you'd want to use a database)
const activePolls = new Map<string, {
  question: string;
  options: string[];
  votes: Map<string, number>; // option index -> vote count
  voters: Map<string, number>; // user ID -> option index they voted for
  createdBy: string;
}>();

export async function hPoll({
  ack,
  command,
  client,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  await ack();
  
  // Check if the user is an admin
  if (!await isAdmin(command.user_id)) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: "You do not have permission to use this command. Only admins can execute Heidi's commands."
    });
    return;
  }

  const text = command.text.trim();
  
  if (!text) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: "Please provide a poll question and options. Format: `question | option1 | option2 | option3...`"
    });
    return;
  }

  // Parse the poll format: "question | option1 | option2 | option3..."
  const parts = text.split('|').map(part => part.trim());
  
  if (parts.length < 3) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: "Please provide at least 2 options. Format: `question | option1 | option2 | option3...`"
    });
    return;
  }

  const question = parts[0];
  const options = parts.slice(1);

  if (options.length > 10) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: "Maximum 10 options allowed per poll."
    });
    return;
  }

  // Generate a unique poll ID
  const pollId = `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Initialize poll data
  const pollData = {
    question,
    options,
    votes: new Map<string, number>(),
    voters: new Map<string, number>(),
    createdBy: command.user_id
  };

  // Initialize vote counts
  options.forEach((_, index) => {
    pollData.votes.set(index.toString(), 0);
  });

  activePolls.set(pollId, pollData);

  // Create buttons for each option
  const buttons = options.map((option, index) => ({
    type: "button",
    text: {
      type: "plain_text",
      text: option,
      emoji: true
    },
    value: `${pollId}:${index}`,
    action_id: `poll_vote_${index}`
  }));

  // Split buttons into rows (max 5 buttons per row)
  const buttonRows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    buttonRows.push({
      type: "actions",
      elements: buttons.slice(i, i + 5)
    });
  }

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `📊 *${question}*\n\n_Vote by clicking the buttons below!_`
      }
    },
    ...buttonRows,
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Poll created by <@${command.user_id}> • 0 total votes`
        }
      ]
    }
  ];

  try {
    // Get user info to mask as the user
    const userInfo = await client.users.info({
      user: command.user_id
    });
    
    const userName = userInfo.user?.real_name;
    const avatar = userInfo.user?.profile?.image_original || userInfo.user?.profile?.image_192;

    await client.chat.postMessage({
      channel: command.channel_id,
      text: `📊 Poll: ${question}`,
      blocks: blocks,
      username: userName,
      icon_url: avatar
    });
  } catch (error) {
    console.error('Error posting poll:', error);
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: "Failed to create poll. Please try again."
    });
  }
}

export async function handlePollVote({
  ack,
  body,
  client,
}: any): Promise<void> {
  await ack();

  const action = body.actions[0];
  const [pollId, optionIndex] = action.value.split(':');
  const userId = body.user.id;
  const channelId = body.channel.id;
  const messageTs = body.message.ts;

  const poll = activePolls.get(pollId);
  if (!poll) {
    await client.chat.postEphemeral({
      channel: channelId,
      user: userId,
      text: "This poll is no longer active."
    });
    return;
  }

  const optionIndexNum = parseInt(optionIndex);

  // Check if user already voted
  const previousVote = poll.voters.get(userId);
  if (previousVote !== undefined) {
    // Remove previous vote
    const currentCount = poll.votes.get(previousVote.toString()) || 0;
    poll.votes.set(previousVote.toString(), Math.max(0, currentCount - 1));
  }

  // Add new vote
  poll.voters.set(userId, optionIndexNum);
  const currentVoteCount = poll.votes.get(optionIndex) || 0;
  poll.votes.set(optionIndex, currentVoteCount + 1);

  // Calculate total votes
  const totalVotes = Array.from(poll.votes.values()).reduce((sum, count) => sum + count, 0);

  // Create updated poll display
  let pollText = `📊 *${poll.question}*\n\n`;
  
  poll.options.forEach((option, index) => {
    const voteCount = poll.votes.get(index.toString()) || 0;
    const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
    const barLength = Math.round(percentage / 5); // 20 chars max
    const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
    
    pollText += `${option}\n${bar} ${voteCount} votes (${percentage}%)\n\n`;
  });

  pollText += `_Vote by clicking the buttons below!_`;

  // Recreate buttons
  const buttons = poll.options.map((option, index) => ({
    type: "button",
    text: {
      type: "plain_text",
      text: option,
      emoji: true
    },
    value: `${pollId}:${index}`,
    action_id: `poll_vote_${index}`
  }));

  // Split buttons into rows
  const buttonRows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    buttonRows.push({
      type: "actions",
      elements: buttons.slice(i, i + 5)
    });
  }

  const updatedBlocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: pollText
      }
    },
    ...buttonRows,
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Poll created by <@${poll.createdBy}> • ${totalVotes} total votes`
        }
      ]
    }
  ];

  try {
    await client.chat.update({
      channel: channelId,
      ts: messageTs,
      text: `📊 Poll: ${poll.question}`,
      blocks: updatedBlocks
    });

    // Send ephemeral confirmation
    const votedOption = poll.options[optionIndexNum];
    await client.chat.postEphemeral({
      channel: channelId,
      user: userId,
      text: `✅ You voted for "${votedOption}"`
    });
  } catch (error) {
    console.error('Error updating poll:', error);
  }
}
