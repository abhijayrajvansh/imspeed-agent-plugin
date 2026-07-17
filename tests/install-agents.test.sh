#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
test_root="$(mktemp -d)"
trap 'rm -rf "$test_root"' EXIT

bash "$repo_root/scripts/install-agents.sh" --codex-home "$test_root"
test -f "$test_root/agents/imspeed-explorer.toml"
test -f "$test_root/agents/imspeed-final-reviewer-deep.toml"
test -f "$test_root/imspeed.config.toml"

bash "$repo_root/scripts/install-agents.sh" --codex-home "$test_root"

printf '%s\n' 'conflicting content' > "$test_root/agents/imspeed-explorer.toml"
if bash "$repo_root/scripts/install-agents.sh" --codex-home "$test_root"; then
  echo "expected conflicting install to fail" >&2
  exit 1
else
  test "$?" -eq 3
fi

bash "$repo_root/scripts/install-agents.sh" --codex-home "$test_root" --force
cmp "$repo_root/agents/imspeed-explorer.toml" "$test_root/agents/imspeed-explorer.toml"
