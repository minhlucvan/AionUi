/**
 * on-conversation-init hook for 3D Game Development Assistant
 *
 * Runs when a new conversation is created and the workspace is ready.
 * Use this hook to set up the workspace environment.
 *
 * @param {Object} context
 * @param {string} context.workspace - The workspace directory path
 * @returns {{ content: string }}
 */
const fs = require('fs');
const path = require('path');

module.exports = function (context) {
  const workspace = context.workspace;

  // Ensure the project directory structure exists
  const dirs = ['src', 'src/scenes', 'src/components', 'assets', 'assets/models', 'assets/textures'];

  for (const dir of dirs) {
    const dirPath = path.join(workspace, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  console.log(`[game-3d] Workspace initialized: ${workspace}`);
  return { content: context.content };
};
