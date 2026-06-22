#!/usr/bin/env bash
# ==============================================================================
# MaxVideoAI — Post-Deploy Health Check Script
#
# Validates that the deployed application is functioning correctly by
# checking all health endpoints.
#
# Usage:
#   ./scripts/healthcheck.sh                        # Check via localhost
#   ./scripts/healthcheck.sh https://video.llmhub.net  # Check via public URL
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.production"

# Load HEALTHCHECK_TOKEN from .env.production if available
if [ -f "$ENV_FILE" ]; then
    HEALTHCHECK_TOKEN=$(grep -E '^HEALTHCHECK_TOKEN=' "$ENV_FILE" | cut -d= -f2- | tr -d "'" | tr -d '"' || true)
fi
HEALTHCHECK_TOKEN="${HEALTHCHECK_TOKEN:-}"

# Base URL (default: check via Docker internal network)
BASE_URL="${1:-https://video.llmhub.net}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

check_endpoint() {
    local name="$1"
    local path="$2"
    local required="${3:-true}"

    local url="${BASE_URL}${path}"
    local auth_args=""
    if [ -n "$HEALTHCHECK_TOKEN" ]; then
        auth_args="-H x-healthcheck-token:${HEALTHCHECK_TOKEN}"
    fi

    HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' \
        --max-time 15 \
        $auth_args \
        "$url" 2>&1) || HTTP_CODE="000"

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "  ${GREEN}✓${NC} ${name} (HTTP ${HTTP_CODE})"
        PASS=$((PASS + 1))
    elif [ "$required" = "true" ]; then
        echo -e "  ${RED}✗${NC} ${name} (HTTP ${HTTP_CODE}) — REQUIRED"
        FAIL=$((FAIL + 1))
    else
        echo -e "  ${YELLOW}△${NC} ${name} (HTTP ${HTTP_CODE}) — optional"
        WARN=$((WARN + 1))
    fi
}

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  MaxVideoAI — Health Check                   ║"
echo "║  Target: ${BASE_URL}"
echo "╚══════════════════════════════════════════════╝"
echo ""

echo "Checking health endpoints..."
check_endpoint "Environment vars" "/api/health/env" "true"
check_endpoint "Database (Neon)"  "/api/health/db"  "true"
check_endpoint "Fal.ai proxy"     "/api/health/fal" "true"
check_endpoint "Stripe keys"      "/api/health/stripe" "false"
check_endpoint "Legal docs"       "/api/health/legal" "false"

echo ""
echo "Checking page load..."
check_endpoint "Homepage"  "/" "true"
check_endpoint "Pricing"   "/pricing" "false"
check_endpoint "Models"    "/models" "false"

echo ""
echo "────────────────────────────────────────────"
echo -e "  ${GREEN}Passed: ${PASS}${NC}  │  ${RED}Failed: ${FAIL}${NC}  │  ${YELLOW}Warnings: ${WARN}${NC}"
echo "────────────────────────────────────────────"

if [ $FAIL -gt 0 ]; then
    echo ""
    echo -e "${RED}Some required checks failed. Review the errors above.${NC}"
    exit 1
else
    echo ""
    echo -e "${GREEN}All required checks passed!${NC}"
    exit 0
fi
