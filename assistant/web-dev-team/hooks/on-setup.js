/**
 * on-setup hook for Web Development Team
 *
 * Fires after workspace init, before conversation is saved to DB.
 * Ensures team mode is enabled and environment variables are set.
 *
 * @param {Object} context
 * @param {string} context.workspace - The workspace directory path
 * @param {boolean} context.isTeam - Whether team mode is detected
 * @param {Record<string, string>} context.customEnv - Custom environment variables
 * @param {Array} context.teamMembers - Team member definitions
 * @returns {{ isTeam?: boolean, customEnv?: Record<string, string> }}
 */
module.exports = function (context) {
  return {
    // Enable team mode
    isTeam: true,
    // Set Claude Code agent teams environment variable
    customEnv: {
      CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1',
      ...(context.customEnv || {}),
    },
  };
};
