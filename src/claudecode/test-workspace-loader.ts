/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Test script for WorkspaceLoader
 * Run with: npx ts-node src/claudecode/test-workspace-loader.ts
 */

import * as path from 'path';
import { loadClaudeCodeWorkspace } from './WorkspaceLoader';

async function testWorkspaceLoader() {
  console.log('🔍 Testing Claude Code Workspace Loader\n');

  const workspacePath = path.join(__dirname, '../../assistant/game-3d/workspace');
  console.log(`📂 Loading workspace from: ${workspacePath}\n`);

  const result = await loadClaudeCodeWorkspace(workspacePath);

  if (!result.success) {
    console.error('❌ Failed to load workspace:', result.error);
    if (result.warnings) {
      console.warn('\n⚠️  Warnings:', result.warnings);
    }
    return;
  }

  const workspace = result.workspace!;
  console.log('✅ Workspace loaded successfully!\n');

  console.log('📦 Plugins:', workspace.plugins.length);
  workspace.plugins.forEach((p) => {
    console.log(`  - ${p.manifest.displayName || p.manifest.name} (v${p.manifest.version})`);
  });

  console.log('\n🎯 Skills:', workspace.skills.length);
  workspace.skills.forEach((s) => {
    console.log(`  - ${s.name}: ${s.description || 'No description'}`);
  });

  console.log('\n🔧 Commands:', workspace.commands.length);
  workspace.commands.forEach((c) => {
    console.log(`  - /${c.name}: ${c.description || 'No description'}`);
  });

  console.log('\n🤖 Agents:', workspace.agents.length);
  workspace.agents.forEach((a) => {
    console.log(`  - ${a.name}: ${a.description || 'No description'}`);
  });

  console.log('\n🪝 Hooks:', workspace.hooks.length);
  workspace.hooks.forEach((h) => {
    console.log(`  - ${h.type}/${h.name}: ${h.description || 'No description'}`);
  });

  if (workspace.mcpConfig) {
    console.log('\n🔌 MCP Servers:', Object.keys(workspace.mcpConfig.servers).length);
    Object.entries(workspace.mcpConfig.servers).forEach(([name, config]) => {
      console.log(`  - ${name}: ${config.command} ${config.args?.join(' ') || ''}`);
    });
  } else {
    console.log('\n🔌 MCP Servers: None configured');
  }

  if (result.warnings && result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach((w) => console.log(`  - ${w}`));
  }

  console.log('\n✨ Test completed successfully!');
}

testWorkspaceLoader().catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
