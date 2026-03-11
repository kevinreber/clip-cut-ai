#!/bin/bash
# run-checks-before-commit.sh
# Runs lint and build checks before committing to catch issues early.
# Only triggers on git commit commands.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

# Only check git commit commands
if ! echo "$COMMAND" | grep -q "git commit"; then
  exit 0
fi

CWD=$(echo "$INPUT" | jq -r '.cwd')
cd "$CWD"

# Check if any code files are staged
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null)
HAS_CODE=$(echo "$STAGED_FILES" | grep -E '\.(tsx?|jsx?|mjs|cjs)$')

if [ -z "$HAS_CODE" ]; then
  exit 0
fi

# Run ESLint
echo "Running lint check..." >&2
if ! npm run lint 2>&1; then
  echo "Lint check failed. Fix lint errors before committing." >&2
  exit 2
fi

# Run build
echo "Running build check..." >&2
if ! npm run build 2>&1 >/dev/null; then
  echo "Build check failed. Fix build errors before committing." >&2
  exit 2
fi

echo "All checks passed." >&2
exit 0
