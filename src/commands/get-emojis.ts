
import type { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { isAdmin } from '../utils/admin-utils';
import * as fs from 'fs/promises';

export async function hGetEmojis({
  ack,
  client,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  await ack();

  try {
    const result = await client.emoji.list();
    
    await fs.writeFile('emojis.json', JSON.stringify(result.emoji, null, 2));
    
    console.log('Emojis saved to emojis.json');
  } catch (error) {
    console.error('Error fetching emojis:', error);
  }
}
