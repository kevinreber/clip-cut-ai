#!/bin/bash
# run-e2e-tests-before-push.sh
# Runs Playwright E2E tests before pushing to catch regressions on big feature branches.
# Only triggers on git push commands for non-main branches.
# Gracefully skips if Playwright or dependencies are not installed.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

# Only run on git push commands
if ! echo "$COMMAND" | grep -q "git push"; then
  exit 0
fi

CWD=$(echo "$INPUT" | jq -r '.cwd')
CURRENT_BRANCH=$(git -C "$CWD" rev-parse --abbrev-ref HEAD 2>/dev/null)

# Skip if on main/master (CI handles those)
if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
  exit 0
fi

# Check if Playwright is available
cd "$CWD"
if ! node -e "require.resolve('@playwright/test')" 2>/dev/null; then
  echo "Playwright not installed, skipping E2E tests." >&2
  exit 0
fi

# Check if any test-related, component, route, or convex files were changed since main
CHANGED_FILES=$(git -C "$CWD" diff --name-only origin/main...HEAD 2>/dev/null)

# Only run E2E tests if meaningful code changed (not just docs/config)
NEEDS_TESTS=false
echo "$CHANGED_FILES" | grep -qE '\.(tsx?|jsx?)$' && NEEDS_TESTS=true

if [ "$NEEDS_TESTS" = "false" ]; then
  exit 0
fi

echo "Running E2E tests before push..." >&2

# Run Playwright tests (chromium only for speed)
if npx playwright test --project=chromium 2>&1; then
  echo "E2E tests passed." >&2
  exit 0
else
  echo "E2E tests failed. Fix failing tests before pushing." >&2
  exit 2
fi
