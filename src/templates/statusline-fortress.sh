#!/usr/bin/env bash
# Fortress System - Claude Code statusline script
# Shows: score (color-coded), deploy readiness, time since last check

set -euo pipefail

REPORT_DIR="./fortress-reports"

# Find latest report
latest=""
if [ -d "$REPORT_DIR" ]; then
  latest=$(ls -t "$REPORT_DIR"/*.json 2>/dev/null | head -1 || true)
fi

if [ -z "$latest" ]; then
  echo "Fortress: no reports yet"
  exit 0
fi

# Parse report - use jq if available, fallback to grep/sed
if command -v jq &>/dev/null; then
  score=$(jq -r '.score // empty' "$latest" 2>/dev/null || echo "")
  deploy_ready=$(jq -r '.deployReady // empty' "$latest" 2>/dev/null || echo "")
else
  score=$(grep -o '"score":[0-9.]*' "$latest" 2>/dev/null | head -1 | cut -d: -f2 || echo "")
  deploy_ready=$(grep -o '"deployReady":[a-z]*' "$latest" 2>/dev/null | head -1 | cut -d: -f2 || echo "")
fi

if [ -z "$score" ]; then
  echo "Fortress: report parse error"
  exit 0
fi

# Time since last check
mod_time=$(stat -f %m "$latest" 2>/dev/null || stat -c %Y "$latest" 2>/dev/null || echo "")
if [ -n "$mod_time" ]; then
  now=$(date +%s)
  diff=$((now - mod_time))
  if [ "$diff" -lt 60 ]; then
    age="${diff}s ago"
  elif [ "$diff" -lt 3600 ]; then
    age="$((diff / 60))m ago"
  else
    age="$((diff / 3600))h ago"
  fi
else
  age="unknown"
fi

# Build output
score_int=${score%.*}
if [ "$deploy_ready" = "true" ]; then
  status="DEPLOY READY"
else
  status="NOT READY"
fi

echo "Fortress: ${score_int}/100 | ${status} | ${age}"
