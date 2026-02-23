module.exports = function (context) {
  // Auto-route all messages through the art-consultant agent
  if (context.content.includes('@art-consultant') ||
      context.content.includes('@code-generator') ||
      context.content.includes('@quality-reviewer')) {
    return { content: context.content };
  }
  return { content: `@art-consultant ${context.content}` };
};
