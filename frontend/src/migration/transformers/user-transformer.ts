/**
 * Transform auth.users to local users table
 */

import fs from 'fs';
import path from 'path';

interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  raw_user_meta_data: any;
}

interface LocalUser {
  id: string;
  email: string;
  email_confirmed: boolean;
  created_at: string;
  updated_at: string;
  full_name: string | null;
  user_category: string;
}

export function transformUsers(authUsers: AuthUser[]): LocalUser[] {
  return authUsers.map(user => ({
    id: user.id,
    email: user.email,
    email_confirmed: user.email_confirmed_at !== null,
    created_at: user.created_at,
    updated_at: user.updated_at,
    full_name: user.raw_user_meta_data?.full_name || null,
    user_category: user.raw_user_meta_data?.user_category || 'editor'
  }));
}

export function runUserTransformation() {
  console.log('🔄 Transforming auth users...');

  const exportDir = path.join(process.cwd(), 'migration', 'exports');
  const transformedDir = path.join(process.cwd(), 'migration', 'transformed');

  if (!fs.existsSync(transformedDir)) {
    fs.mkdirSync(transformedDir, { recursive: true });
  }

  const authUsersPath = path.join(exportDir, 'auth_users.json');
  const authUsers: AuthUser[] = JSON.parse(fs.readFileSync(authUsersPath, 'utf-8'));

  const localUsers = transformUsers(authUsers);

  const outputPath = path.join(transformedDir, 'users.json');
  fs.writeFileSync(outputPath, JSON.stringify(localUsers, null, 2));

  console.log(`✅ Transformed ${localUsers.length} users`);
  console.log(`📁 Output: ${outputPath}`);

  return localUsers;
}
