#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

extract_css() {
  while IFS= read -r f; do
    cat "$f"
  done < <(find src -type f -name '*.css')
  while IFS= read -r f; do
    awk '/<style/{inside=1} inside{print} /<\/style>/{inside=0}' "$f"
  done < <(find src -type f -name '*.svelte')
}

CSS="$(extract_css)"

fail=0

grep_extended() {
  if printf '%s\n' "$CSS" | grep -nE "$1" >/dev/null 2>&1; then
    echo "css-gate: forbidden pattern ($2):"
    printf '%s\n' "$CSS" | grep -nE "$1"
    fail=1
  fi
}

grep_fixed() {
  if printf '%s\n' "$CSS" | grep -nF "$1" >/dev/null 2>&1; then
    echo "css-gate: forbidden literal ($1):"
    printf '%s\n' "$CSS" | grep -nF "$1"
    fail=1
  fi
}

grep_extended '#[0-9a-fA-F]{3,8}' 'hex color'
grep_fixed 'rgb('
grep_fixed 'rgba('
grep_fixed 'hsl('
grep_fixed '!important'
grep_fixed '100vh'
grep_extended '(^|[{;[:space:]])(width|height|margin-(left|right|top|bottom)|padding-(left|right|top|bottom)|left|right|top|bottom)[[:space:]]*:' 'physical property'

if [ "$fail" -eq 0 ]; then
  echo "css-gate: clean"
fi

exit "$fail"
