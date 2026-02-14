/**
 * Simple Team - Auto-spawn team members on first user message
 */

module.exports = async (context, params) => {
  const { callTool, log, getEnv } = context;
  const { isFirstMessage } = params;

  // Only run on first message
  if (!isFirstMessage) return;

  // Check if teams are enabled
  const teamsEnabled = getEnv('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS');
  if (teamsEnabled !== '1') {
    log('[Simple Team] Teams not enabled, skipping spawn');
    return;
  }

  log('[Simple Team] First message detected, spawning team members...');

  try {
    // Spawn Worker
    log('[Simple Team] Spawning Worker...');
    await callTool('Task', {
      prompt: 'You are the Worker. Wait for tasks from the Commander.',
      description: 'Spawn Worker agent',
      subagent_type: 'worker',
      model: 'sonnet',
    });

    log('[Simple Team] Team members spawned successfully!');
  } catch (error) {
    log(`[Simple Team] Error spawning team: ${error.message}`);
  }
};
