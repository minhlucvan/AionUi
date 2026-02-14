/**
 * on-send-message hook for Web Development Team
 *
 * Detects first message and prepends team setup instructions to enforce
 * proper team spawning via Task tool.
 */
module.exports = {
  onSendMessage: async function (context) {
    // Only apply on first message
    // Detect first message by checking if .claude directory exists in workspace
    // (it gets created after first message when team is spawned)
    const fs = require('fs');
    const path = require('path');

    const claudeDir = path.join(context.workspace, '.claude');

    try {
      // If .claude directory exists, team was already spawned
      if (fs.existsSync(claudeDir)) {
        return {};
      }
    } catch (error) {
      console.log('[web-dev-team hook] Could not check .claude directory:', error);
    }

    const teamSetupPrompt = `⚠️ CRITICAL TEAM SETUP - MANDATORY FIRST STEP ⚠️

You are a TEAM LEAD, not a solo developer. Your role is to DELEGATE work via the Task tool.

🚫 DO NOT DO ANY OF THESE YOURSELF:
- DO NOT create design documents yourself
- DO NOT write code yourself
- DO NOT build components yourself
- DO NOT create Next.js projects yourself
- DO NOT perform QA or write tests yourself

✅ YOU MUST USE THE Task TOOL IMMEDIATELY TO SPAWN YOUR TEAM:

Use the TaskCreate tool THREE times in your FIRST response to create these tasks:

TASK 1 - Designer:
{
  "subject": "Create design specifications and design system",
  "description": "Research the requirements, create comprehensive design specifications including layout, components, color scheme, typography, and responsive breakpoints. Document the design system for the development team.",
  "activeForm": "Creating design specifications"
}
Then use TaskUpdate to assign this task to "designer" agent.

TASK 2 - Developer (BLOCKED BY TASK 1):
{
  "subject": "Build Next.js application with shadcn/ui",
  "description": "Set up Next.js 14+ project, install shadcn/ui, implement all UI components based on design specs, ensure responsive design and accessibility. Follow the design system exactly.",
  "activeForm": "Building Next.js application"
}
Then use TaskUpdate to:
- Assign to "developer" agent
- Set blockedBy: [task 1 ID]

TASK 3 - QA (BLOCKED BY TASK 2):
{
  "subject": "Write tests and perform QA review",
  "description": "Create comprehensive test suite (unit, integration, e2e), review code quality, check accessibility compliance, verify responsive design, test cross-browser compatibility.",
  "activeForm": "Writing tests and performing QA"
}
Then use TaskUpdate to:
- Assign to "qa" agent
- Set blockedBy: [task 2 ID]

CRITICAL: If you create design documents or write code yourself instead of using the Task tool to spawn team members, you are VIOLATING THE TEAM PROTOCOL.

After spawning all three team members, step back and let them work. Your job is coordination only.

---

USER REQUEST TO DELEGATE TO YOUR TEAM:
${context.content}`;

    return {
      // Override content with team setup instructions
      content: teamSetupPrompt,
    };
  },
};
