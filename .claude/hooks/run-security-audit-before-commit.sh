#!/bin/bash
# run-security-audit-before-commit.sh
# Runs npm audit before commits to catch dependency vulnerabilities early.
# Only blocks on high/critical severity issues. Moderate/low are reported as warnings.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

# Only check git commit commands
if ! echo "$COMMAND" | grep -q "git commit"; then
  exit 0
fi

CWD=$(echo "$INPUT" | jq -r '.cwd')
cd "$CWD"

# Only run if package-lock.json or package.json is staged
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null)
HAS_PKG_CHANGES=$(echo "$STAGED_FILES" | grep -E '(package\.json|package-lock\.json)$')

if [ -z "$HAS_PKG_CHANGES" ]; then
  exit 0
fi

# Run npm audit, only fail on high or critical
echo "Running security audit on dependency changes..." >&2
AUDIT_OUTPUT=$(npm audit --audit-level=high 2>&1)
AUDIT_EXIT=$?

if [ $AUDIT_EXIT -ne 0 ]; then
  echo "" >&2
  echo "Security audit found high/critical vulnerabilities:" >&2
  echo "$AUDIT_OUTPUT" | tail -20 >&2
  echo "" >&2
  echo "Run 'npm audit fix' to resolve, or 'npm audit' for details." >&2
  echo "If the vulnerability is in a transitive dependency that cannot be fixed, note it in your commit message." >&2
  exit 2
fi

# Check for moderate vulnerabilities (warn but don't block)
MODERATE_COUNT=$(echo "$AUDIT_OUTPUT" | grep -c "moderate" 2>/dev/null || true)
if [ "$MODERATE_COUNT" -gt 0 ]; then
  echo "Security audit passed, but found moderate-severity issues. Run 'npm audit' for details." >&2
fi

echo "Security audit passed." >&2
exit 0
