#!/usr/bin/env node
/**
 * Script to remove plugin game-3d agent from acp.customAgents storage
 * Run with: node scripts/clear-game3d-agent.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Path to AionUi storage (matching getConfigPath() in utils.ts)
const storageDir = path.join(os.homedir(), 'Library', 'Application Support', 'AionUi', 'config');
const configFile = path.join(storageDir, 'aionui-config.txt');

console.log('🔍 Looking for AionUi config file...');
console.log(`📁 Path: ${configFile}`);

if (!fs.existsSync(configFile)) {
  console.error('❌ Config file not found! Make sure AionUi has been run at least once.');
  console.error(`   Expected location: ${configFile}`);
  process.exit(1);
}

// Read and decode the base64-encoded config
let config;
try {
  const base64Content = fs.readFileSync(configFile, 'utf8');
  const jsonString = decodeURIComponent(Buffer.from(base64Content, 'base64').toString('utf8'));
  config = JSON.parse(jsonString);
} catch (error) {
  console.error('❌ Failed to read/decode config file:', error.message);
  process.exit(1);
}

console.log('\n📋 Current config structure:');
const customAgents = config['acp.customAgents'];
console.log(`- Has acp.customAgents: ${!!customAgents}`);

if (!customAgents || !Array.isArray(customAgents)) {
  console.log('\n✅ No custom agents found. Nothing to clean!');
  process.exit(0);
}

console.log(`\n📊 Found ${customAgents.length} custom agent(s):`);
customAgents.forEach((agent, index) => {
  console.log(`  ${index + 1}. ${agent.name || 'Unnamed'} (ID: ${agent.id || 'no-id'})`);
});

// Filter out the plugin-creators game-3d agent ONLY
// Keep the builtin-game-3d (from ASSISTANT_PRESETS)
const originalCount = customAgents.length;
config['acp.customAgents'] = customAgents.filter((agent) => {
  // Only remove the plugin-creators version
  const isPluginGame3d = agent.id === 'plugin-aionui-plugin-creators-game-3d';

  if (isPluginGame3d) {
    console.log(`\n🗑️  Removing plugin agent: ${agent.name} (ID: ${agent.id})`);
    return false; // Remove this agent
  }
  return true; // Keep this agent
});

const removedCount = originalCount - config['acp.customAgents'].length;

if (removedCount === 0) {
  console.log('\n✅ No plugin game-3d agent found. Nothing to remove!');
  process.exit(0);
}

// Create backup
const backupFile = configFile + '.backup.' + Date.now();
console.log(`\n💾 Creating backup: ${path.basename(backupFile)}`);
fs.copyFileSync(configFile, backupFile);

// Encode and write updated config
console.log('💿 Writing updated config...');
try {
  const jsonString = JSON.stringify(config);
  const base64Content = Buffer.from(encodeURIComponent(jsonString), 'utf8').toString('base64');
  fs.writeFileSync(configFile, base64Content, 'utf8');
} catch (error) {
  console.error('❌ Failed to write config file:', error.message);
  console.log(`\n📝 Backup available at: ${backupFile}`);
  process.exit(1);
}

console.log(`\n✅ Successfully removed ${removedCount} plugin game-3d agent(s)!`);
console.log(`📊 Remaining custom agents: ${config['acp.customAgents'].length}`);
console.log(`\n✨ Kept builtin-game-3d (from ASSISTANT_PRESETS)`);
console.log('\n🔄 Please restart AionUi to see the changes.');
console.log(`📝 Backup saved to: ${path.basename(backupFile)}`);
