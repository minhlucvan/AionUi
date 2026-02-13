/**
 * on-first-message hook for Web Development Team
 *
 * Automatically enables Claude Code agent teams and prepends team setup
 * instructions to the first user message.
 *
 * @param {Object} context
 * @param {string} context.content - The user message content
 * @param {string} context.workspace - The workspace directory path
 * @param {boolean} context.isTeam - Whether team mode is detected
 * @param {Record<string, string>} context.customEnv - Custom environment variables
 * @returns {{ content?: string, isTeam?: boolean, customEnv?: Record<string, string> }}
 */
module.exports = function (context) {
  const teamSetupPrompt = `[TEAM SETUP REQUIRED]

You are the team lead for a web development project. Before working on the user's request, you MUST:

1. Use the Task tool to spawn your team members:
   - Create a task "Create design specifications and design system" → assign to "designer"
   - Create a task "Build application with Next.js and shadcn/ui" → assign to "developer" (set blockedBy: designer's task)
   - Create a task "Write tests and perform QA review" → assign to "qa" (set blockedBy: developer's task)

2. After spawning the team, coordinate their work to fulfill the user's request below.

---

USER REQUEST:
${context.content}`;

  return {
    // Override content with team setup instructions
    content: teamSetupPrompt,
    // Ensure team mode is enabled
    isTeam: true,
    // Set Claude Code experimental agent teams environment variable
    customEnv: {
      CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1',
      ...(context.customEnv || {}),
    },
  };
};
