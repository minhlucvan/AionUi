#!/bin/bash
# Template: Control AionUi's sidebar browser via agent-browser + CDP
#
# This script demonstrates how to use agent-browser to control the same
# browser instance that's visible in AionUi's sidebar preview panel.

# Read the CDP port that AionUi auto-discovers on startup
CDP_PORT_FILE="$HOME/.aionui/cdp-port"

if [ ! -f "$CDP_PORT_FILE" ]; then
  echo "Error: AionUi CDP port file not found at $CDP_PORT_FILE"
  echo "Make sure AionUi is running."
  exit 1
fi

CDP_PORT=$(cat "$CDP_PORT_FILE")

if [ -z "$CDP_PORT" ] || [ "$CDP_PORT" = "0" ]; then
  echo "Error: Invalid CDP port. AionUi may not have CDP enabled."
  exit 1
fi

echo "Connecting to AionUi sidebar browser on CDP port $CDP_PORT..."

# Navigate to a URL (will be visible in the sidebar)
agent-browser --cdp "$CDP_PORT" open "${1:-https://example.com}"

# Take a snapshot of interactive elements
agent-browser --cdp "$CDP_PORT" snapshot -i

# Example: take a screenshot
# agent-browser --cdp "$CDP_PORT" screenshot sidebar.png
