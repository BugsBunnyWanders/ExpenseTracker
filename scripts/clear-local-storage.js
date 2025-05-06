/**
 * Clear Local Storage Script
 * 
 * This script clears AsyncStorage data in Expo for development purposes.
 * It will remove any stored user session and cached data.
 * 
 * Note: This only works in development on desktop. For devices, you'll
 * need to clear the app data through the device settings.
 * 
 * Run with: node scripts/clear-local-storage.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('=== ExpenseTracker Cache Clearing Tool ===\n');

// Determine the platform-specific Expo cache directory
const getExpoCacheDir = () => {
  const platform = os.platform();
  const homeDir = os.homedir();
  
  if (platform === 'win32') {
    return path.join(homeDir, 'AppData', 'Local', 'Expo');
  } else if (platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Caches', 'Expo');
  } else if (platform === 'linux') {
    return path.join(homeDir, '.config', 'expo');
  } else {
    console.error(`Unsupported platform: ${platform}`);
    return null;
  }
};

// Function to recursively delete files
const deleteFilesRecursively = (directory) => {
  if (!fs.existsSync(directory)) {
    console.error(`Directory does not exist: ${directory}`);
    return;
  }
  
  try {
    const files = fs.readdirSync(directory);
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Skip .git directory
        if (file === '.git') continue;
        
        // Recursively delete subdirectories
        deleteFilesRecursively(filePath);
        
        try {
          fs.rmdirSync(filePath);
          console.log(`Removed directory: ${filePath}`);
        } catch (err) {
          console.error(`Error removing directory ${filePath}: ${err.message}`);
        }
      } else {
        try {
          // Delete only AsyncStorage and cache files
          if (file.includes('AsyncStorage') || file.includes('cache') || 
              file.includes('expo-cache') || file.includes('supabase')) {
            fs.unlinkSync(filePath);
            console.log(`Deleted: ${filePath}`);
          }
        } catch (err) {
          console.error(`Error deleting file ${filePath}: ${err.message}`);
        }
      }
    }
  } catch (err) {
    console.error(`Error processing directory ${directory}: ${err.message}`);
  }
};

// Delete Metro bundler cache
const clearMetroCache = () => {
  const projectDir = process.cwd();
  const metroDir = path.join(projectDir, 'node_modules', '.cache', 'metro');
  
  if (fs.existsSync(metroDir)) {
    try {
      deleteFilesRecursively(metroDir);
      console.log('Metro bundler cache cleared');
    } catch (err) {
      console.error(`Error clearing Metro cache: ${err.message}`);
    }
  } else {
    console.log('No Metro cache found');
  }
};

// Main function
const clearCache = () => {
  // Clear Expo cache
  const expoCacheDir = getExpoCacheDir();
  if (expoCacheDir) {
    console.log(`Checking Expo cache directory: ${expoCacheDir}`);
    
    if (fs.existsSync(expoCacheDir)) {
      deleteFilesRecursively(expoCacheDir);
      console.log('\nExpo cache files deleted');
    } else {
      console.log('Expo cache directory not found');
    }
  }
  
  // Clear Metro cache
  console.log('\nClearing Metro bundler cache...');
  clearMetroCache();
  
  console.log('\n=== Cache Clearing Complete ===');
  console.log('\nWhat this did:');
  console.log('- Cleared AsyncStorage data (logged out any users)');
  console.log('- Removed Supabase cached sessions');
  console.log('- Cleared Metro bundler cache');
  
  console.log('\nTo fully clear the app on your device:');
  console.log('1. For Android: Go to Settings > Apps > ExpenseTracker > Clear data');
  console.log('2. For iOS: Delete and reinstall the app');
  
  console.log('\nNext steps:');
  console.log('1. Run "npm start" to restart the development server');
  console.log('2. Log in again to your app');
};

// Run the cache clearing function
clearCache(); 