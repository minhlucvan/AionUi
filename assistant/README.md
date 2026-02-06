# AionUi Assistants

This directory contains **Claude Code Assistants** - pre-configured AI assistants with dedicated workspaces for specific development domains.

## What is a Workspace?

A workspace is a complete, self-contained development environment that includes:

- **Skills** - Reusable capabilities and best practices
- **Commands** - Slash commands for quick actions (`/create-api`, `/feature-dev`)
- **Agents** - Specialized AI agents for specific tasks (code reviewer, debugger)
- **Hooks** - Lifecycle event handlers (SessionStart, PreToolUse, PostToolUse, Stop)
- **MCP Servers** - Model Context Protocol servers for extended capabilities

## Assistant Structure

Each assistant has:

- `assistant.json` - Assistant metadata (name, description, version)
- `workspace/` - The workspace template copied to each chat session

```
assistants/
└── web-development/
    ├── assistant.json           # Assistant metadata
    └── workspace/               # Workspace template
        ├── .claude-plugin/
        ├── skills/
        ├── commands/
        ├── agents/
        ├── hooks/
        └── .mcp.json
```

## Creating a New Assistant

```bash
# 1. Create assistant directory
mkdir -p assistants/my-assistant/workspace

# 2. Create assistant metadata
cat > assistants/my-assistant/assistant.json << 'EOF'
{
  "id": "my-assistant",
  "name": "My Assistant",
  "version": "1.0.0",
  "description": "Description of what this assistant does",
  "author": "Your Name",
  "workspacePath": "./workspace"
}
EOF

# 3. Create plugin manifest (optional but recommended)
mkdir -p assistants/my-assistant/workspace/.claude-plugin
cat > assistants/my-assistant/workspace/.claude-plugin/plugin.json << 'EOF'
{
  "name": "my-workspace",
  "version": "1.0.0",
  "displayName": "My Custom Workspace",
  "description": "Description of what this workspace does",
  "author": "Your Name",
  "license": "MIT"
}
EOF

# 3. Add a skill
mkdir -p assistants/my-assistant/workspace/skills
cat > assistants/my-assistant/workspace/skills/my-skill.md << 'EOF'
---
name: My Skill Name
description: What this skill does
---

# Skill Content

Detailed instructions and guidelines...
EOF

# 4. Add a command
mkdir -p assistants/my-assistant/workspace/commands
cat > assistants/my-assistant/workspace/commands/my-command.md << 'EOF'
---
description: What this command does
inputHint: User input hint
---

# Command Instructions

When user types /my-command, do this...
EOF

# 5. Add an agent (optional)
mkdir -p assistants/my-assistant/workspace/agents
cat > assistants/my-assistant/workspace/agents/my-agent.md << 'EOF'
---
name: My Agent
description: What this agent does
tools: ["read_file", "write_file"]
---

# Agent System Prompt

You are a specialized agent that...
EOF

# 6. Add hooks (optional)
mkdir -p assistants/my-assistant/workspace/hooks/SessionStart
cat > assistants/my-assistant/workspace/hooks/SessionStart/welcome.md << 'EOF'
---
description: Welcome message
priority: 100
---

Welcome to My Workspace! Available commands: /my-command
EOF

# 7. Add MCP servers (optional)
cat > assistants/my-assistant/workspace/.mcp.json << 'EOF'
{
  "servers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
      "transport": "stdio"
    }
  }
}
EOF
```

## Workspace Structure

```
my-workspace/
├── .claude-plugin/
│   └── plugin.json              # Plugin metadata
├── skills/
│   └── *.md                     # Skill definitions
├── commands/
│   └── *.md                     # Slash commands
├── agents/
│   └── *.md                     # Specialized agents
├── hooks/
│   ├── SessionStart/            # On conversation start
│   ├── PreToolUse/              # Before tool execution
│   ├── PostToolUse/             # After tool execution
│   └── Stop/                    # On conversation end
├── .mcp.json                    # MCP server configuration
└── README.md                    # Workspace documentation
```

## Markdown Frontmatter

All markdown files support YAML frontmatter for metadata:

```markdown
---
name: Display Name
description: Description text
priority: 100
tools: ['tool1', 'tool2']
---

# Content

Markdown content here...
```

## Example Workspaces

### web-development

A comprehensive workspace for modern web development with React, TypeScript, and Node.js.

**Includes:**

- React Component Creation skill
- API endpoint generator command (`/create-api`)
- Feature development workflow command (`/feature-dev`)
- Code Review agent
- SessionStart welcome hook
- Filesystem and Git MCP servers

## Using an Assistant

Assistants are activated when you create a conversation. The assistant's workspace template is automatically copied to a temporary chat folder, providing an isolated environment for each conversation.

### Workspace Template Copying

When a chat starts:

1. The workspace template from `assistants/{id}/workspace/` is copied to a temporary directory
2. Each chat session gets its own isolated workspace copy
3. Changes made during the chat don't affect the original template

Configuration in `AcpBackendConfig`:

```typescript
{
  id: 'my-assistant',
  name: 'My Assistant',
  isPreset: true,
  isClaudeCodeAssistant: true,
  presetAgentType: 'claude',
  assistantId: 'my-assistant',  // References assistants/my-assistant/
}
```

## Best Practices

1. **Keep skills focused** - Each skill should teach one specific capability
2. **Use descriptive names** - Clear file names and display names
3. **Document thoroughly** - Add README.md to your workspace
4. **Test incrementally** - Add one component at a time and test
5. **Use frontmatter** - Leverage YAML metadata for better organization
6. **Version your workspace** - Update version in plugin.json when making changes

## Testing

Test your workspace loading:

```bash
npx ts-node src/claudecode/test-workspace-loader.ts
```

Update the test script to point to your workspace path.

## Resources

- Full documentation: `CLAUDE_CODE_INTEGRATION.md`
- Type definitions: `src/claudecode/types.ts`
- Workspace loader: `src/claudecode/WorkspaceLoader.ts`

## License

Workspaces are independent and can have their own licenses. Check individual workspace LICENSE files.
