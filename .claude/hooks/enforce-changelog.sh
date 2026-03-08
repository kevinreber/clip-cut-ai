#!/bin/bash
# enforce-changelog.sh
# Blocks git commit commands if CHANGELOG.md is not staged.
# This ensures every commit with user-facing changes includes a changelog entry.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

# Only check git commit commands
if ! echo "$COMMAND" | grep -q "git commit"; then
  exit 0
fi

CWD=$(echo "$INPUT" | jq -r '.cwd')

# Check if CHANGELOG.md is staged for this commit
if git -C "$CWD" diff --cached --name-only | grep -q "CHANGELOG.md"; then
  exit 0
fi

# Check if CHANGELOG.md has unstaged changes (modified but not yet added)
if git -C "$CWD" diff --name-only | grep -q "CHANGELOG.md"; then
  echo "CHANGELOG.md has been modified but is not staged. Run 'git add CHANGELOG.md' before committing." >&2
  exit 2
fi

# CHANGELOG.md was not touched at all — block the commit
echo "CHANGELOG.md must be updated before committing. Add an entry under [Unreleased] describing your changes." >&2
exit 2
