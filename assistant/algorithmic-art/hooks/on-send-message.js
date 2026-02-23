/**
 * on-send-message hook for Algorithmic Art Assistant
 *
 * Auto-injects @art-director agent prefix to route all messages
 * through the art director agent persona.
 *
 * @param {Object} context
 * @param {string} context.content - The user message content
 * @param {string} context.workspace - The workspace directory path
 * @returns {{ content: string }}
 */
module.exports = function (context) {
  // Skip if user already addressed a specific agent
  if (
    context.content.includes('@art-director') ||
    context.content.includes('@algorithm-engineer') ||
    context.content.includes('@visualization-expert')
  ) {
    return { content: context.content };
  }

  return { content: `@art-director ${context.content}` };
};
