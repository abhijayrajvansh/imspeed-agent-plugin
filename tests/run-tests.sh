#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

test_files=()
while IFS= read -r test_file; do
  test_files+=("$test_file")
done < <(find tests -maxdepth 1 -name '*.test.mjs' -type f -print | sort)
node --test "${test_files[@]}"
bash tests/install-agents.test.sh
node scripts/validate-plugin.mjs
