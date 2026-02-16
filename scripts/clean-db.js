/**
 * Script to clean database and run full migration
 * Usage: node scripts/clean-db.js
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Get database path
// On macOS, Electron's userData is typically ~/Library/Application Support/AionUi
// and it creates a symlink at ~/.aionui
function getDbPath() {
  const platform = process.platform;
  let dbPath;

  if (platform === 'darwin') {
    // macOS - use symlink if it exists
    const symlinkPath = path.join(os.homedir(), '.aionui', 'aionui.db');
    const appSupportPath = path.join(os.homedir(), 'Library', 'Application Support', 'AionUi', 'aionui', 'aionui.db');

    if (fs.existsSync(symlinkPath)) {
      dbPath = symlinkPath;
    } else if (fs.existsSync(appSupportPath)) {
      dbPath = appSupportPath;
    } else {
      // Try to find the db file
      const possiblePaths = [symlinkPath, appSupportPath];
      console.log('Database not found. Possible locations:');
      possiblePaths.forEach(p => console.log(`  - ${p}`));
      return null;
    }
  } else if (platform === 'win32') {
    // Windows
    dbPath = path.join(process.env.APPDATA, 'AionUi', 'aionui', 'aionui.db');
  } else {
    // Linux
    dbPath = path.join(os.homedir(), '.config', 'AionUi', 'aionui', 'aionui.db');
  }

  return dbPath;
}

function backupDatabase(dbPath) {
  if (!fs.existsSync(dbPath)) {
    console.log('No existing database found at:', dbPath);
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${dbPath}.backup-${timestamp}`;

  try {
    fs.copyFileSync(dbPath, backupPath);
    console.log('✓ Database backed up to:', backupPath);
    return backupPath;
  } catch (error) {
    console.error('✗ Failed to backup database:', error.message);
    return null;
  }
}

function deleteDatabase(dbPath) {
  if (!fs.existsSync(dbPath)) {
    console.log('No database to delete at:', dbPath);
    return true;
  }

  try {
    fs.unlinkSync(dbPath);
    console.log('✓ Database deleted:', dbPath);
    return true;
  } catch (error) {
    console.error('✗ Failed to delete database:', error.message);
    return false;
  }
}

function main() {
  console.log('=== AionUi Database Cleanup ===\n');

  const dbPath = getDbPath();
  if (!dbPath) {
    console.error('✗ Could not determine database path');
    process.exit(1);
  }

  console.log('Database path:', dbPath);
  console.log();

  // Step 1: Backup
  console.log('[1/2] Backing up existing database...');
  const backupPath = backupDatabase(dbPath);
  if (!backupPath && fs.existsSync(dbPath)) {
    console.error('✗ Backup failed. Aborting to prevent data loss.');
    process.exit(1);
  }

  // Step 2: Delete
  console.log('\n[2/2] Deleting database...');
  const deleted = deleteDatabase(dbPath);
  if (!deleted) {
    console.error('✗ Failed to delete database');
    process.exit(1);
  }

  console.log('\n✓ Database cleanup completed!');
  console.log('\nNext steps:');
  console.log('1. Restart the application (npm start)');
  console.log('2. The database will be recreated with the latest schema');
  console.log('3. All migrations will run automatically');

  if (backupPath) {
    console.log(`\nBackup location: ${backupPath}`);
  }
}

main();
