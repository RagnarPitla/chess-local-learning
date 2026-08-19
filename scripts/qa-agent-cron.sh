#!/usr/bin/env bash
# Manage the local cron entry for the continuous Ramify QA agent.
#
#   ./scripts/qa-agent-cron.sh install [schedule]   default: 17 minutes past every hour
#   ./scripts/qa-agent-cron.sh remove
#   ./scripts/qa-agent-cron.sh status

set -uo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MARKER="# ramify-qa-agent"
ACTION="${1:-status}"
SCHEDULE="${2:-17 * * * *}"
ARTIFACT_DIR="$REPO_DIR/.local-ci/qa-agent"

current_crontab() { crontab -l 2>/dev/null || true; }

case "$ACTION" in
  install)
    if ! command -v npm >/dev/null 2>&1; then
      echo "npm not found on PATH; cannot install cron entry." >&2
      exit 1
    fi
    mkdir -p "$ARTIFACT_DIR"
    NPM_BIN="$(command -v npm)"
    chmod +x "$REPO_DIR/scripts/qa-agent.mjs"
    NEW="$(current_crontab | grep -v -F "$MARKER")"
    LINE="$SCHEDULE cd \"$REPO_DIR\" && PATH=\"$(dirname "$NPM_BIN"):/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin\" \"$NPM_BIN\" run qa:agent -- --cron >/dev/null 2>&1 $MARKER"
    printf '%s\n%s\n' "$NEW" "$LINE" | sed '/^$/d' | crontab -
    echo "installed: $LINE"
    ;;
  remove)
    current_crontab | grep -v -F "$MARKER" | sed '/^$/d' | crontab -
    echo "removed any $MARKER entries"
    ;;
  status)
    echo "cron entries:"
    current_crontab | grep -F "$MARKER" || echo "  (none installed)"
    echo
    if [ -f "$ARTIFACT_DIR/history.json" ]; then
      echo "history: $ARTIFACT_DIR/history.json"
    else
      echo "no QA history recorded yet"
    fi
    if [ -f "$ARTIFACT_DIR/latest.html" ]; then
      echo "latest report: $ARTIFACT_DIR/latest.html"
    fi
    ;;
  *)
    echo "usage: $0 install [cron-schedule] | remove | status" >&2
    exit 2
    ;;
esac
