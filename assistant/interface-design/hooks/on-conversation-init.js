/**
 * on-conversation-init hook for Interface Design Assistant
 *
 * Runs when a new conversation is created and the workspace is ready.
 * Installs the interface-design plugin from https://github.com/Dammyjay93/interface-design
 * by cloning the repo and copying .claude/ commands and skills into the workspace.
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

  // Ensure base directories exist
  const dirs = [
    '.interface-design',
    '.claude',
    '.claude/commands',
    '.claude/skills',
    '.claude/skills/interface-design',
    '.claude/skills/interface-design/references',
  ];

  for (const dir of dirs) {
    const dirPath = path.join(workspace, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  // Check if plugin is already installed
  const skillFile = path.join(workspace, '.claude', 'skills', 'interface-design', 'SKILL.md');
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

    // Copy .claude/commands/
    const srcCommands = path.join(tmpDir, '.claude', 'commands');
    const destCommands = path.join(workspace, '.claude', 'commands');
    if (fs.existsSync(srcCommands)) {
      copyDirRecursive(srcCommands, destCommands);
    }

    // Copy .claude/skills/interface-design/
    const srcSkills = path.join(tmpDir, '.claude', 'skills', 'interface-design');
    const destSkills = path.join(workspace, '.claude', 'skills', 'interface-design');
    if (fs.existsSync(srcSkills)) {
      copyDirRecursive(srcSkills, destSkills);
    }

    // Copy reference/ directory if it exists
    const srcReference = path.join(tmpDir, 'reference');
    const destReference = path.join(workspace, 'reference');
    if (fs.existsSync(srcReference)) {
      if (!fs.existsSync(destReference)) {
        fs.mkdirSync(destReference, { recursive: true });
      }
      copyDirRecursive(srcReference, destReference);
    }

    console.log('[interface-design] Plugin installed successfully.');
  } catch (err) {
    console.error('[interface-design] Failed to install plugin:', err.message);
    console.log('[interface-design] Workspace initialized with base structure only.');
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
