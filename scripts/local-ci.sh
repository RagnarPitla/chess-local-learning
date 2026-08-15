#!/usr/bin/env bash
#
# Local CI. Runs the same gates the hosted workflow used to run, on this
# machine, so verification does not depend on GitHub Actions.
#
#   ./scripts/local-ci.sh            run every gate once
#   ./scripts/local-ci.sh --quick    skip the browser gates (unit tests only)
#
# Exits non-zero if any gate fails, so cron can treat it as a failure.
# Output is appended to .local-ci/<date>.log and the latest result is
# summarised in .local-ci/last-run.json.

set -uo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR" || exit 1

LOG_DIR="$REPO_DIR/.local-ci"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/$(date +%Y-%m-%d).log"
STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# cron runs with a minimal PATH that usually lacks node. Prefer the path
# recorded at install time, then fall back to whatever is on PATH.
if [ -f "$LOG_DIR/node-path" ]; then
  NODE_BIN_DIR="$(cat "$LOG_DIR/node-path")"
  [ -d "$NODE_BIN_DIR" ] && PATH="$NODE_BIN_DIR:$PATH"
fi
export PATH

QUICK=0
[ "${1:-}" = "--quick" ] && QUICK=1

log() { printf '%s\n' "$*" | tee -a "$LOG_FILE"; }

log ""
log "=================================================================="
log "local-ci  $STARTED_AT  commit $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
log "=================================================================="

if ! command -v node >/dev/null 2>&1; then
  log "FAIL  node not found on PATH. Run 'npm run ci:cron:install' to record it."
  exit 127
fi
log "node $(node --version)"

FAILED=()
RESULTS=()

gate() {
  local name="$1"; shift
  local started
  started=$(date +%s)
  log ""
  log "--- $name ---"
  if "$@" >>"$LOG_FILE" 2>&1; then
    local secs=$(( $(date +%s) - started ))
    log "PASS  $name  (${secs}s)"
    RESULTS+=("{\"gate\":\"$name\",\"status\":\"pass\",\"seconds\":$secs}")
  else
    local secs=$(( $(date +%s) - started ))
    log "FAIL  $name  (${secs}s)  see $LOG_FILE"
    FAILED+=("$name")
    RESULTS+=("{\"gate\":\"$name\",\"status\":\"fail\",\"seconds\":$secs}")
  fi
}

gate "unit tests" npm test
gate "static build" npm run build

if [ "$QUICK" -eq 1 ]; then
  log ""
  log "SKIP  browser gates (--quick)"
else
  # These need a real Chrome, so they are the ones most likely to fail on a
  # headless or locked machine. They run last so a failure here still leaves
  # the cheaper gates' results on record.
  gate "build checks" npm run build:check
  gate "browser e2e" npm run test:e2e
fi

FINISHED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
STATUS="pass"
[ ${#FAILED[@]} -gt 0 ] && STATUS="fail"

# Join with commas without relying on a bash version that has ${arr[*]/ /,}
JOINED=""
for r in "${RESULTS[@]}"; do
  [ -n "$JOINED" ] && JOINED="$JOINED,"
  JOINED="$JOINED$r"
done

cat > "$LOG_DIR/last-run.json" <<JSON
{
  "status": "$STATUS",
  "startedAt": "$STARTED_AT",
  "finishedAt": "$FINISHED_AT",
  "commit": "$(git rev-parse HEAD 2>/dev/null || echo unknown)",
  "branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)",
  "gates": [$JOINED],
  "log": "${LOG_FILE#$REPO_DIR/}"
}
JSON

log ""
if [ "$STATUS" = "pass" ]; then
  log "ALL GATES PASSED  $FINISHED_AT"
  exit 0
fi
log "FAILED GATES: ${FAILED[*]}"
exit 1
