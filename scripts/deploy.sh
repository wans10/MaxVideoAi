#!/usr/bin/env bash
# ==============================================================================
# MaxVideoAI — Self-Hosted Deployment Script
#
# Usage:
#   ./scripts/deploy.sh              # Full rebuild and deploy
#   ./scripts/deploy.sh --no-cache   # Force full rebuild (no Docker cache)
#   ./scripts/deploy.sh --pull-only  # Pull latest code only, no build
#
# Prerequisites:
#   1. Docker and Docker Compose installed
#   2. .env.production filled with all required values
#   3. SSL certificate obtained (see docs/deployment/self-hosted.md)
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
ENV_FILE="${ROOT_DIR}/.env.production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log()   { echo -e "${BLUE}[deploy]${NC} $*"; }
warn()  { echo -e "${YELLOW}[deploy]${NC} $*"; }
error() { echo -e "${RED}[deploy]${NC} $*" >&2; }
ok()    { echo -e "${GREEN}[deploy]${NC} $*"; }

# --- Pre-flight checks ---
log "Pre-flight checks..."

if [ ! -f "$COMPOSE_FILE" ]; then
    error "docker-compose.prod.yml not found at ${COMPOSE_FILE}"
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    error ".env.production not found. Copy .env.production.example and fill in values:"
    error "  cp .env.production.example .env.production"
    exit 1
fi

if ! command -v docker &>/dev/null; then
    error "Docker is not installed."
    exit 1
fi

if ! docker compose version &>/dev/null; then
    error "Docker Compose plugin is not installed."
    exit 1
fi

# Check if SSL cert exists
CERT_PATH="/etc/letsencrypt/live/video.llmhub.net/fullchain.pem"
if [ ! -f "$CERT_PATH" ]; then
    warn "SSL certificate not found at ${CERT_PATH}"
    warn "Run certbot first: sudo certbot certonly --standalone -d video.llmhub.net"
    warn "Continuing anyway (Nginx will fail to start without the cert)..."
fi

# --- Parse arguments ---
NO_CACHE=""
PULL_ONLY=false

for arg in "$@"; do
    case $arg in
        --no-cache)  NO_CACHE="--no-cache" ;;
        --pull-only) PULL_ONLY=true ;;
    esac
done

# --- Pull latest code ---
log "Pulling latest code..."
cd "$ROOT_DIR"

if git rev-parse --is-inside-work-tree &>/dev/null; then
    CURRENT_BRANCH=$(git branch --show-current)
    log "Current branch: ${CURRENT_BRANCH}"
    git pull origin "${CURRENT_BRANCH}"
else
    warn "Not a git repository, skipping git pull"
fi

if [ "$PULL_ONLY" = true ]; then
    ok "Pull complete. Exiting (--pull-only mode)."
    exit 0
fi

# --- Set GIT_SHA for image labeling ---
export GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
log "Building with GIT_SHA=${GIT_SHA}"

# --- Build and deploy ---
log "Building containers..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build $NO_CACHE

log "Starting containers..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

# --- Wait for health check ---
log "Waiting for Next.js to become healthy..."
TIMEOUT=120
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    STATUS=$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null \
        | grep -o '"Health":"[^"]*"' \
        | head -1 \
        | grep -o '"healthy"' || true)
    
    if [ "$STATUS" = '"healthy"' ]; then
        ok "Next.js is healthy!"
        break
    fi
    
    sleep 5
    ELAPSED=$((ELAPSED + 5))
    log "  waiting... (${ELAPSED}s / ${TIMEOUT}s)"
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    warn "Health check did not pass within ${TIMEOUT}s."
    warn "Check logs: docker compose -f ${COMPOSE_FILE} logs nextjs"
fi

# --- Status ---
echo ""
log "Container status:"
docker compose -f "$COMPOSE_FILE" ps
echo ""

# --- Run health check script ---
HEALTHCHECK_SCRIPT="${SCRIPT_DIR}/healthcheck.sh"
if [ -x "$HEALTHCHECK_SCRIPT" ]; then
    log "Running health checks..."
    bash "$HEALTHCHECK_SCRIPT"
else
    warn "healthcheck.sh not found or not executable, skipping."
fi

echo ""
ok "Deployment complete!"
ok "Site: https://video.llmhub.net"
ok "Logs: docker compose -f docker-compose.prod.yml logs -f"
