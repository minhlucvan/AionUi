/**
 * on-conversation-init hook for Interface Design Assistant
 *
 * Runs when a new conversation is created and the workspace is ready.
 * Installs the interface-design plugin from https://github.com/Dammyjay93/interface-design
 * by cloning the repo and copying .claude/ contents (commands, skills) into the workspace.
 *
 * @param {Object} context
 * @param {string} context.workspace - The workspace directory path
 * @returns {{ content: string }}
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const REPO_URL = 'https://github.com/Dammyjay93/interface-design.git';

module.exports = function (context) {
  const workspace = context.workspace;

  // Ensure .interface-design directory exists for design system storage
  const designDir = path.join(workspace, '.interface-design');
  if (!fs.existsSync(designDir)) {
    fs.mkdirSync(designDir, { recursive: true });
  }

  // Check if plugin is already installed
  const claudeDir = path.join(workspace, '.claude');
  const skillFile = path.join(claudeDir, 'skills', 'interface-design', 'SKILL.md');
  if (fs.existsSync(skillFile)) {
    console.log('[interface-design] Plugin already installed, skipping.');
    return { content: context.content };
  }

  // Clone the repo to a temp directory and copy plugin files
  const tmpDir = path.join(os.tmpdir(), `interface-design-${Date.now()}`);
  try {
    console.log('[interface-design] Installing plugin from GitHub...');
    execSync(`git clone --depth 1 ${REPO_URL} "${tmpDir}"`, {
      stdio: 'pipe',
      timeout: 30000,
    });

    // Copy entire .claude/ directory from the plugin repo
    const srcClaude = path.join(tmpDir, '.claude');
    if (fs.existsSync(srcClaude)) {
      copyDirRecursive(srcClaude, claudeDir);
    }

    // Copy reference/ directory if it exists
    const srcReference = path.join(tmpDir, 'reference');
    const destReference = path.join(workspace, 'reference');
    if (fs.existsSync(srcReference)) {
      copyDirRecursive(srcReference, destReference);
    }

    console.log('[interface-design] Plugin installed successfully.');
  } catch (err) {
    console.error('[interface-design] Failed to install plugin:', err.message);
  } finally {
    // Clean up temp directory
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {
      // Ignore cleanup errors
    }
  }

  return { content: context.content };
};

/**
 * Recursively copy directory contents from src to dest
 */
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
