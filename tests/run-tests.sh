#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

node --test tests/*.test.mjs
bash tests/install-agents.test.sh
node scripts/validate-plugin.mjs
