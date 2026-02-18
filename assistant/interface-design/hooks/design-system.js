/**
 * Interface Design - Module-Based Hooks
 *
 * Handles design system memory lifecycle:
 * 1. onWorkspaceInit: Ensure .interface-design/ directory exists, copy reference templates
 * 2. onFirstMessage: Inject design system context if system.md exists
 */

const path = require('path');

module.exports = {
  /**
   * Workspace initialization hook
   * Sets up .interface-design/ directory and copies reference templates
   */
  onWorkspaceInit: {
    handler: async (context) => {
      const { workspace, utils } = context;
      if (!utils) return;

      try {
        // Ensure .interface-design/ directory exists for future system.md saves
        const designDir = utils.join(workspace, '.interface-design');
        await utils.ensureDir(designDir);

        // Copy reference templates if they exist in workspace but not yet in .interface-design/
        const refDir = utils.join(workspace, 'reference');
        const refTargetDir = utils.join(designDir, 'reference');

        if (await utils.exists(refDir)) {
          if (!(await utils.exists(refTargetDir))) {
            await utils.copyDirectory(refDir, refTargetDir);
          }
        }
      } catch (error) {
        console.warn('[interface-design] Workspace init warning:', error.message);
      }
    },
    priority: 20,
  },

  /**
   * First message hook
   * Injects design system context when .interface-design/system.md exists
   */
  onFirstMessage: {
    handler: async (context) => {
      const { workspace, utils, content } = context;
      if (!utils || !content) return {};

      const systemMdPath = utils.join(workspace, '.interface-design', 'system.md');

      try {
        if (await utils.exists(systemMdPath)) {
          const systemContent = await utils.readFile(systemMdPath, 'utf-8');
          if (systemContent.trim()) {
            const prefix =
              `[Design System Active]\n` +
              `This project has an established design system at .interface-design/system.md.\n` +
              `Read it and apply these patterns for all UI work.\n\n`;
            return { content: prefix + content };
          }
        }
      } catch {
        // Silently ignore — system.md may not exist yet
      }

      // No system.md — hint about initialization on first message
      const templatePath = utils.join(workspace, 'reference', 'system-template.md');
      try {
        if (await utils.exists(templatePath)) {
          const prefix =
            `[No Design System Yet]\n` +
            `Reference templates are available in reference/ for bootstrapping.\n` +
            `Use /interface-design:init to establish a design system, or /interface-design:extract to pull patterns from existing code.\n\n`;
          return { content: prefix + content };
        }
      } catch {
        // Silently ignore
      }

      return {};
    },
    priority: 50,
  },
};
