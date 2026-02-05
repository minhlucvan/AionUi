# Web Development Assistant - Claude Code Workspace

A comprehensive Claude Code workspace for modern web development with React, TypeScript, and Node.js.

## Features

### 🎯 Skills
- **React Component Creation** - Best practices for building production-ready React components with TypeScript

### 🔧 Commands
- `/create-api` - Generate REST API endpoints with proper typing and validation
- `/feature-dev` - Plan and implement complete features from frontend to backend

### 🤖 Agents
- **Code Reviewer** - Specialized agent for reviewing code quality, security, and best practices

### 🪝 Hooks
- **SessionStart** - Welcome message with workspace capabilities

### 🔌 MCP Servers
- **Filesystem** - File system access for reading/writing files
- **Git** - Git operations and repository management

## Workspace Structure

```
web-development/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest
├── skills/
│   └── react-component.md       # React component creation guidelines
├── commands/
│   ├── create-api.md            # API endpoint generator
│   └── feature-dev.md           # Feature development workflow
├── agents/
│   └── code-reviewer.md         # Code review agent
├── hooks/
│   └── SessionStart/
│       └── welcome.md           # Welcome hook
├── .mcp.json                    # MCP server configuration
└── README.md                    # This file
```

## Usage

This workspace is designed to be used as a Claude Code Assistant in AionUi. When you start a conversation with this assistant, all skills, commands, agents, and MCP servers will be automatically loaded and available.

## Customization

You can customize this workspace by:

1. **Adding Skills** - Create new `.md` files in `skills/` directory
2. **Adding Commands** - Create new `.md` files in `commands/` directory
3. **Adding Agents** - Create new `.md` files in `agents/` directory
4. **Adding Hooks** - Create new `.md` files in appropriate `hooks/` subdirectories
5. **Configuring MCP** - Edit `.mcp.json` to add/remove MCP servers

All markdown files support YAML frontmatter for metadata.

## Example

When you use this assistant and type `/create-api`, it will guide you through creating a production-ready REST API endpoint with:

- Route handler with proper TypeScript typing
- Request validation middleware
- Response formatting
- Error handling
- API documentation
- Unit tests

## Requirements

- Node.js 18+ (for MCP servers)
- Claude Code CLI (for native Claude Code compatibility)
- Or AionUi with Claude Code workspace support

## License

Apache-2.0
