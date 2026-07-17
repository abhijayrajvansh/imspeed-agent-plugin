#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
installer="$repo_root/scripts/install-agents.sh"
test_roots=()

new_root() {
  local root
  root="$(mktemp -d)"
  test_roots+=("$root")
  echo "$root"
}

cleanup() {
  for root in "${test_roots[@]+"${test_roots[@]}"}"; do
    rm -rf "$root"
  done
}
trap cleanup EXIT

assert_exit_code() {
  local expected_code="$1"
  shift

  set +e
  "$@"
  local status=$?
  set -e

  if [ "$status" -ne "$expected_code" ]; then
    if [ "$status" -eq 0 ]; then
      echo "expected exit code $expected_code, but command succeeded: $*" >&2
    else
      echo "expected exit code $expected_code, got $status: $*" >&2
    fi
    exit 1
  fi
}

assert_installed_files() {
  local root="$1"
  test -f "$root/agents/imspeed-explorer.toml"
  test -f "$root/agents/imspeed-final-reviewer-deep.toml"
  test -f "$root/imspeed.config.toml"
}

test_root="$(new_root)"
bash "$installer" --codex-home "$test_root"
assert_installed_files "$test_root"

bash "$installer" --codex-home "$test_root"
assert_installed_files "$test_root"

mkdir -p "$test_root/agents"
printf '%s\n' 'conflicting content' > "$test_root/agents/imspeed-explorer.toml"
assert_exit_code 3 bash "$installer" --codex-home "$test_root"

assert_exit_code 0 bash "$installer" --codex-home "$test_root" --force
cmp "$repo_root/agents/imspeed-explorer.toml" "$test_root/agents/imspeed-explorer.toml"

late_conflict_root="$(new_root)"
printf '%s\n' 'conflicting config content' > "$late_conflict_root/imspeed.config.toml"
assert_exit_code 3 bash "$installer" --codex-home "$late_conflict_root"
test ! -f "$late_conflict_root/agents/imspeed-explorer.toml"
test "$(cat "$late_conflict_root/imspeed.config.toml")" = "conflicting config content"

assert_exit_code 2 bash "$installer" --codex-home
assert_exit_code 2 bash "$installer" --no-such-flag

forced_front_root="$(new_root)"
bash "$installer" --force --codex-home "$forced_front_root"
assert_installed_files "$forced_front_root"

forced_rear_root="$(new_root)"
bash "$installer" --codex-home "$forced_rear_root" --force
assert_installed_files "$forced_rear_root"
