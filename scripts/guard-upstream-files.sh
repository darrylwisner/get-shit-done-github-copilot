#!/usr/bin/env bash
# guard-upstream-files.sh — Prevents the repair agent from modifying upstream-owned files.
# Usage: bash scripts/guard-upstream-files.sh pre-commit
#        bash scripts/guard-upstream-files.sh post-commit
set -euo pipefail

MODE="${1:-post-commit}"

# Dynamically detect upstream-owned files
git ls-tree -r --name-only upstream/main | sort > /tmp/upstream-owned-files.txt

if [ "$MODE" = "pre-commit" ]; then
  # Check staged files
  git diff --cached --name-only | sort > /tmp/staged-files.txt
  VIOLATIONS=$(comm -12 /tmp/upstream-owned-files.txt /tmp/staged-files.txt || true)
  if [ -n "$VIOLATIONS" ]; then
    echo "::error::Filesystem guard (pre-commit): repair agent modified upstream-owned files:"
    echo "$VIOLATIONS"
    echo "$VIOLATIONS" | xargs git restore --staged
    echo "::error::Staged changes reverted. Failing."
    exit 1
  fi
  echo "Filesystem guard (pre-commit): no violations."
elif [ "$MODE" = "post-commit" ]; then
  # Check files changed relative to origin/main
  git diff --name-only origin/main HEAD | sort > /tmp/committed-files.txt
  VIOLATIONS=$(comm -12 /tmp/upstream-owned-files.txt /tmp/committed-files.txt || true)
  if [ -n "$VIOLATIONS" ]; then
    echo "::error::Filesystem guard (post-commit): repair agent committed changes to upstream-owned files:"
    echo "$VIOLATIONS"
    # Revert each violated file to origin/main and force-push
    echo "$VIOLATIONS" | while IFS= read -r f; do
      git checkout origin/main -- "$f"
    done
    git commit --amend --no-edit || true
    git push --force-with-lease origin HEAD
    echo "::error::Upstream-owned files reverted and force-pushed. Failing."
    exit 1
  fi
  echo "Filesystem guard (post-commit): no violations."
else
  echo "Unknown mode: $MODE. Use pre-commit or post-commit." >&2
  exit 2
fi
