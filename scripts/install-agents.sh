#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
codex_root="${CODEX_HOME:-$HOME/.codex}"
force=0
source_files=()
destination_files=()

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

add_install_target() {
  local source_file="$1"
  local destination_file="$2"
  source_files+=("$source_file")
  destination_files+=("$destination_file")
}

build_install_plan() {
  for source_file in "$repo_root"/agents/imspeed-*.toml; do
    add_install_target "$source_file" "$codex_root/agents/$(basename "$source_file")"
  done
  add_install_target "$repo_root/config/imspeed.config.toml" "$codex_root/imspeed.config.toml"
}

check_conflicts() {
  local source_file
  local destination_file
  local i=0
  while [ "$i" -lt "${#source_files[@]}" ]; do
    source_file="${source_files[$i]}"
    destination_file="${destination_files[$i]}"
    if [ -e "$destination_file" ] && ! cmp -s "$source_file" "$destination_file"; then
      if [ "$force" -ne 1 ]; then
        echo "Conflict: $destination_file differs; rerun with --force to replace it" >&2
        exit 3
      fi
    fi
    i=$((i + 1))
  done
}

perform_install() {
  source_file="$1"
  destination_file="$2"

  mkdir -p "$(dirname "$destination_file")"
  cp "$source_file" "$destination_file"
}

build_install_plan
check_conflicts

for i in "${!source_files[@]}"; do
  perform_install "${source_files[$i]}" "${destination_files[$i]}"
done

echo "Installed IMSpeed agents and coordinator profile in $codex_root"
