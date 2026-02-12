module.exports = {
  /**
   * onWorkspaceInit hook
   * - Ensures .landing-page/ directory exists
   * - Copies reference templates from workspace/reference/
   */
  onWorkspaceInit: {
    handler: async (context) => {
      const { workspace, utils } = context;
      if (!utils) return;

      try {
        const pageDir = utils.join(workspace, '.landing-page');
        await utils.ensureDir(pageDir);

        const refDir = utils.join(workspace, 'reference');
        const refTargetDir = utils.join(pageDir, 'reference');

        if (await utils.exists(refDir)) {
          if (!(await utils.exists(refTargetDir))) {
            await utils.copyDirectory(refDir, refTargetDir);
          }
        }
      } catch (error) {
        console.warn('[landing-page-builder] Workspace init warning:', error.message);
      }
    },
    priority: 20,
  },

  /**
   * onFirstMessage hook
   * - Injects landing page system context if .landing-page/system.md exists
   * - Prefixes message with page direction status
   */
  onFirstMessage: {
    handler: async (context) => {
      const { workspace, utils, content } = context;
      if (!utils || !content) return {};

      const systemMdPath = utils.join(workspace, '.landing-page', 'system.md');

      try {
        if (await utils.exists(systemMdPath)) {
          const systemContent = await utils.readFile(systemMdPath, 'utf-8');
          if (systemContent.trim()) {
            const prefix =
              `[Landing Page Direction Active]\n` +
              `This project has an established page direction at .landing-page/system.md.\n` +
              `Read it and apply these patterns for all landing page work.\n\n`;
            return { content: prefix + content };
          }
        }
      } catch {
        // Silently ignore
      }

      const templatePath = utils.join(workspace, 'reference', 'system-template.md');

      try {
        if (await utils.exists(templatePath)) {
          const prefix =
            `[No Page Direction Yet]\n` +
            `Reference templates are available in reference/ for bootstrapping.\n` +
            `Use /landing-page-builder:init to establish a page direction, or /landing-page-builder:extract to pull patterns from existing code.\n\n`;
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
