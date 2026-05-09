#!/bin/bash
set -e

if ! node -v &>/dev/null; then
  echo "Error: Node.js is required (>=18). Install it first." >&2
  exit 1
fi

npm install -g @anthropic-ai/claude-code

echo ""
echo "Claude Code installed: $(claude --version)"
echo "You can now run: claude remote-control"
