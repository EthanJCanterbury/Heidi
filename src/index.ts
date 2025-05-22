
import { App } from '@slack/bolt';
import { hId } from './commands/get-id';
import { hChannel } from './commands/channel';
import { hAsk } from './commands/ask';
import { hPurge } from './commands/purge';
import { hEmail } from './commands/email';
import { hAdminAdd } from './commands/admin-add';

export const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  customRoutes: [
    {
      path: '/health',
      method: ['GET'],
      handler: (req, res) => {
        res.writeHead(200);
        res.end('Health check OK');
      },
    },
  ],
});

let retryCount = 0;
const maxRetries = 10;
const initialRetryDelay = 3000; // 3 seconds initial delay
let currentRetryDelay = initialRetryDelay;
let reconnectionTimer: NodeJS.Timeout | null = null;

// Exponential backoff function
const getNextRetryDelay = () => {
  const delay = Math.min(currentRetryDelay * 1.5, 60000); // Cap at 60 seconds
  currentRetryDelay = delay;
  return delay;
};

// Reset retry parameters
const resetRetryParams = () => {
  retryCount = 0;
  currentRetryDelay = initialRetryDelay;
};

// Handle explicit disconnection with custom retry logic
const handleDisconnection = async () => {
  if (reconnectionTimer) {
    clearTimeout(reconnectionTimer);
  }
  
  if (retryCount < maxRetries) {
    retryCount++;
    console.log(`Connection lost. Attempting to reconnect (${retryCount}/${maxRetries}) in ${currentRetryDelay/1000} seconds...`);
    
    reconnectionTimer = setTimeout(async () => {
      try {
        // Attempt to cleanly shut down before reconnecting
        try {
          await app.stop();
          console.log("Successfully stopped previous connection");
        } catch (stopError) {
          console.log("Note: Could not stop previous connection, continuing anyway");
        }
        
        // Start new connection
        await app.start();
        console.log('⚡️ Reconnected successfully!');
        resetRetryParams();
      } catch (reconnectError) {
        console.error('Reconnection failed:', reconnectError);
        const nextDelay = getNextRetryDelay();
        console.log(`Will try again in ${nextDelay/1000} seconds...`);
        handleDisconnection();
      }
    }, currentRetryDelay);
  } else {
    console.error('Maximum reconnection attempts reached. Please restart the application manually.');
  }
};

// Register error handlers
app.error(async (error) => {
  console.error('An error occurred:', error);
  
  if (error.message?.includes('server explicit disconnect') || 
      error.message?.includes('WebSocket closed') ||
      error.message?.includes('connection error')) {
    handleDisconnection();
  }
});

// Register commands
app.command('/h-id', hId);
app.command('/h-channel', hChannel);
app.command('/h-ask', hAsk);
app.command('/h-purge', hPurge);
app.command('/h-email', hEmail);
app.command('/h-admin-add', hAdminAdd);

// Health check interval to proactively detect disconnections
let healthCheckInterval: NodeJS.Timeout | null = null;

// Function to verify connection health
const checkConnectionHealth = async () => {
  try {
    // Attempt a simple API call to verify connection
    await app.client.auth.test();
    // If successful, connection is healthy
  } catch (error) {
    console.log('Health check failed, connection may be broken');
    handleDisconnection();
  }
};

// Start the app with health check monitoring
(async () => {
  try {
    await app.start();
    console.log('⚡️ Hedi bot is running!');
    
    // Set up periodic health checks every 5 minutes
    healthCheckInterval = setInterval(checkConnectionHealth, 5 * 60 * 1000);
  } catch (error) {
    console.error('Failed to start the application:', error);
    handleDisconnection();
  }
})();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  if (healthCheckInterval) clearInterval(healthCheckInterval);
  if (reconnectionTimer) clearTimeout(reconnectionTimer);
  try {
    await app.stop();
    console.log('Application stopped successfully');
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  process.exit(0);
});
