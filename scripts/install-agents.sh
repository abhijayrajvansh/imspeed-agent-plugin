#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
codex_root="${CODEX_HOME:-$HOME/.codex}"
force=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --codex-home)
      if [ "$#" -lt 2 ]; then
        echo "Missing value for --codex-home" >&2
        exit 2
      fi
      codex_root="$2"
      shift 2
      ;;
    --force)
      force=1
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

install_file() {
  source_file="$1"
  destination_file="$2"

  mkdir -p "$(dirname "$destination_file")"

  if [ -e "$destination_file" ] && ! cmp -s "$source_file" "$destination_file"; then
    if [ "$force" -ne 1 ]; then
      echo "Conflict: $destination_file differs; rerun with --force to replace it" >&2
      exit 3
    fi
  fi

  cp "$source_file" "$destination_file"
}

for source_file in "$repo_root"/agents/imspeed-*.toml; do
  install_file "$source_file" "$codex_root/agents/$(basename "$source_file")"
done
install_file "$repo_root/config/imspeed.config.toml" "$codex_root/imspeed.config.toml"

echo "Installed IMSpeed agents and coordinator profile in $codex_root"
