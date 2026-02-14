/**
 * Simple Team - Auto-enable teams and spawn members on setup
 */

module.exports = async (context) => {
  const { setEnv, log } = context;

  log('[Simple Team] Setting up team environment...');

  // Enable teams feature
  setEnv('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS', '1');

  log('[Simple Team] Team environment ready');
};
