#!/bin/bash

# Verification script for web-dev-team task spawning
# Usage: ./scripts/verify-team-spawn.sh <workspace-path>

set -e

WORKSPACE_PATH="${1:-}"

if [ -z "$WORKSPACE_PATH" ]; then
  echo "❌ Error: Please provide workspace path"
  echo "Usage: $0 <workspace-path>"
  echo "Example: $0 /Users/minh/.aionui/claude-temp-1234567890"
  exit 1
fi

if [ ! -d "$WORKSPACE_PATH" ]; then
  echo "❌ Error: Workspace directory does not exist: $WORKSPACE_PATH"
  exit 1
fi

echo "🔍 Verifying team infrastructure in: $WORKSPACE_PATH"
echo ""

# Check for .claude directory
if [ -d "$WORKSPACE_PATH/.claude" ]; then
  echo "✅ .claude directory exists"
else
  echo "❌ .claude directory NOT found (team was never spawned)"
  exit 1
fi

# Check for teams directory
if [ -d "$WORKSPACE_PATH/.claude/teams" ]; then
  echo "✅ .claude/teams directory exists"

  # List team directories
  TEAM_DIRS=$(find "$WORKSPACE_PATH/.claude/teams" -maxdepth 1 -type d | tail -n +2)
  if [ -n "$TEAM_DIRS" ]; then
    echo "✅ Found team directories:"
    echo "$TEAM_DIRS" | while read -r dir; do
      echo "   - $(basename "$dir")"
    done
  else
    echo "⚠️  No team directories found in .claude/teams"
  fi
else
  echo "❌ .claude/teams directory NOT found"
  exit 1
fi

# Check for team config files
CONFIG_FILES=$(find "$WORKSPACE_PATH/.claude/teams" -name "config.json" 2>/dev/null || true)
if [ -n "$CONFIG_FILES" ]; then
  echo "✅ Found team configuration files:"
  echo "$CONFIG_FILES" | while read -r config; do
    echo "   - $config"
    echo "     Members: $(jq -r '.members[].name' "$config" 2>/dev/null | tr '\n' ', ' | sed 's/,$//')"
  done
else
  echo "❌ No team config.json files found"
  exit 1
fi

# Check for task files
TASK_FILES=$(find "$WORKSPACE_PATH/.claude" -name "tasks.jsonl" 2>/dev/null || true)
if [ -n "$TASK_FILES" ]; then
  echo "✅ Found task list files:"
  echo "$TASK_FILES" | while read -r tasks; do
    TASK_COUNT=$(wc -l < "$tasks" | tr -d ' ')
    echo "   - $tasks ($TASK_COUNT tasks)"

    # Show task subjects
    echo "     Tasks:"
    cat "$tasks" | while read -r line; do
      SUBJECT=$(echo "$line" | jq -r '.subject' 2>/dev/null || echo "")
      OWNER=$(echo "$line" | jq -r '.owner // "unassigned"' 2>/dev/null || echo "")
      STATUS=$(echo "$line" | jq -r '.status' 2>/dev/null || echo "")
      if [ -n "$SUBJECT" ]; then
        echo "       [$STATUS] $SUBJECT (owner: $OWNER)"
      fi
    done
  done
else
  echo "⚠️  No tasks.jsonl files found"
fi

# Check for actual work products
echo ""
echo "📁 Workspace contents:"
ls -lh "$WORKSPACE_PATH" | tail -n +2

echo ""
echo "✅ Team infrastructure verification complete!"
echo ""
echo "Expected structure:"
echo "  $WORKSPACE_PATH/"
echo "  ├── .claude/"
echo "  │   ├── teams/"
echo "  │   │   └── <team-name>/"
echo "  │   │       ├── config.json"
echo "  │   │       └── tasks/"
echo "  │   │           └── tasks.jsonl"
echo "  │   └── tasks/"
echo "  │       └── <task-id>/"
echo "  │           └── tasks.jsonl"
echo "  └── [project files created by team members]"
