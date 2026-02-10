/**
 * on-conversation-init hook for Interface Design Assistant
 *
 * Runs when a new conversation is created and the workspace is ready.
 * Installs the interface-design plugin from https://github.com/Dammyjay93/interface-design
 * using the Claude CLI plugin system.
 *
 * @param {Object} context
 * @param {string} context.workspace - The workspace directory path
 * @returns {{ content: string }}
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MARKETPLACE_REPO = 'Dammyjay93/interface-design';
const PLUGIN_NAME = 'interface-design@interface-design';

module.exports = function (context) {
  const workspace = context.workspace;

  // Ensure .interface-design directory exists for design system storage
  const designDir = path.join(workspace, '.interface-design');
  if (!fs.existsSync(designDir)) {
    fs.mkdirSync(designDir, { recursive: true });
  }

  try {
    // Add the marketplace source
    console.log('[interface-design] Adding plugin marketplace...');
    execSync(`claude plugin marketplace add ${MARKETPLACE_REPO}`, {
      cwd: workspace,
      stdio: 'pipe',
      timeout: 30000,
    });

    // Install plugin with project scope so it's available in the workspace
    console.log('[interface-design] Installing plugin...');
    execSync(`claude plugin install ${PLUGIN_NAME} --scope project`, {
      cwd: workspace,
      stdio: 'pipe',
      timeout: 30000,
    });

    console.log('[interface-design] Plugin installed successfully.');
  } catch (err) {
    console.error('[interface-design] Failed to install plugin:', err.message);
  }

  return { content: context.content };
};
