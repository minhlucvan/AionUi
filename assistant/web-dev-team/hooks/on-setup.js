/**
 * on-setup hook for Web Development Team
 *
 * Fires after workspace init, before conversation is saved to DB.
 * Ensures team mode is enabled and environment variables are set.
 */
module.exports = {
  onSetup: function (context) {
    return {
      // Enable team mode
      isTeam: true,
      // Set Claude Code agent teams environment variable
      customEnv: {
        CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1',
        ...(context.customEnv || {}),
      },
    };
  },
};
