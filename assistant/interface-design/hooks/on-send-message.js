const fs = require('fs');
const path = require('path');

module.exports = function (context) {
  const workDir = context.workingDirectory || process.cwd();
  const systemMdPath = path.join(workDir, '.interface-design', 'system.md');

  let prefix = '';

  // Check if .interface-design/system.md exists in the workspace
  try {
    if (fs.existsSync(systemMdPath)) {
      const systemContent = fs.readFileSync(systemMdPath, 'utf-8');
      if (systemContent.trim()) {
        prefix =
          `[Design System Loaded]\n` +
          `The project has an established design system at .interface-design/system.md.\n` +
          `Apply these patterns for all UI work. Read the file before building.\n\n`;
      }
    }
  } catch {
    // Silently ignore filesystem errors
  }

  // Check if reference templates exist for first-time setup guidance
  const templatePath = path.join(workDir, 'reference', 'system-template.md');
  try {
    if (!fs.existsSync(systemMdPath) && fs.existsSync(templatePath)) {
      prefix =
        `[No Design System Yet]\n` +
        `Reference templates are available in reference/ for bootstrapping.\n` +
        `Use /interface-design:init to establish a design system, or /interface-design:extract to pull patterns from existing code.\n\n`;
    }
  } catch {
    // Silently ignore filesystem errors
  }

  if (prefix) {
    return { content: prefix + context.content };
  }

  return { content: context.content };
};
