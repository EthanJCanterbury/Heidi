
import { WebClient } from '@slack/web-api';

async function debugSlackConnection() {
  console.log('🔍 Running Slack connection debug utility...');
  console.log('Checking environment variables...');
  
  const botToken = process.env.SLACK_BOT_TOKEN;
  const appToken = process.env.SLACK_APP_TOKEN;
  
  if (!botToken) {
    console.error('❌ SLACK_BOT_TOKEN is missing or empty');
    return;
  }
  
  if (!appToken) {
    console.error('❌ SLACK_APP_TOKEN is missing or empty');
    return;
  }
  
  if (!botToken.startsWith('xoxb-')) {
    console.error('❌ SLACK_BOT_TOKEN appears to be invalid (should start with xoxb-)');
    return;
  }
  
  if (!appToken.startsWith('xapp-')) {
    console.error('❌ SLACK_APP_TOKEN appears to be invalid (should start with xapp-)');
    return;
  }
  
  console.log('✅ Environment variables look correctly formatted');
  
  try {
    const client = new WebClient(botToken);
    console.log('Attempting to connect to Slack API...');
    
    const authTest = await client.auth.test();
    console.log('✅ Successfully authenticated with Slack API');
    console.log(`Connected to workspace: ${authTest.team}`);
    console.log(`Bot user: ${authTest.user}`);
    
    // Test if we can get a list of channels
    const conversationsList = await client.conversations.list({
      limit: 5
    });
    
    if (conversationsList.channels && conversationsList.channels.length > 0) {
      console.log('✅ Successfully retrieved channels from Slack');
      console.log(`Found ${conversationsList.channels.length} channels`);
    } else {
      console.warn('⚠️ No channels found or bot has no permissions to view channels');
    }
    
    console.log('🎉 Slack connection debug completed successfully!');
  } catch (error) {
    console.error('❌ Error connecting to Slack API:', error);
    console.log('Please check your token and permissions.');
  }
}

// Run the debug function
debugSlackConnection();
