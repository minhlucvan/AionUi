/**
 * on-send-message hook for 3D Game Development Assistant
 *
 * Auto-injects @game-developer agent prefix to route all messages
 * through the game developer agent persona.
 *
 * @param {Object} context
 * @param {string} context.content - The user message content
 * @param {string} context.workspace - The workspace directory path
 * @returns {{ content: string }}
 */
module.exports = function (context) {
  // Skip if user already addressed a specific agent
  if (context.content.includes('@game-developer')) {
    return { content: context.content };
  }

  return { content: `@game-developer ${context.content}` };
};
