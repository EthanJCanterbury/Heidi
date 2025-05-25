
/**
 * Utility to validate Slack tokens are set properly
 */
export function validateTokens(): boolean {
  const requiredTokens = [
    'SLACK_BOT_TOKEN',
    'SLACK_SIGNING_SECRET',
    'SLACK_APP_TOKEN'
  ];
  
  let isValid = true;
  
  for (const token of requiredTokens) {
    if (!process.env[token]) {
      console.error(`Error: ${token} environment variable is not set.`);
      isValid = false;
    } else if (process.env[token].trim() === '') {
      console.error(`Error: ${token} environment variable is empty.`);
      isValid = false;
    }
  }
  
  if (!isValid) {
    console.error('Please set all required environment variables in the Secrets tab.');
  } else {
    console.log('All required tokens are set.');
  }
  
  return isValid;
}
