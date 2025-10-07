#!/usr/bin/env node

/**
 * Script to update remaining Supabase imports to API client
 * This script will help identify and update all remaining Supabase usage
 */

import fs from 'fs';
import path from 'path';

const srcDir = './src';
const filesToUpdate = [];

function findSupabaseFiles(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findSupabaseFiles(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('from "@/integrations/supabase/client"') || 
          content.includes('import { supabase }')) {
        filesToUpdate.push(filePath);
      }
    }
  }
}

// Find all files with Supabase imports
findSupabaseFiles(srcDir);

console.log('Files that still need Supabase to API client migration:');
filesToUpdate.forEach(file => {
  console.log(`- ${file}`);
});

console.log(`\nTotal files to update: ${filesToUpdate.length}`);

// Priority files to update first
const priorityFiles = [
  'src/pages/Projects.tsx',
  'src/pages/ProjectDetails.tsx',
  'src/pages/Profile.tsx',
  'src/pages/Chat.tsx',
  'src/pages/Editors.tsx',
  'src/pages/Clients.tsx',
  'src/pages/Invoices.tsx',
  'src/components/chat/ChatWindow.tsx',
  'src/components/dashboard/RecentActivity.tsx',
  'src/components/dashboard/UpcomingDeadlines.tsx'
];

console.log('\nPriority files to update first:');
priorityFiles.forEach(file => {
  if (filesToUpdate.includes(file)) {
    console.log(`✓ ${file}`);
  }
});
