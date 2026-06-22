#!/bin/sh
# ==============================================================================
# cron-curl.sh — wrapper for cron job HTTP calls
#
# Usage: cron-curl.sh <path> <job-name>
#   path      - API route path (e.g. /api/cron/fal-poll)
#   job-name  - Human-readable job name for logging
#
# Reads CRON_SECRET from environment for Authorization header.
# Reads CRON_HOST from environment (default: http://nextjs:3000).
# ==============================================================================

set -e

PATH_ROUTE="$1"
JOB_NAME="${2:-cron}"
HOST="${CRON_HOST:-http://nextjs:3000}"
URL="${HOST}${PATH_ROUTE}"

# Build auth header if CRON_SECRET is set
AUTH_HEADER=""
if [ -n "$CRON_SECRET" ]; then
    AUTH_HEADER="Authorization: Bearer ${CRON_SECRET}"
fi

# Execute the request
TIMESTAMP=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
echo "[${TIMESTAMP}] [${JOB_NAME}] calling ${URL}"

if [ -n "$AUTH_HEADER" ]; then
    HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' \
        -H "${AUTH_HEADER}" \
        --max-time 120 \
        "${URL}" 2>&1) || true
else
    HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' \
        --max-time 120 \
        "${URL}" 2>&1) || true
fi

TIMESTAMP_END=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

if [ "$HTTP_CODE" = "200" ]; then
    echo "[${TIMESTAMP_END}] [${JOB_NAME}] ✓ completed (HTTP ${HTTP_CODE})"
else
    echo "[${TIMESTAMP_END}] [${JOB_NAME}] ✗ failed (HTTP ${HTTP_CODE})" >&2
fi
