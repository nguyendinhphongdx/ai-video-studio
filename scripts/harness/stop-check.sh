#!/usr/bin/env bash
# Claude Code "Stop" hook: do not let the agent say "done" while typecheck or lint is red.
# Exit 2 with the failure on stderr makes the agent continue and fix it. Tests are left to /check and CI (they are slow).
set -u
cd "$(dirname "$0")/../.." || exit 0

# Stop hooks run again after the agent continues; never loop forever.
payload="$(cat)"
case "$payload" in *'"stop_hook_active":true'* | *'"stop_hook_active": true'*) exit 0 ;; esac

# Nothing code-like changed: nothing to check.
if [ -z "$(git status --porcelain -- src tests remotion scripts drizzle eslint.config.mjs tsconfig.json 2>/dev/null)" ]; then exit 0; fi

fail=0
out="$(npm run --silent typecheck 2>&1)" || { echo "typecheck failed:" >&2; echo "$out" | tail -40 >&2; fail=1; }
out="$(npm run --silent lint 2>&1)" || { echo "lint failed:" >&2; echo "$out" | tail -40 >&2; fail=1; }

if [ "$fail" -ne 0 ]; then
  echo "Fix these before finishing (npm run check must be green, AGENTS.md)." >&2
  exit 2
fi
exit 0
