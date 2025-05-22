
import * as fs from 'fs/promises';
import * as path from 'path';

const ADMINS_FILE = path.join(process.cwd(), 'admins.json');

// Load admin list from JSON file
export async function loadAdmins(): Promise<string[]> {
  try {
    const data = await fs.readFile(ADMINS_FILE, 'utf-8');
    const parsedData = JSON.parse(data);
    return parsedData.admins || [];
  } catch (error) {
    console.error(`Error loading admins: ${error}`);
    return [];
  }
}

// Check if a user is an admin
export async function isAdmin(userId: string): Promise<boolean> {
  const admins = await loadAdmins();
  return admins.includes(userId);
}

// Add an admin to the list
export async function addAdmin(userId: string): Promise<[boolean, string]> {
  if (!userId.startsWith('U')) {
    return [false, "User ID must start with 'U'"];
  }
  
  try {
    const admins = await loadAdmins();
    if (admins.includes(userId)) {
      return [false, "User is already an admin"];
    }
    
    admins.push(userId);
    
    await fs.writeFile(
      ADMINS_FILE, 
      JSON.stringify({ admins }, null, 2), 
      'utf-8'
    );
    
    return [true, `Added <@${userId}> as an admin`];
  } catch (error) {
    console.error(`Error adding admin: ${error}`);
    return [false, `Error adding admin: ${error}`];
  }
}
