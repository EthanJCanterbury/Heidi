
import type { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { isAdmin } from '../utils/admin-utils';
import axios from 'axios';

// Store active yapping sessions by channel ID
const activeYapSessions: Map<string, NodeJS.Timeout> = new Map();

// Random prompts for variety including brainrot content
const randomPrompts = [
  // Original prompts
  "Tell me something interesting about technology.",
  "Share a fun fact about animals.",
  "What's something cool about space?",
  "Tell me a short joke.",
  
  // Brainrot/internet culture prompts
  "Tell me your hot take on something totally random.",
  "Explain something simple as if it's the most dramatic thing ever.",
  "Create a silly conspiracy theory about everyday objects.",
  "Give me your unhinged opinion on a food combination.",
  "Gossip about fictional characters like they're your besties.",
  "Rant about something extremely minor as if it's life-changing.",
  "Create a new slang term and explain what it means.",
  "Tell me what the vibes are today.",
  "Give me your most chaotic life advice that sounds wrong but is actually right.",
  "Share an opinion that would be controversial among inanimate objects.",
  "Tell me your unpopular opinion about a popular trend.",
  "Give me a dramatic backstory for a mundane household item.",
  "Share some deranged thoughts about the current season.",
  "Tell me your biggest 'that's so me' moment.",
  "Give me the tea on the drama between kitchen appliances.",
  "Create a scenario where everyone is typing like this!!! for no reason!!!",
  "Explain a coding concept as if you're losing your mind over how cool it is.",
  "Tell me what your aura is today and why it's that color.",
  "Share your completely unserious life philosophy.",
  "Tell me about the imaginary beef between two random objects in the room."
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
      
      // Create a more chaotic/brainrot prompt style sometimes
      let promptStyle = randomPrompt;
      
      // 30% chance to add chaotic energy to the prompt
      if (Math.random() < 0.3) {
        const chaosModifiers = [
          "OMG I NEED TO KNOW ",
          "help bestie i'm literally dying to know ",
          "slayyy tell me ",
          "this is sending me but ",
          "not me being obsessed with ",
          "living for ",
          "i can't even with ",
          "it's giving... ",
          "the way that ",
          "no thoughts just "
        ];
        
        const randomModifier = chaosModifiers[Math.floor(Math.random() * chaosModifiers.length)];
        promptStyle = randomModifier + promptStyle.toLowerCase();
      }
      
      // Call the AI API
      const response = await axios.post(
        "https://ai.hackclub.com/chat/completions",
        {
          messages: [
            { role: "system", content: instructions.system_prompt },
            { role: "user", content: promptStyle }
          ]
        },
        {
          headers: { "Content-Type": "application/json" }
        }
      );

      // Extract the AI's answer
      const responseData = response.data;
      let aiAnswer = responseData.choices[0].message.content;
      
      // 20% chance to add extra emphasis to the message
      if (Math.random() < 0.2) {
        const emphasisOptions = [
          (text) => text.toUpperCase(),
          (text) => text + "!!!",
          (text) => text.split('. ').join('!!! '),
          (text) => text + " no literally i can't even",
          (text) => text + " ✨✨✨",
          (text) => text + " (crying rn)"
        ];
        
        const selectedEmphasis = emphasisOptions[Math.floor(Math.random() * emphasisOptions.length)];
        aiAnswer = selectedEmphasis(aiAnswer);
      }

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
