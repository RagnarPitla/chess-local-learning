#!/usr/bin/env bash
#
# Installs or removes the local-ci cron entry.
#
#   ./scripts/local-ci-cron.sh install [schedule]   default: hourly on the hour
#   ./scripts/local-ci-cron.sh remove
#   ./scripts/local-ci-cron.sh status
#
# The repo path contains spaces, so every path is quoted. cron also runs with
# a minimal PATH, so node's directory is recorded at install time and
# prepended by local-ci.sh at run time.

set -uo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNNER="$REPO_DIR/scripts/local-ci.sh"
MARKER="# ramify-local-ci"
ACTION="${1:-status}"
SCHEDULE="${2:-0 * * * *}"

current_crontab() { crontab -l 2>/dev/null || true; }

case "$ACTION" in
  install)
    if ! command -v node >/dev/null 2>&1; then
      echo "node not found on PATH; cannot record its location." >&2
      exit 1
    fi
    mkdir -p "$REPO_DIR/.local-ci"
    dirname "$(command -v node)" > "$REPO_DIR/.local-ci/node-path"
    echo "recorded node dir: $(cat "$REPO_DIR/.local-ci/node-path")"

    chmod +x "$RUNNER"
    # Drop any previous entry before adding, so install is idempotent.
    NEW="$(current_crontab | grep -v -F "$MARKER")"
    LINE="$SCHEDULE cd \"$REPO_DIR\" && \"$RUNNER\" --quick >/dev/null 2>&1 $MARKER"
    printf '%s\n%s\n' "$NEW" "$LINE" | sed '/^$/d' | crontab -
    echo "installed: $LINE"
    echo
    echo "Note: --quick skips the browser gates. cron cannot reliably launch"
    echo "Chrome on a locked or logged-out macOS session, so the browser"
    echo "gates are left for 'npm run ci:local' to run interactively."
    ;;
  remove)
    current_crontab | grep -v -F "$MARKER" | sed '/^$/d' | crontab -
    echo "removed any $MARKER entries"
    ;;
  status)
    echo "cron entries:"
    current_crontab | grep -F "$MARKER" || echo "  (none installed)"
    echo
    if [ -f "$REPO_DIR/.local-ci/last-run.json" ]; then
      echo "last run:"
      cat "$REPO_DIR/.local-ci/last-run.json"
    else
      echo "no run recorded yet"
    fi
    ;;
  *)
    echo "usage: $0 install [cron-schedule] | remove | status" >&2
    exit 2
    ;;
esac
