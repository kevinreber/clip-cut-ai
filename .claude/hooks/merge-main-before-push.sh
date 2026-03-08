#!/bin/bash
# merge-main-before-push.sh
# Before pushing, fetch and merge origin/main into the current branch
# to prevent merge conflicts in PRs. Skips if already on main.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

# Only run on git push commands
if ! echo "$COMMAND" | grep -q "git push"; then
  exit 0
fi

CWD=$(echo "$INPUT" | jq -r '.cwd')
CURRENT_BRANCH=$(git -C "$CWD" rev-parse --abbrev-ref HEAD 2>/dev/null)

# Skip if on main branch
if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
  exit 0
fi

# Fetch latest main (with retries for network issues)
MAX_RETRIES=3
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
  if git -C "$CWD" fetch origin main 2>/dev/null; then
    break
  fi
  RETRY=$((RETRY + 1))
  if [ $RETRY -lt $MAX_RETRIES ]; then
    sleep 2
  fi
done

if [ $RETRY -eq $MAX_RETRIES ]; then
  echo "Warning: Could not fetch origin/main, skipping merge check." >&2
  exit 0
fi

# Check if main has new commits not in our branch
BEHIND=$(git -C "$CWD" rev-list --count HEAD..origin/main 2>/dev/null)

if [ "$BEHIND" = "0" ] || [ -z "$BEHIND" ]; then
  # Already up to date
  exit 0
fi

# Try to merge main
if git -C "$CWD" merge origin/main --no-edit 2>/dev/null; then
  echo "Auto-merged origin/main ($BEHIND new commit(s)) into $CURRENT_BRANCH." >&2
  exit 0
else
  # Merge conflict — abort and let the user/Claude handle it
  git -C "$CWD" merge --abort 2>/dev/null
  echo "Merge conflict detected with origin/main ($BEHIND new commit(s)). Merge main manually before pushing." >&2
  exit 2
fi
